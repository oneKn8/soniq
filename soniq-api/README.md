# Soniq API

Production backend for the Soniq platform.

## Development

```bash
cp .env.example .env
npm install
npm run dev
```

## Build

```bash
npm run build
npm run start
```

## Configuration

- Copy `.env.example` to `.env` and fill in required provider keys.
- Set `VOICE_PROVIDER` to `vapi` or `custom` depending on your stack.
- The API expects Node.js >= 20.

## Migrations

- SQL migrations live in `migrations/`.
