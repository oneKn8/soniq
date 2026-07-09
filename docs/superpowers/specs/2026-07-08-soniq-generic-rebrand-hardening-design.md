# Soniq — De-verticalization, Rebrand Polish & Hardening

**Date:** 2026-07-08 · **Branch:** `rework/generic-rebrand-hardening` · **Status:** approved, in execution

## Objective

Transform Soniq from a 7-industry-preset voice-agent platform into **one universal, config-driven
AI voice-call agent**, finish the Soniq rebrand, and make the whole system robust and bulletproof —
**without touching the database or running any migration** (explicit constraint from Santo, 2026-07-08).

## Locked decisions

| Decision | Choice |
|:--|:--|
| Brand | Keep "Soniq", perfect it (finish CallAgent→Soniq, purge stale "Vapi" from code) |
| Verticals | **Fully generic** — remove the entire industry-preset subsystem |
| Order-taking | Generalize to a domain-neutral, optional capability (OFF by default) |
| `/workstation` route | Remove entirely; fold nothing vertical-specific back |
| `tenants.industry` | Stop using it in code (column left in DB — no migration) |
| Hardening | Comprehensive: security + tests + CI + boundaries + structured logging + dead-code removal |
| Infra target | Self-host on Hetzner via **Coolify** (lean gotrue auth, dedicated Postgres, reuse GlitchTip, add swap) — **artifacts only, not executed** |

## Hard constraint: NO DB / NO MIGRATION

Do NOT run migrations, alter schema, provision databases, or deploy to the Hetzner box. Code must keep
working against the **current schema as-is**. Where a clean end-state needs a migration, produce the
migration file + runbook but DO NOT run it. See "Deferred" below.

## The universal-agent model (replaces the preset system)

Configurability is **relocated**, not removed. A tenant is shaped by direct config, not by an industry:

- **Identity:** `business_name`, `agent_name`, `voice_config`, greeting(s) — already columns on `tenants`.
- **Capabilities (toggles):** appointment booking · order/request taking (generic) · FAQ/knowledge ·
  call transfer/escalation · voicemail · callbacks. Already modeled by `tenant_capabilities`; collapse
  the per-industry menus into one flat universal capability set.
- **Knowledge:** free-form business description + FAQ Q/A pairs (existing config surfaces).
- **Universal terminology everywhere:** fixed labels — "customer", "booking", "deal", "task". No
  per-industry relabeling.
- **Universal deal pipeline:** one default set of stages (e.g. `new → qualified → won/lost`),
  tenant-overridable via existing JSONB config; no per-industry pipelines.

### Replacement API (what parallel agents must converge on)

The Phase-1 design agent produces the exact mechanical map; agents follow it. Direction:

- Backend `buildSystemPrompt(tenant)` = keep `MASTER_VOICE_PROMPT` (how to speak) + ONE universal role
  template + tenant business context + enabled-capability instruction blocks + knowledge + escalation.
  Delete `getIndustryConfig` / `INDUSTRY_CONFIGS` and the hardcoded "Grand Plaza Hotel" example.
- Delete `config/industry-prompts.ts`, `config/industry-pipeline.ts`; replace with `config/universal-prompt.ts`
  + a single `getPipelineConfig()` returning the universal default.
- Frontend: delete `lib/industryPresets.ts` (~1810 lines), `context/IndustryContext.tsx`, industry
  setup step + vertical detail steps, and all `components/templates/*` + `components/workstation/*`
  vertical widgets. Terminology helpers return fixed universal labels.
- Agent (`tools.py`): keep check_availability/create_booking/transfer_to_human/end_call; **wire up the
  dead `log_note` tool**; generalize `create_order` → domain-neutral `create_order` gated by capability.

## Phases

Ordering = security-first, always-shippable. Each phase verified with typecheck (api), build/lint
(dashboard), py_compile/import (agent) before the next.

### Phase 0 — Security triage (code-only; no DB)
- SQL-injection: whitelist sortable columns in `query-helpers.ts buildOrderClause()`; reject others.
- Webhook signature verification middleware for inbound telephony (`/sip/forward`, voicemail callbacks).
- Lock down `/api/chat`: require a lightweight token + per-tenant quota (in addition to IP rate limit).
- Encryption (`crypto/encryption.ts`): fail-closed when `ENCRYPTION_KEY` unset (throw, never plaintext);
  derive per-value salt; require the key in all environments.
- Fix mis-mounted voicemail SignalWire callbacks (move off JWT-auth group + verify signature instead).
- `soniq-api/.gitignore`: create a real one (block `.env`, `.env.*` except `.env.example`, `node_modules`, `dist`).
- Leaked LiveKit creds: untrack `soniq-agent/livekit/livekit.yaml` + `sip.yaml`, replace tracked copies
  with placeholder templates (`*.example`), add to `.gitignore`, scrub the real phone number.
  **Key rotation + git-history scrub/force-push are DEFERRED (Santo's action).**
- Extend zod validation to the remaining API routes that hand-parse bodies.

### Phase 1 — De-verticalization (code-only; DB column left untouched)
- Execute the replacement API above across all three services.
- Remove `/workstation` route + vertical templates + industry-driven UI.
- Generalize `create_order`; wire `log_note`.
- Stop reading/branching on `tenants.industry` (leave the column; default any writes to a neutral value).

### Phase 2 — Rebrand polish + dead code
- Unify domain to a single canonical (`soniq.ai`); fix `soniqai.com` references.
- Replace the default create-next-app `favicon.ico` with a Soniq favicon; delete boilerplate
  `public/{next,vercel,file,window,globe}.svg`.
- Use the Soniq mark in dashboard chrome (Sidebar/loading) instead of the generic `Zap` icon.
- Gate the "Reset (Dev)" control to dev/developer role only.
- Remove dead code: `services/vapi/*`, `services/deepgram/*`, `services/fallback/*`,
  `services/connections/*`, dashboard `components/shell/*`, `src/test-calendar.ts`.
- Purge stale "Vapi" naming from code/comments/README (DB column names stay — rename is DEFERRED).
- Rewrite drifted docs: `README.md` (already 7 presets → now universal), `PROJECT_CONTEXT.md`
  (27 industries/Next 14 → universal/Next 16); normalize the "Soniq Core" codename; fix tagline casing.

### Phase 3 — Tests + CI + observability
- Backend: **Vitest**. Priority suites: `buildOrderClause` injection regression, prompt builder,
  tool dispatch (`executeTool`), auth middleware, phone-utils, calendar fallback, engagement score.
  Tenant-isolation tests use mocked pool / ephemeral throwaway container in CI (NOT any real DB).
- Agent: **pytest** — tool dispatch, `call_logger` heuristics, `tenant_config`, with `httpx` mocked.
- Dashboard: **Vitest + RTL** for hooks/components; **Playwright** smoke for login + setup wizard + calls.
- CI: GitHub Actions — per-service typecheck + lint + test on PR; **gitleaks** secret-scan to prevent
  credential recurrence.
- Observability: replace `console.*` in api with **pino** (levels); add dashboard `error.tsx`,
  `loading.tsx`, `not-found.tsx`, `global-error.tsx` + an `ErrorBoundary`; wire the **GlitchTip** SDK
  (Sentry-compatible) into api + dashboard (DSN via env; no deploy).

### Phase 4 — Infra artifacts (files only; NOT executed)
- Coolify service definitions / Dockerfiles verified Coolify-ready; `docker-compose` for the app tier.
- gotrue (lean self-hosted auth) compose + Traefik routing config + env template.
- Swap-setup script + container memory-limit guidance for the Hetzner box.
- A `docs/deploy/hetzner-coolify-runbook.md` describing the exact (manual, later) deploy + DB provision.

## Deferred (blocked on Santo / a later DB pass)
- Rotate the leaked LiveKit API key/secret (Santo's LiveKit account).
- Git-history scrub of the leaked creds + force-push.
- Schema migrations: drop `tenants.industry`; rename `vapi_call_id`→`provider_call_id`,
  `vapi_phone_number_id`→`provider_phone_id`; create `app_api` role + real RLS policies.
- Provision the dedicated Postgres + gotrue on Hetzner; execute the Coolify deploy.

## Verification gates (per phase)
`soniq-api`: `npm run typecheck` clean. `soniq-dashboard`: `npm run build` + `npm run lint` clean.
`soniq-agent`: `python -m py_compile` all modules (no venv locally; syntax-level). Phase 3 adds real tests.
