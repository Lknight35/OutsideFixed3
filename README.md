# ShowForge

A streaming platform where the show doesn't exist until you ask for it. You
describe what you want to watch; the system writes it, casts it, films it,
scores it, assembles it, and plays it back.

> **Status: working MVP on mock providers.** The full pipeline runs end to end
> and produces a playable episode with persistent characters and multi-episode
> continuity. Generated media is placeholder content until real provider
> credentials are configured — see [Providers](#providers).

---

## Quick start

Requires Node 20+ and a PostgreSQL database.

```bash
npm install --legacy-peer-deps
cp .env.example .env.local          # then set DATABASE_URL and NEXTAUTH_SECRET
npx prisma migrate deploy
npm run dev                          # http://localhost:3000
```

Sign in with any email and password — demo mode creates the account on first
use. Then: **Create New Show** → describe something (or hit **Surprise Me**) →
**Create My Show**.

### Verify it actually works

```bash
DATABASE_URL=... npx tsx scripts/verify-production.ts
```

Drives a show from a natural-language prompt to a finished, playable episode,
then generates episode 2 and asserts continuity. 26 checks covering shot
completion, canonical character references, cost reconciliation, and Story
Bible rollover.

---

## Deploying to Vercel

The repo is deploy-ready. `vercel.json` runs `prisma migrate deploy` during the
build, so the schema is applied automatically on first deploy.

1. **New Project** in Vercel → import this repository.
2. Under **Settings → Git**, set the production branch to the branch you want
   to deploy. Use a dedicated Vercel project if you already have one pointing
   at this repo — that keeps this deployment fully isolated from it.
3. **Storage → Create Database → Postgres** (Neon). Attaching it sets
   `DATABASE_URL` automatically.
4. Add environment variables:
   | Variable | Value |
   |---|---|
   | `NEXTAUTH_SECRET` | any random 32+ character string (`openssl rand -base64 32`) |
   | `NEXTAUTH_URL` | your deployment URL |
5. Deploy.

**SQLite will not work on Vercel** — the filesystem is read-only and ephemeral.
Postgres is required.

For real production, replace `prisma migrate deploy` in the build with a
dedicated migration step in your release process rather than the build itself.

---

## How a show gets made

Production is an explicit state machine in `lib/services/pipeline.ts`:

```
writing → designing → planning → generating_video → generating_audio → assembling → complete
```

`ProductionPipeline.advance()` performs exactly one bounded unit of work and
persists the result, so:

- a single step always fits inside a serverless function invocation;
- closing the browser pauses progress rather than losing it — all state is in
  the database;
- a failed shot retries individually and never restarts the episode.

Today the client drives `advance()` by polling `POST /api/shows/[id]/advance`.
Swapping in a queue worker (Inngest, QStash, a container) means calling the
same `advance()` loop from the worker — no pipeline changes.

### Continuity

Every show has a **Story Bible** holding premise, world rules, previous events,
unresolved threads and character knowledge. `showRunner.createNextEpisode()`
reads it first, seeds the next episode from it, and rolls it forward. Existing
characters and locations — and their canonical reference assets — are reused
rather than regenerated, so the universe never resets.

---

## Providers

Nothing in the application talks to a vendor SDK directly. Everything goes
through the interfaces in `lib/providers/types.ts`, resolved by environment
variable in `lib/providers/index.ts`.

| Variable | Default | Options |
|---|---|---|
| `LLM_PROVIDER` | `mock` | `claude`, `openai`, `gemini` |
| `IMAGE_PROVIDER` | `mock` | `google`, `openai` |
| `VIDEO_PROVIDER` | `mock` | `google`, `runway`, `luma` |
| `VOICE_PROVIDER` | `mock` | `elevenlabs` |
| `SOUND_PROVIDER` | `mock` | `elevenlabs` |
| `MUSIC_PROVIDER` | `mock` | `runway` |

**Mock providers are complete and are what runs today.** They simulate latency
(`MOCK_SPEED` scales it), return structured output derived from the user's
actual prompt, and serve clearly-labelled placeholder media from
`public/media/` so it's obvious where real AI assets will appear.

**The non-mock branches in the factory are not yet implemented** — they
currently fall back to the mock. Implementing one means writing a class against
the existing interface and returning it from the factory; nothing else in the
codebase changes.

### Adding a real provider

1. Implement the interface (e.g. `VideoProvider`) in `lib/providers/<name>.ts`.
2. Return it from the matching branch in `lib/providers/index.ts`.
3. Set the env var and its API key.

---

## Cost and limits

Every provider operation writes a `UsageRecord` and a `ProductionCost` row with
estimated cost, reconciled against actual cost when the provider reports one.
Credits are a ledger (`grant` / `reserve` / `consume` / `refund`), not a mutable
balance column.

Configurable safeguards, enforced before expensive work:

```
MAX_EPISODE_SECONDS   MAX_SHOTS              MAX_SHOT_RETRIES
MAX_PRODUCTION_COST   MAX_USER_DAILY_COST    MAX_CONCURRENT_PRODUCTIONS
```

`GET /api/admin/stats` reports totals, job status breakdown, spend and recent
errors.

---

## Project structure

```
app/
  api/
    auth/[...nextauth]/    NextAuth
    shows/create           create a show from a prompt
    shows/[id]             read show + progress (ownership enforced)
    shows/[id]/advance     run one production step
    shows/[id]/episodes    generate the next episode from the Story Bible
    episodes/[id]/subtitles WebVTT, timed from scene/shot structure
    admin/stats            operational and cost metrics
  page.tsx                 session resolved server-side: landing or library
  create/                  show creation
  show/[id]/               production progress, then the player
components/                UI
lib/
  providers/               provider interfaces, mocks, factory
  services/showrunner.ts   story generation, episode continuation
  services/pipeline.ts     production state machine
  utils/cost.ts            credits, usage, cost reconciliation
  utils/validation.ts      Zod schemas, moderation, limit enforcement
prisma/                    schema + migrations
scripts/verify-production.ts  end-to-end verification
```

---

## Commands

```bash
npm run dev          # development server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npx prisma migrate deploy   # apply migrations
npx prisma studio           # browse the database
```

---

## Known limitations

- **Real providers are stubs.** Adapters are not implemented; every provider
  branch falls back to the mock. Generated media is placeholder content.
- **No FFmpeg assembly.** `stageAssembly` records structure, runtime and
  subtitle timing, and serves the first shot as the episode video. Concatenating
  and mixing shots into a single rendered MP4 is not implemented.
- **No background worker.** Production advances while a browser tab is open.
  State survives disconnection, but progress pauses. A queue should drive
  `advance()` for true unattended generation.
- **No object storage.** Media paths are local; S3 is not wired up.
- **Stripe is schema-only.** No checkout or webhooks.
- **Admin is an API endpoint**, not a UI.
- **Moderation is a keyword filter**, adequate as a pipeline stage but not as a
  real safety system.
- **Automated test suite is the verification script**, not unit tests.

## Next priorities

1. Implement one real video provider end to end (highest-signal next step).
2. FFmpeg assembly: concatenate shots, mix dialogue/ambience/score, normalise
   audio, burn in the real runtime.
3. Move `advance()` onto a queue so generation runs unattended.
4. Object storage for generated media.
5. Pass canonical character references into video generation for identity
   consistency across shots.
