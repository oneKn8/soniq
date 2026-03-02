<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/brand/soniq-readme-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./docs/brand/soniq-readme-light.svg">
    <img src="./docs/brand/soniq-readme-light.svg" alt="Soniq" width="760">
  </picture>
</p>

<p align="center">
  <strong>AI voice agents that answer your business phones.</strong><br>
  Book appointments. Take orders. Handle FAQs. Route calls. 24/7.
</p>

<p align="center">
  <a href="#quick-start"><img src="https://img.shields.io/badge/Quick_Start-000?style=for-the-badge&logo=rocket&logoColor=22D3EE" alt="Quick Start"></a>&nbsp;
  <a href="#architecture"><img src="https://img.shields.io/badge/Architecture-000?style=for-the-badge&logo=blueprint&logoColor=22D3EE" alt="Architecture"></a>&nbsp;
  <a href="#features"><img src="https://img.shields.io/badge/Features-000?style=for-the-badge&logo=sparkles&logoColor=22D3EE" alt="Features"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Next.js_15-000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/Hono-E36002?style=flat-square&logo=hono&logoColor=white" alt="Hono">
  <img src="https://img.shields.io/badge/LiveKit-FF2D55?style=flat-square&logo=livekit&logoColor=white" alt="LiveKit">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/github/license/oneKn8/soniq?style=flat-square&color=22D3EE" alt="License">
</p>

<br>

<div align="center">
<table>
<tr>
<td align="center"><strong>~450ms</strong><br><sub>voice-to-voice</sub></td>
<td align="center"><strong>27</strong><br><sub>industry presets</sub></td>
<td align="center"><strong>3</strong><br><sub>LLM providers</sub></td>
<td align="center"><strong>Multi-tenant</strong><br><sub>architecture</sub></td>
</tr>
</table>
</div>

<br>

## Architecture

```
    Phone Call
        |
        v
  +-----------+
  | SignalWire |  SIP trunking / WebSocket streaming
  +-----+-----+
        |
        v
  +-----------+
  | Deepgram  |  Speech-to-Text .............. ~150ms
  +-----+-----+
        |
        v
  +-----------+
  | LLM       |  Gemini / OpenAI / Groq ...... ~200ms TTFT
  | + Tools   |  booking, FAQ, routing, CRM
  +-----+-----+
        |
        v
  +-----------+
  | Cartesia  |  Text-to-Speech .............. ~40ms
  +-----+-----+
        |
        v
   AI Response   ........................ ~450ms total
```

Three services, one `docker compose up`:

| Service | Stack | What it does |
|:--------|:------|:-------------|
| **soniq-api** | Hono + TypeScript + Node 20 | REST API, voice pipeline, business logic, scheduled jobs |
| **soniq-dashboard** | Next.js 15 + React 19 + Tailwind | Tenant dashboard, live call monitoring, CRM, setup wizard |
| **soniq-agent** | Python + LiveKit Agents SDK | Voice agent worker with tool calling |

<br>

## Features

**Call Handling** -- Appointment booking with calendar sync (Google, Outlook, Calendly) / order taking with verification / FAQ from tenant knowledge base / smart routing with full conversation context / voicemail with transcription

**Automation** -- SMS confirmations via Twilio / post-call review requests / follow-up scheduling / engagement scoring / callback queue

**CRM** -- Contacts with call history / deals pipeline / task management / sentiment detection for priority escalation

**Multi-tenant** -- Per-tenant config, prompts, phone numbers, and industry presets / tenant isolation at database level / white-label ready

<details>
<summary><strong>27 industry presets</strong></summary>
<br>

| Category | Industries |
|:---------|:-----------|
| Hospitality | Hotels, Restaurants, Cafes, Vacation Rentals, Event Venues |
| Healthcare | Medical Clinics, Dental, Chiropractic, Veterinary, Physical Therapy |
| Automotive | Dealerships, Auto Service, Car Rentals, Body Shops, Tire Centers |
| Professional | Law Firms, Accounting, Real Estate, Consulting, Financial |
| Personal Care | Hair Salons, Spas, Nail Studios, Gyms, Yoga Studios |
| Property | Contractors, Plumbing, HVAC, Cleaning, Landscaping |

Each preset includes custom terminology, intents, appointment types, escalation triggers, and voice prompts.
</details>

<details>
<summary><strong>Tech stack details</strong></summary>
<br>

| Layer | Technology | Role |
|:------|:-----------|:-----|
| Telephony | SignalWire | SIP trunking, WebSocket audio streaming |
| STT | Deepgram Nova-2 | Streaming speech-to-text, phone-optimized |
| LLM | Gemini / OpenAI / Groq | Multi-provider fallback with tool calling |
| TTS | Cartesia Sonic | Streaming text-to-speech synthesis |
| Voice Agent | LiveKit Agents SDK | Python agent worker with Silero VAD |
| Database | Supabase (PostgreSQL) | Multi-tenant data, auth, real-time |
| Frontend | Next.js 15, shadcn/ui, Radix | App Router, SSR, responsive dashboard |
| Backend | Hono.js, TypeScript | Lightweight, fast, middleware-based API |
</details>

<br>

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.12+ (for voice agent)
- [Supabase](https://supabase.com) project
- API keys for: [Deepgram](https://deepgram.com), [Cartesia](https://cartesia.ai), [SignalWire](https://signalwire.com), and at least one LLM provider

### Setup

```bash
git clone https://github.com/oneKn8/soniq.git
cd soniq
cp .env.example .env
# Edit .env with your API keys
```

**Option A -- Dev script** (recommended)

```bash
./dev.sh             # starts API + dashboard
./dev.sh --api       # API only
./dev.sh --fe        # dashboard only
```

**Option B -- Manual**

```bash
# terminal 1
cd soniq-api && npm install && npm run dev      # localhost:3100

# terminal 2
cd soniq-dashboard && npm install && npm run dev # localhost:3000
```

**Option C -- Docker**

```bash
docker compose up
```

### Environment Variables

See [`.env.example`](.env.example) for the full list. Key groups:

| Group | Variables |
|:------|:----------|
| Database | `SUPABASE_URL` `SUPABASE_ANON_KEY` `SUPABASE_SERVICE_ROLE_KEY` |
| LLM | `GEMINI_API_KEY` `OPENAI_API_KEY` `GROQ_API_KEY` |
| Voice | `DEEPGRAM_API_KEY` `CARTESIA_API_KEY` |
| Telephony | `SIGNALWIRE_PROJECT_ID` `SIGNALWIRE_API_TOKEN` `SIGNALWIRE_SPACE_URL` |
| LiveKit | `LIVEKIT_API_KEY` `LIVEKIT_API_SECRET` |

<br>

## Project Structure

```
soniq/
├── soniq-api/                  # Backend
│   ├── src/
│   │   ├── index.ts            # Hono entry point
│   │   ├── routes/             # REST endpoints
│   │   ├── services/           # Voice pipeline, LLM, calendar, CRM
│   │   ├── middleware/         # Auth, rate limiting
│   │   ├── jobs/               # Scheduled automation
│   │   └── config/             # Industry prompts, pipeline config
│   ├── migrations/             # SQL migrations
│   └── Dockerfile
│
├── soniq-dashboard/            # Frontend
│   ├── app/
│   │   ├── (auth)/             # Login, signup, password reset
│   │   └── (dashboard)/        # All dashboard pages
│   ├── components/             # UI components
│   ├── lib/                    # API client, utilities, presets
│   └── Dockerfile
│
├── soniq-agent/                # Voice Agent
│   ├── agent.py                # LiveKit agent worker
│   ├── tools.py                # Booking, FAQ, routing tools
│   └── Dockerfile
│
├── docker-compose.yml
├── nginx.conf
├── dev.sh
└── .env.example
```

<br>

## License

[Apache License 2.0](LICENSE)

<br>

---

<p align="center">
  <sub>Built with <a href="https://hono.dev">Hono</a>, <a href="https://nextjs.org">Next.js</a>, <a href="https://livekit.io">LiveKit</a>, <a href="https://deepgram.com">Deepgram</a>, <a href="https://cartesia.ai">Cartesia</a>, and <a href="https://supabase.com">Supabase</a></sub>
</p>
