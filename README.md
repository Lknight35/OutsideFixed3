# ShowForge - AI Entertainment Platform MVP

A futuristic streaming platform where users describe what they want to watch and AI generates complete shows and movies.

## What is ShowForge?

ShowForge is the beginning of a next-generation entertainment platform. Instead of browsing a catalog, users describe exactly what they want to watch:

**"Make me a gritty 1990s crime drama about two detectives investigating organized crime in Miami. Serious tone, realistic dialogue, cinematic photography, unexpected ending."**

The system then:
- Generates a complete story and screenplay
- Creates characters with persistent identities  
- Designs locations with visual consistency
- Generates individual video shots
- Records dialogue and sound
- Assembles everything into a playable episode
- Allows users to continue the series with Episode 2

## Architecture Overview

### Core Technologies
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (development), PostgreSQL (production)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **AI Providers**: Abstracted provider interfaces (mocks available)

### Key Features
- **Provider Abstraction**: All AI integrations go through abstraction layers
- **Mock Providers**: Full mock implementations for development without API costs
- **Cost Tracking**: Every operation tracked for economics
- **Production Pipeline**: Multi-stage generation with progress tracking
- **Continuity Engine**: Characters and worlds persist across episodes
- **Story Bible**: Persistent narrative context for multi-episode content

## Local Development Setup

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repo>
cd OutsideFixed3
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
export DATABASE_URL="file:./prisma/dev.db"
npx prisma db push
```

4. Start the development server:
```bash
npm run dev
```

5. Open http://localhost:3000 in your browser

### Configuration

Copy `.env.example` to `.env.local` and customize:

```bash
cp .env.example .env.local
```

Key variables:
- `DATABASE_URL`: Database connection string
- `NEXTAUTH_SECRET`: Random string for session encryption
- `LLM_PROVIDER`: "mock" (default) or "claude"
- `VIDEO_PROVIDER`: "mock" (default) or "google", "runway", "luma"
- `DEMO_MODE`: "true" to use mocks even with credentials

## Your First Show

### 1. Sign In
- Use any email/password combination (demo mode creates accounts automatically)
- Example: `demo@example.com` / `password123`

### 2. Create a Show
- Click "Create New Show"
- Describe what you want: "A sci-fi action series about a hacker fighting an AI overlord"
- Optionally set advanced options (format, tone, setting, etc.)
- Click "Create My Show"

### 3. Watch the Production
- The system shows real-time progress through production stages
- Stages include: story, characters, locations, filming, assembly, etc.
- Progress updates every 3 seconds

### 4. Watch Your Show
- Once complete, watch your generated episode
- If using mock providers, you'll see placeholder content
- With real providers, you'll see AI-generated video

### 5. Generate Episode 2
- Click "Generate Next Episode"
- The AI remembers all previous story context
- Characters and world maintain continuity

## Provider Integration

### Current Providers

**LLM Providers** (for story/dialogue):
- `mock`: Development/testing
- `claude`: Claude API (add YOUR API key)
- `openai`: OpenAI API
- `gemini`: Google Gemini API

**Image Providers** (for character/location references):
- `mock`: Development/testing
- `google`: Google Imagen
- `openai`: DALL-E

**Video Providers** (for shot generation):
- `mock`: Development/testing (5-second placeholder videos)
- `google`: Google Veo
- `runway`: Runway Gen-3
- `luma`: Luma Dream Machine

**Voice Providers**:
- `mock`: Development/testing
- `elevenlabs`: ElevenLabs API

### Switching to Real Providers

1. Get API credentials from your chosen provider
2. Set environment variables:
```bash
ANTHROPIC_API_KEY="sk-ant-..."
LLM_PROVIDER="claude"
VIDEO_PROVIDER="google"
GOOGLE_API_KEY="AIza..."
```

3. Restart development server
4. Create a show - it will now use real generation

### Adding a New Provider

1. Implement the interface in `lib/providers/types.ts`
2. Create `lib/providers/realProviderName.ts`
3. Update the provider factory in `lib/providers/index.ts`
4. Add environment variable support
5. Test with mock mode first

## Database Models

Key entities:
- **User**: Account information
- **Show**: Television series or movie project
- **Episode**: Individual episode within a show
- **StoryBible**: Persistent narrative context
- **Character**: Cast members with identity and continuity
- **Location**: Unique settings/environments
- **Scene**: Sequence of shots within an episode
- **Shot**: Individual video clip to be generated
- **GenerationJob**: Asynchronous work queue item
- **ProductionCost**: Economic tracking

## Cost Tracking

The system tracks:
- Estimated cost before generation (reserve credits)
- Actual cost after generation (consume credits)
- Cost per component (story, video, audio, etc.)
- Cost per user, per show, per provider
- Refunds for failed generations

Base estimates:
- Story generation: $2.00
- Character assets: $3.00 each
- Video shot generation: $5.00 each
- Audio/music: $0.50-$2.00 per shot
- Assembly & QC: $1.50 total

## Project Structure

```
/app                    # Next.js app directory
  /api                  # API routes
    /auth               # Authentication
    /shows              # Show CRUD operations
    /admin              # Admin dashboard
/components             # React components
  /landing.tsx          # Sign in / landing page
  /home.tsx             # Shows library
  /create-form.tsx      # Story creation form
  /production-status.tsx # Real-time progress
  /show-viewer.tsx      # Video player
/lib                    # Utilities and business logic
  /providers            # AI provider abstraction
    /types.ts           # Provider interfaces
    /mock.ts            # Mock implementations
    /index.ts           # Provider factory
  /services             # Core services
    /showrunner.ts      # Story generation orchestration
  /utils                # Helpers
    /cost.ts            # Cost tracking
    /validation.ts      # Input validation
/prisma                 # Database schema
  /schema.prisma        # Prisma schema
  /dev.db               # SQLite database (local)
/styles                 # Global styles
  /globals.css          # Tailwind configuration
```

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Lint code
npm run lint

# Database commands
export DATABASE_URL="file:./prisma/dev.db"
npx prisma db push              # Apply schema changes
npx prisma studio              # Open database UI

# Clean database (WARNING: deletes data)
rm prisma/dev.db
npx prisma db push
```

## Testing

### Test the Full Flow
1. Start the server: `npm run dev`
2. Sign in: Use any email/password
3. Create a show with mock providers
4. Watch the production progress
5. View the completed episode
6. Generate Episode 2

### Test Real Providers
1. Add API keys to `.env.local`
2. Set provider env vars
3. Create a show
4. Monitor `/api/admin/stats` for generation job status

## Debugging

### Enable Detailed Logging
```bash
DEBUG=showforge:* npm run dev
```

### Database Inspection
```bash
export DATABASE_URL="file:./prisma/dev.db"
npx prisma studio  # Open GUI database viewer
```

### Check Generation Jobs
```bash
curl http://localhost:3000/api/admin/stats
```

## Production Deployment

### Database
- Use PostgreSQL (production database)
- Update `DATABASE_URL` to production connection string
- Run migrations: `npx prisma migrate deploy`

### Environment
- Set `NEXTAUTH_SECRET` to random 32+ char string
- Configure real provider API keys
- Set `DEMO_MODE="false"` to use real providers

### Deployment to Vercel/Railway
```bash
git push origin main
```
The build command is: `npm run build`

## Known Limitations

### Current MVP Scope
- Targets 1-5 minute episodes (architecture scales to longer)
- Mock providers return placeholder content
- No user-uploaded assets yet
- Basic subtitle generation
- Single video provider output format

### Future Enhancements
- 30-60 minute episodes and feature films
- 4K video support
- Interactive/branching narratives
- User-created character libraries
- Remix and remixing
- Collaborative universe building
- Creator marketplace
- Mobile native applications

## Architecture Decisions

### Why Provider Abstraction?
AI technology changes rapidly. By abstracting providers, we can:
- Switch models without rewriting logic
- A/B test different providers
- Use multiple providers simultaneously
- Fall back gracefully
- Track costs per provider
- Route different shots to different models

### Why SQLite for Development?
- Zero configuration
- No external services
- Quick iteration
- Full schema parity with PostgreSQL
- Easy to reset

### Why Prisma?
- Type-safe database access
- Simple schema management
- Migration support
- Relations and references
- Works with SQLite and PostgreSQL

### Why NextAuth.js?
- Production-ready authentication
- Session management built-in
- Credential provider for demo mode
- Easy to add OAuth later
- Extensible

## Support

For issues or questions:
1. Check the architecture documentation
2. Review provider integration guides
3. Inspect database with Prisma Studio
4. Check generation job status in admin stats
5. Review error logs in `/api/admin/stats`

## License

Proprietary - ShowForge Entertainment Platform
