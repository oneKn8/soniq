<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/brand/soniq-readme-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./docs/brand/soniq-readme-light.svg">
    <img src="./docs/brand/soniq-readme-light.svg" alt="Animated Soniq logo" width="760">
  </picture>
</p>

<p align="center">
  AI-powered voice agents for business phone handling. Soniq answers inbound calls, books appointments, takes orders, handles FAQs, and routes complex calls to staff -- 24/7 with sub-500ms response times.
</p>

## Architecture

```
                    Inbound Call
                        |
                        v
                  +-----------+
                  | SignalWire |  Telephony / SIP
                  +-----+-----+
                        |
                        v
                  +-----------+
                  | Deepgram  |  Speech-to-Text (streaming)
                  | Nova-2    |  ~150ms latency
                  +-----+-----+
                        |
                        v
                  +-----------+
                  | LLM       |  Multi-provider: Gemini / OpenAI / Groq
                  | + Tools   |  ~200ms TTFT, tool calling
                  +-----+-----+
                        |
                        v
                  +-----------+
                  | Cartesia  |  Text-to-Speech (streaming)
                  | Sonic     |  ~40ms to first audio
                  +-----+-----+
                        |
                        v
                   AI Response
```

**End-to-end voice latency: ~450ms**

## Components

| Service | Stack | Description |
|---------|-------|-------------|
| `soniq-api` | Hono + TypeScript + Node.js | REST API, WebSocket voice pipeline, business logic |
| `soniq-dashboard` | Next.js 15 + React 19 + Tailwind | Tenant dashboard with live call monitoring |
| `soniq-agent` | Python + LiveKit Agents | Voice agent worker for LiveKit-based pipeline |

### Tech Stack

- **Telephony**: SignalWire (SIP trunking, WebSocket streaming)
- **STT**: Deepgram Nova-2 (streaming, phone-optimized)
- **LLM**: Multi-provider fallback (Gemini -> OpenAI -> Groq) with tool calling
- **TTS**: Cartesia Sonic (streaming synthesis)
- **Database**: Supabase (PostgreSQL) with multi-tenant isolation
- **Voice Agent**: LiveKit Agents SDK (Python)
- **Frontend**: Next.js 15 App Router, shadcn/ui, Radix

## Features

- **Appointment booking** with calendar integrations (Google, Outlook, Calendly)
- **Order taking** with verification and upselling
- **FAQ handling** from tenant-configured knowledge base
- **Smart call routing** with full conversation context passed to staff
- **Voicemail** with transcription and email notifications
- **SMS confirmations** via Twilio
- **Sentiment detection** for priority escalation
- **27 industry presets** (hospitality, healthcare, automotive, professional services, personal care, property)
- **Multi-tenant** architecture with per-tenant config, prompts, and phone numbers
- **CRM features** built in: contacts, deals pipeline, task management
- **Post-call automation**: review requests, follow-ups, engagement scoring

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.12+ (for voice agent)
- Supabase project
- API keys: Deepgram, Cartesia, SignalWire, and at least one LLM provider (Gemini/OpenAI/Groq)

### Setup

```bash
git clone https://github.com/oneKn8/soniq.git
cd soniq

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start API
cd soniq-api
npm install
npm run dev          # http://localhost:3100

# Start Dashboard (new terminal)
cd soniq-dashboard
npm install
npm run dev          # http://localhost:3000
```

Or use the dev script:

```bash
./dev.sh             # Starts both API + Dashboard
./dev.sh --api       # API only
./dev.sh --fe        # Dashboard only
```

### Docker

```bash
cp .env.example .env
# Edit .env with your API keys
docker compose up
```

### Environment Variables

See [`.env.example`](.env.example) for the full list. Key groups:

- **Database**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **LLM**: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY` (multi-provider fallback)
- **Voice**: `DEEPGRAM_API_KEY`, `CARTESIA_API_KEY`
- **Telephony**: `SIGNALWIRE_PROJECT_ID`, `SIGNALWIRE_API_TOKEN`, `SIGNALWIRE_SPACE_URL`
- **LiveKit**: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`

## Project Structure

```
soniq/
├── soniq-api/              # Backend
│   ├── src/
│   │   ├── index.ts        # Hono app entry
│   │   ├── routes/         # REST endpoints (calls, tenants, bookings, etc.)
│   │   ├── services/       # Voice pipeline, LLM providers, calendar, CRM
│   │   ├── middleware/     # Auth, rate limiting
│   │   ├── jobs/           # Scheduled tasks (reminders, callbacks, reviews)
│   │   └── config/         # Industry prompts, voice pipeline config
│   └── Dockerfile
├── soniq-dashboard/        # Frontend
│   ├── app/                # Next.js App Router
│   │   ├── (auth)/         # Login, signup, password reset
│   │   └── (dashboard)/    # Dashboard, calls, contacts, deals, settings
│   ├── components/         # UI components
│   ├── lib/                # API client, utilities
│   └── Dockerfile
├── soniq-agent/            # LiveKit voice agent
│   ├── agent.py            # Main agent worker
│   ├── tools.py            # Agent tool definitions
│   └── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── dev.sh                  # Dev startup script
└── .env.example
```

## License

[Apache License 2.0](LICENSE)
