# Outside source audit and implementation map

Audit baseline: `4da4126566dd787202fae7d111c05b8baabac7a0` (2026-11-12).

The available Claude implementation is `src/App.tsx` (2,361 lines), with React 18, Vite 5, TypeScript 5.7, Lucide icons, and inline CSS. There is no `Outside 4.tsx`, native project, backend, database, authentication service, or CI test suite in this checkout. The original application remains runnable at the repository root. A verified Git bundle and source archive are retained outside the checkout in `/workspace/outside-baseline`.

## Reuse and migration decisions

| Subsystem                      | Existing behavior                                                                            | Decision                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Visual language and navigation | Dark mobile layout, categories, feed, viewer, saves, place screens                           | Reuse concepts and useful labels/helpers; implement native components using the approved purple design direction.                   |
| Data and feed                  | Hardcoded places and video records with timestamps relative to startup                       | Replace with persistent server records and genuine place-provider results. Never migrate sample content into production data.       |
| Camera                         | Browser MediaRecorder; simulated clips when unavailable; location/category controls disabled | Replace with native rear-camera recording, fresh location evidence, server-issued capture tickets, validated upload and processing. |
| Recording UI                   | Absolute `.fcard-shade` blocks the Post clip button; metadata effect disabled                | Preserve as baseline debt; do not carry the broken layout into native code.                                                         |
| Search                         | Local substring matching and public geocoding; rule-based premium suggestions                | Retain categories and ordinary filters; use real geographic search. Do not describe keyword matching as evidence-backed AI.         |
| Accounts and privacy           | No real identities or access controls                                                        | New authenticated API, session storage, mutual friendships, ownership checks and privacy enforcement.                               |
| Maps                           | External navigation links only                                                               | Implement geographic browsing from authorized real places, with no continuous tracking.                                             |
| Invitations and chats          | Not implemented                                                                              | Private invitations, individual responses and accepted one-to-one invitation threads. No group chat or general inbox.               |
| Premium                        | Client state and simulated approvals                                                         | Server-owned moderation and contribution entitlements; no subscription or client self-approval.                                     |
| Storage and delivery           | In-memory React state and blob URLs                                                          | SQLite metadata and validated disk media in the local build; production hosting/object storage remain a deployment concern.         |
| Testing                        | Vite build succeeds; separate app typecheck has 33 existing diagnostics                      | New native typecheck and meaningful backend authorization/business tests. Preserve the original build independently.                |

## Shared architecture and ownership

The native app lives in `mobile/` and the backend in `server/`. Both use the contract in `docs/api.md`; neither replaces the other with an incompatible implementation. Expo/React Native provides shared iOS/Android source and actual native camera, location, secure storage, and video modules. A single Node/SQLite service keeps local operations understandable and avoids paid infrastructure or unnecessary services. See `architecture.md` for the security and deployment boundaries.

- **Astra:** API contracts, data model, authentication, authorization, capture/upload processing, privacy, moderation, earned entitlements and backend tests.
- **Sol:** native screen composition, design tokens, accessibility, navigation, social/discovery flows and device-module UX against the shared API.
- **Integration:** preserve the baseline, install toolchains, validate the combined system, build Android artifacts and document actual verification limits.

## Product implementation map

| User journey                   | Native surface                                    | Required server capability                                                           |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Discover and save a real place | Home, Search, Place, Saved                        | Real place search; authorized recent videos; place/video/search saves                |
| Capture an update              | Rear camera, permission states, progress/retry    | Capture tickets, fresh location evidence, validated video, processing and moderation |
| Connect with friends           | Friends, simple Friend Profile                    | Mutual requests, authorized recent activity and maps                                 |
| Go somewhere together          | Invitations, destination details, individual chat | Private recipient responses and expiring one-to-one messages                         |
| Explore the next destination   | Discover Around, maps                             | Accurate nearby places; private shared-place messages                                |
| Remember visits                | Profile, Your Map, Friend Map                     | Ownership/friendship/hidden-location checks on every response                        |
| Stay informed                  | Notification inbox and settings                   | Granular preferences; invitation/friend notifications                                |
| Earn advanced access           | Contribution progress                             | Three distinct approved quality contributions unlock 30 days server-side             |

Reference-image group chat, public popularity counts, photo/gallery uploads, and paid subscription controls conflict with the written specification and are excluded. Empty states remain empty when there is no genuine activity. Production hosting, push delivery credentials, signing and device attestation must not be represented as complete merely because local code exists.
