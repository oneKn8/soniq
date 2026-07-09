# Soniq self-host runbook (Hetzner + Coolify)

Deploy Soniq entirely on your own box with **zero cloud dependency**. This is a
runbook, not an executed deploy: the app code (this branch) is production-ready,
but standing up the database + auth tier and running migrations is a deliberate
**DB pass** to do together (it touches the database, which this branch does not).

## Target environment (discovered)

The Hetzner host already runs, via **Coolify** (self-hosted PaaS):

- **Coolify** + its Traefik proxy (`coolify-proxy`) — gives git-deploys, automatic
  TLS, env/secret management, and reverse-proxy routing.
- **LiveKit stack** (`livekit`, `sip`, `redis`) + the **Soniq voice agent** already
  deployed (`livekit-agent`).
- **GlitchTip** (Sentry-compatible error tracking) — reuse it for observability.

Constraint: **2 vCPU / ~8 GB RAM, ~4 GB already used, and no swap.** So we run a
**lean** auth stack (GoTrue only, not the full Supabase stack) and set container
memory limits. Do not add the full Supabase self-host stack on this box without a
RAM upgrade.

## 0. Prep the host

```bash
sudo bash deploy/setup-swap.sh 4     # add 4 GB swap (box has none)
```

The app `docker-compose.yml` and `deploy/auth-postgres.compose.yml` already set
`deploy.resources.limits.memory` so no one service can OOM the box.

## 1. Deploy the app services via Coolify (idiomatic path)

Deploy each service as a Coolify application from this git repo:

| Service | Build context | Port | Notes |
|:--|:--|:--|:--|
| `soniq-api` | `soniq-api/` (Dockerfile) | 3100 | health: `/health` |
| `soniq-dashboard` | `soniq-dashboard/` (Dockerfile) | 3000 | set `NEXT_PUBLIC_*` build args |
| `soniq-agent` | already deployed as `livekit-agent` | — | LiveKit worker |

Let Coolify's Traefik terminate TLS and route the domains (`app.soniq.ai`,
`api.soniq.ai`, `auth.soniq.ai`). Set env from `soniq-api/.env.example`,
`soniq-dashboard/.env.example`, and `deploy/.env.selfhost.example`. Required at
boot (the API fails fast otherwise): `DATABASE_URL`, `ENCRYPTION_KEY`, and in
production `FRONTEND_URL`, `BACKEND_URL`, and a SignalWire signing secret.

Note: one or two existing Coolify apps on the box use hashed names
(`hc44wc84...`, `scog8ocs...`) — confirm whether either is an old Soniq
api/dashboard deploy and remove/replace it to avoid duplicates.

## 2. Auth + database tier (the deferred DB pass)

`deploy/auth-postgres.compose.yml` is the template. Standing it up (do this
together — it touches the DB):

1. Fill `deploy/.env.selfhost` from the example. Generate `GOTRUE_JWT_SECRET`,
   then mint `SUPABASE_ANON_KEY` (`role=anon`) and `SUPABASE_SERVICE_ROLE_KEY`
   (`role=service_role`) as JWTs **signed with that same secret** — the
   `@supabase/supabase-js` client validates against it.
2. Deploy the compose (prefer a Coolify docker-compose resource so Traefik/TLS/
   backups are managed). Route `${SUPABASE_URL}/auth/v1/*` → the `auth` service.
3. Point the API + dashboard at the self-hosted values: `SUPABASE_URL=https://auth.soniq.ai`,
   `DATABASE_URL=` the dedicated Postgres, and the two JWT keys above.
4. Realtime: none needed — the dashboard already polls (e.g. calls every 10 s).

## 3. Run the schema migrations (DB pass)

The app runs against the **current schema as-is** today. The following are the
intended breaking migrations, deferred out of this branch. Author them as
numbered SQL migrations during the DB pass, then apply:

- [ ] Create the dedicated Soniq database and run existing `soniq-api/migrations/*`.
- [ ] Drop `tenants.industry` (code no longer reads it; universal agent).
- [ ] Rename `calls.vapi_call_id` → `provider_call_id`,
      `tenants.vapi_phone_number_id` → `provider_phone_id`, and update the app's
      SQL/accessors accordingly (kept verbatim in this branch to avoid a migration).
- [ ] **Real tenant isolation:** create the `app_api` Postgres role + RLS policies
      keyed on `app.tenant_id`, and route tenant-scoped queries through the
      `tenantQuery()` wrapper (`pool.ts`). Today isolation is app-level `WHERE
      tenant_id` only — the RLS role referenced by `tenantQuery` does not exist yet.

## 4. Observability

Point the app at the GlitchTip already on the box:

- API: set `SENTRY_DSN` (or `GLITCHTIP_DSN`) to the GlitchTip project DSN. Error
  reporting is a no-op until then; pino logs to stdout (captured by Coolify).
- Dashboard: set `NEXT_PUBLIC_SENTRY_DSN`.

## 5. Secret hygiene (your action)

- **Rotate the LiveKit API key/secret** that was previously committed
  (`soniq-agent/livekit/*.yaml`). This branch removed them from the working tree
  and gitignored them, but the old value remains in git history until scrubbed.
- Consider a git-history scrub (`git filter-repo`) + force-push once rotated.
- `gitleaks` now runs in CI to catch any future committed secret.

## Post-launch checklist

- [ ] Swap added, container memory limits verified (`docker stats`).
- [ ] LiveKit key rotated; SIP/inbound trunk pointed at the running SIP bridge.
- [ ] `SIGNALWIRE_SIGNING_KEY` set (prod boot requires it) and a webhook test
      returns 200 with a valid signature, 401 without.
- [ ] GlitchTip receiving events from api + dashboard.
- [ ] CI green on the branch before merge.
