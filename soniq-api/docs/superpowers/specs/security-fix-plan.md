# Soniq API - Phase 0 Security Hardening Fix Plan

Scope: `soniq-api` only. No database work, no migrations, no column renames, no
git operations. All changes stay in the working tree. Real DB-level RLS is out of
scope (deferred to a later DB pass). The public chat widget (`/api/chat`) must
remain usable by anonymous website visitors.

Framework context:
- Hono 4.6 (`hono`), Node >= 22, ESM (`"type": "module"`, `.js` import
  specifiers), zod 3.24 already a dependency, `twilio` 5.4 already a dependency.
- Public entry points today: `POST /sip/forward` (in `src/index.ts`),
  `/health`, `/api/chat`, `/internal/*` (guarded by `INTERNAL_API_KEY`).
- Everything under `/api/*` (except chat) is behind `authMiddleware()`
  (Supabase JWT + `X-Tenant-ID`).

Verification after each fix: `source ~/.nvm/nvm.sh && nvm use default && npm run typecheck`.

---

## Fix 1 - SQL injection via `sort_by` into `ORDER BY`

### Problem (confirmed)
`buildOrderClause(sortBy, sortOrder)` in
`src/services/database/query-helpers.ts:56-62` interpolates `sortBy` directly:
`return \`ORDER BY ${sortBy} ${direction}\`;`. There is no parameterization
possible for identifiers in Postgres, so this must be whitelisted at the call
site. `sortOrder` is already safe (mapped to the literal `ASC`/`DESC`).

Call sites reached from client-controlled `query.sort_by`:
- `src/routes/bookings.ts:108` -> `searchBookings` ->
  `src/services/bookings/booking-service.ts:143,195` (NO whitelist - vulnerable).
- `src/routes/contacts.ts:186` -> `searchContacts` ->
  `src/services/contacts/contact-service.ts:301,405` (NO whitelist - vulnerable).
- `src/routes/resources.ts:103` -> `listResources` ->
  `src/services/resources/resource-service.ts:124,171` builds `ORDER BY ${sortBy}`
  inline (NO whitelist - vulnerable).
- `src/routes/deals.ts:90` -> `searchDeals` ->
  `src/services/deals/deal-service.ts:19-46` (ALREADY whitelisted - pattern to
  reuse).
- `src/routes/tasks.ts:93` -> `task-service.ts:16-46` (ALREADY whitelisted).

So three services need the whitelist: bookings, contacts, resources. `deals` and
`tasks` already do it and are the reference implementation.

### Approach
1. Add a shared, defensive whitelist helper in
   `src/services/database/query-helpers.ts` so all call sites converge on one
   sanitizer (belt and suspenders even where a local `Set` exists):

   ```ts
   // Sanitize a client-supplied ORDER BY column against an allow-list.
   // Returns `fallback` for any value not explicitly allowed.
   export function safeSortColumn(
     requested: string | undefined,
     allowed: ReadonlySet<string>,
     fallback: string,
   ): string {
     if (requested && allowed.has(requested)) return requested;
     return fallback;
   }
   ```

   Optionally harden `buildOrderClause` itself to reject anything that is not a
   bare identifier (`/^[a-z_][a-z0-9_]*$/i`) and throw, as a last-resort guard;
   keep behavior identical for valid identifiers so existing callers are
   unaffected.

2. `booking-service.ts` `searchBookings` (line ~143): define
   `const BOOKING_SORT_COLUMNS = new Set(["booking_date","booking_time","created_at","updated_at","customer_name","status","booking_type","amount_cents","duration_minutes"]);`
   and set `const sortBy = safeSortColumn(pagination.sort_by, BOOKING_SORT_COLUMNS, "booking_date");`.
   Default stays `booking_date` (unchanged behavior for valid input).

3. `contact-service.ts` `searchContacts` (line ~301): define
   `const CONTACT_SORT_COLUMNS = new Set(["last_contact_at","created_at","updated_at","name","first_contact_at","last_booking_at","last_call_at","engagement_score","lifetime_value_cents","total_bookings","total_calls","status"]);`
   default `last_contact_at`. (`getContactHistory` at line 430 uses a hardcoded
   `created_at`, not client input - leave as is.)

4. `resource-service.ts` `listResources` (line ~124): define
   `const RESOURCE_SORT_COLUMNS = new Set(["sort_order","name","created_at","updated_at","type"]);`
   default `sort_order`.

All column names verified against `schema/001-tables.sql` (bookings:297,
contacts:66, resources:243). No column renames.

### Edge cases
- Unknown / malicious `sort_by` (e.g. `booking_date; DROP TABLE bookings--`,
  `(SELECT ...)`) -> silently falls back to the default column, request still
  succeeds. This is intentional (matches existing deals/tasks behavior) and keeps
  pagination working.
- Case sensitivity: allow-list is exact-match, lowercase, matching DB columns.
- `sort_order` is untouched (already safe).

### How it fails closed
Any value not in the explicit allow-list can never reach the SQL string; the
column is replaced by a known-safe constant before interpolation.

---

## Fix 2 - Webhook signature verification for inbound telephony

### Problem (confirmed)
- `POST /sip/forward` (`src/index.ts:80-90`) is public and unauthenticated.
- Voicemail SignalWire callbacks (`src/routes/voicemails.ts`
  `/callback/complete`, `/callback/status`, `/callback/transcribe`, and the
  `/record` TwiML entry) perform no signature check.
- Current "security" is only a `webhook_secret` query param appended to
  configured webhook URLs (`withWebhookSecret()` in
  `src/routes/phone-config.ts:23`, `src/services/signalwire/phone.ts:13`,
  `src/services/signalwire/client.ts:26`) which is never actually verified on
  inbound requests. Env var: `SIGNALWIRE_WEBHOOK_SECRET`.

### Signature scheme settled on
Twilio-compatible HMAC-SHA1, verified with the already-installed `twilio` SDK's
`validateRequest`. Verified directly in
`node_modules/twilio/lib/webhooks/webhooks.js:92-149`:

- `getExpectedTwilioSignature(key, url, params)` computes:
  `HMAC_SHA1( key, url + concat( for each POST param key sorted asc: key + value ) )`
  then base64. For GET-style requests params come from the query string already
  in `url`.
- `validateRequest(key, headerValue, url, params)` constant-time compares (`scmp`)
  the header against the expected signature, and internally retries with/without
  port and with a legacy querystring variant, so proxy port differences do not
  break it.

SignalWire's compatibility (LAML) API uses the identical algorithm; the only
differences from Twilio are (a) the header name is `x-signalwire-signature`
(Twilio uses `X-Twilio-Signature`) and (b) the signing key is the project's
signing key from the SignalWire dashboard, not the API auth token. Confirmed
against SignalWire "Webhook security" docs:
`RestClient.validateRequest(signingKey, req.headers["x-signalwire-signature"], url, req.body)`.

Decision: the middleware accepts EITHER header (`x-signalwire-signature` first,
`X-Twilio-Signature` fallback) so it works whether the space is on the
SignalWire-native or Twilio-compatible signing path, and keys the HMAC on a
configured signing secret.

### Approach
New file `src/middleware/webhook-signature.ts` exporting
`verifyTelephonyWebhook()` (Hono middleware). Also re-export it from
`src/middleware/index.ts`.

Signing key resolution (in priority order):
1. `SIGNALWIRE_SIGNING_KEY` (new; documented as the dashboard signing key - the
   correct HMAC key).
2. Fallback to `SIGNALWIRE_WEBHOOK_SECRET` if `SIGNALWIRE_SIGNING_KEY` is unset,
   so single-secret deployments keep working.

Middleware logic:
```
const signingKey = process.env.SIGNALWIRE_SIGNING_KEY
  || process.env.SIGNALWIRE_WEBHOOK_SECRET;
const isProduction = process.env.NODE_ENV === "production";

if (!signingKey) {
  if (isProduction) return c.json({ error: "Webhook verification not configured" }, 401); // fail closed
  console.warn("[WEBHOOK] No signing secret set - skipping verification (non-production only)");
  return next(); // documented dev bypass
}

// Reconstruct the exact URL SignalWire signed. Prefer BACKEND_URL (the value
// used when configuring webhooks) over the Host header, which a proxy/ngrok can
// rewrite and which is attacker-influenced.
const base = (process.env.BACKEND_URL || "").replace(/\/$/, "");
const reqUrl = new URL(c.req.url);
const url = base
  ? base + reqUrl.pathname + reqUrl.search
  : c.req.url;

// SignalWire sends application/x-www-form-urlencoded; parseBody is cached by Hono
const params: Record<string, string> = {};
const body = await c.req.parseBody();
for (const [k, v] of Object.entries(body)) {
  if (typeof v === "string") params[k] = v;
}

const header = c.req.header("x-signalwire-signature")
  || c.req.header("X-Twilio-Signature")
  || "";

// Try candidate URLs (query-param secret means the configured URL may or may
// not carry ?webhook_secret=...). Validate against the reconstructed URL; if a
// webhook_secret query param is present it is already part of reqUrl.search.
const ok = header && validateRequest(signingKey, header, url, params);
if (!ok) {
  return c.json({ error: "Invalid webhook signature" }, 401); // fail closed
}
return next();
```

Notes:
- `validateRequest` imported as `import { validateRequest } from "twilio";`
  (exported from the package root; also available as `twilio.validateRequest`).
- Body caching: Hono caches `parseBody()`/`req.json()` results per request, so the
  downstream route handlers that call `c.req.parseBody()` again
  (`voicemails.ts` callbacks) receive the same parsed object. Verified this is
  safe; no double-read error.
- Apply to:
  - `/sip/forward`: convert the inline `app.post("/sip/forward", ...)` in
    `src/index.ts` to `app.post("/sip/forward", verifyTelephonyWebhook(), handler)`.
  - Voicemail callbacks: see Fix 3 (they move to a public group where the
    middleware is applied).

### Edge cases
- Missing header but secret configured -> 401 (fail closed).
- Wrong signature -> 401.
- Secret unset in production -> 401 (fail closed), plus the startup env check in
  Fix 6/existing `start()` can be extended to warn.
- Secret unset in dev/test -> bypass with a loud warning (documented, matches the
  task's allowed non-production bypass).
- Proxy/port/host rewrites (Cloud Run, ngrok) -> mitigated by building the URL
  from `BACKEND_URL` and by `validateRequest`'s built-in port/legacy-querystring
  retries. If `BACKEND_URL` is misconfigured vs. what was registered with
  SignalWire, signatures fail closed (401) - correct and safe, and surfaced in
  logs for operability.
- GET vs POST: SignalWire voice/record callbacks are POST form-encoded; params
  are read from `parseBody()`. Query params (e.g. `webhook_secret`) remain in the
  signed URL via `reqUrl.search`.

### How it fails closed
No valid signature and a configured secret => 401 before the handler runs. The
only pass-through without a signature is the explicit non-production bypass when
no secret is set at all.

---

## Fix 3 - Voicemail callbacks are unreachable (mounted under JWT auth)

### Problem (confirmed)
`voicemailRoutes` is mounted at `app.route("/api/voicemails", ...)`
(`src/index.ts:114`) which sits AFTER `app.use("/api/*", authMiddleware())`
(`src/index.ts:103`). The SignalWire-called endpoints inside it -
`POST /api/voicemails/callback/complete|status|transcribe` and
`POST /api/voicemails/record` (`src/routes/voicemails.ts:65,102,144,154`) - are
webhooks with no JWT/`X-Tenant-ID`, so SignalWire cannot reach them (they 401 at
the auth gate). The dashboard-facing endpoints in the same router (`GET /`,
`PATCH /:id/status`, `GET /stats/:tenantId`) legitimately need JWT auth.

### Approach
Split the router into two mount points:

1. New public webhook router `voicemailWebhookRoutes` (new export from
   `src/routes/voicemails.ts`, or a small dedicated file) containing:
   `/record`, `/callback/complete`, `/callback/status`, `/callback/transcribe`.
   Mount it BEFORE the `/api/*` auth line, signature-verified:
   ```ts
   app.route("/webhooks/voicemail", voicemailWebhookRoutes); // public
   // inside the router: voicemailWebhookRoutes.use("*", verifyTelephonyWebhook());
   ```
   Register these paths as the public webhook base. Update the callback URL
   construction in `src/routes/voicemails.ts:88-90` and the TwiML generator usage
   so `callbackUrl` points at
   `${BACKEND_URL}/webhooks/voicemail/callback/complete` (the TwiML helper derives
   `/status` and `/transcribe` by string replace on `/complete`, so keep the
   `/complete` suffix and the sibling paths named `status`/`transcribe`).
   Also update `generateVoicemailTwiML` callers accordingly. The SignalWire number
   webhook configured via `configureNumberWebhooks` / `withWebhookSecret` continues
   to append `?webhook_secret=` which stays part of the signed URL.

2. Keep the JWT-protected router `voicemailRoutes` mounted at
   `/api/voicemails` with only the dashboard endpoints (`GET /`,
   `PATCH /:id/status`, `GET /stats/:tenantId`).

Alternative (smaller diff) if we must keep a single `/api/voicemails` base:
add a per-route bypass is NOT possible cleanly because `authMiddleware()` is a
path-prefix `app.use("/api/*")`. Re-mounting on a non-`/api` public prefix is the
correct fix. Chosen: `/webhooks/voicemail/*`.

### Edge cases
- Any existing SignalWire number already provisioned points at
  `${BACKEND_URL}/sip/forward` for voice; voicemail record/callback URLs are
  generated at request time in `voicemails.ts` (`/record` builds the callback
  URL), so changing the base path takes effect immediately without re-provisioning
  numbers. Confirm no other place hardcodes `/api/voicemails/callback`.
  (grep: only `voicemails.ts:89` builds it.)
- The public webhook router must NOT expose the dashboard list/stats endpoints.
- `record` reads `tenantId` from the POST body; keep that, but it now also gets
  signature-verified (only SignalWire can invoke it).

### How it fails closed
Webhook endpoints are reachable by SignalWire (fixing the outage) but gated by
`verifyTelephonyWebhook()` (Fix 2), so they are not open to the public. Dashboard
endpoints remain behind JWT.

---

## Fix 4 - Chat abuse surface (must stay anonymous)

### Problem (confirmed)
`app.route("/api/chat", chatRoutes)` (`src/index.ts:94`) is mounted before
`authMiddleware()`, by design (embeddable widget, anonymous visitors). Current
protections: only the global `rateLimit({ windowMs:60000, max:100 })`
(`src/index.ts:76`) keyed by IP, and a zod schema
(`src/routes/chat.ts:99-114`) that already caps `message` at 10000 chars. CORS on
the chat router is wildcard by default (`src/routes/chat.ts:36-48`) unless
`CHAT_ALLOWED_ORIGINS` is set globally. Gaps: no per-tenant limit, no per-IP
limit specific to the expensive LLM path, no body-size cap before JSON parse, no
per-tenant origin allow-list.

### Approach (no login added)
In `src/routes/chat.ts`, applied only to `POST /` (the LLM path):

1. Body-size cap BEFORE parsing: check `Content-Length` header; reject > e.g.
   32 KB with 413. Also defensively cap after read. The zod `message` max stays
   (10000). This prevents large-payload abuse and JSON bomb attempts.
   ```ts
   const MAX_CHAT_BODY_BYTES = 32 * 1024;
   const len = Number(c.req.header("content-length") || 0);
   if (len > MAX_CHAT_BODY_BYTES) return c.json({ error: "Payload too large" }, 413);
   ```

2. Per-IP rate limit (anonymous-safe) using existing `rateLimit()` with a custom
   `keyGenerator` that reads the forwarded IP, scoped to the chat send path, e.g.
   `chatRoutes.post("/", rateLimit({ windowMs:60000, max:20, keyGenerator: ipKey }), handler)`.
   Reuse the IP extraction already in `src/middleware/rate-limit.ts:102-121`
   (export a small `getClientKey`/IP helper, or add `chatRateLimit()` there).

3. Per-tenant rate limit: a second limiter keyed on the request `tenant_id`.
   Because `tenant_id` is in the JSON body (not a header), either:
   - parse the body once in a small pre-handler and stash it on the context
     (`c.set("chatBody", parsed)`) so the limiter and handler share it, keying
     `tenant:${tenant_id}`; or
   - add `tenantRateLimit`-style logic that also inspects `X-Tenant-ID` header if
     the widget sends it (the chat CORS already allows `X-Tenant-ID`).
   Chosen: read `X-Tenant-ID` header when present, else fall back to a
   parse-once-and-key approach. Limit e.g. 120/min/tenant. This bounds cost per
   customer tenant regardless of IP spread.

4. Per-tenant allowed-origins check where feasible: the tenant record can carry
   allowed widget origins. Since we must not add DB columns, implement a global
   `CHAT_ALLOWED_ORIGINS` enforcement now (tighten the existing wildcard: if the
   env is set, reject disallowed origins with 403 instead of silently rewriting to
   `allowed[0]`), and structure the origin check so a future per-tenant
   `allowed_origins` field (from `getTenantById`, already loaded) can be honored
   without refactor. If `tenant.allowed_origins` (or a metadata/JSONB field that
   already exists) is present, enforce it per tenant; otherwise fall back to the
   env allow-list. No schema change: only read fields that already exist; skip
   per-tenant enforcement gracefully when absent.

5. Keep anonymous access: no JWT requirement is introduced. All limits are
   IP/tenant/origin/size based.

### Edge cases
- Legit widgets on many domains: origin enforcement stays opt-in (wildcard when
  neither env nor tenant field is configured), so default behavior is unchanged
  and widgets keep working.
- Missing/spoofed `X-Forwarded-For`: IP key falls back to `"unknown"` bucket
  (same as existing limiter) - acceptable; per-tenant limit still bounds cost.
- OPTIONS preflight: must not be rate limited or size-checked into failure; apply
  limiters to `POST` only, leave CORS `OPTIONS` handling to the existing
  `cors()`.
- `tenant_id` invalid/missing: existing zod + tenant lookup already returns
  400/404; per-tenant limiter should tolerate absent tenant id (fall back to IP
  key) so it never throws.
- Shared in-memory store is per-instance (documented limitation in
  `rate-limit.ts`); acceptable for Phase 0.

### How it fails closed
Oversized bodies -> 413 before any LLM call. Excess volume per IP or per tenant ->
429. Disallowed origin (when configured) -> 403. The expensive multi-provider LLM
call is never reached when any guard trips.

---

## Fix 5 - Encryption must fail closed

### Problem (confirmed)
`src/services/crypto/encryption.ts`:
- `SALT = "soniq-encryption-salt"` is a static constant (line 18) used for every
  value's `scryptSync` key derivation (line 27).
- `encrypt()` returns plaintext unchanged when `ENCRYPTION_KEY` is unset
  (line 37).
- `decrypt()` logs and returns the ciphertext-as-is when the key is unset
  (line 57-60).
- `ENCRYPTION_KEY` is only required in production (`src/index.ts:164`).

Callers: `phone-config.ts:268-269` encrypts port-request `account_number` and
`pin` via `encryptIfNeeded`. Any decrypt path (search for `decrypt(`) reads them
back.

### Approach
Rewrite `encryption.ts` to fail closed and use a per-value random salt stored with
the ciphertext, keeping AES-256-GCM:

1. Require the key in ALL environments:
   ```ts
   function getEncryptionKeyMaterial(): string {
     const key = process.env.ENCRYPTION_KEY;
     if (!key || key.length < 32) {
       throw new Error("ENCRYPTION_KEY must be set (>= 32 chars) for encryption/decryption");
     }
     return key;
   }
   ```
   Remove the `Buffer | null` return and all "return plaintext" branches.

2. Per-value random salt: derive the AES key per operation from a fresh 16-byte
   random salt on encrypt, and store `salt` in the payload. New wire format
   (versioned so old values still decrypt):
   ```
   enc:v2:<saltHex>:<ivHex>:<authTagHex>:<ciphertextHex>
   ```
   `key = scryptSync(ENCRYPTION_KEY, salt, 32)`. On decrypt, parse the salt from
   the payload and re-derive. Drop the module-level `cachedKey` (salt now varies
   per value); optionally memoize by salt if profiling shows scrypt cost matters,
   but correctness first.

3. Backward compatibility: keep reading the legacy `enc:<iv>:<authTag>:<ct>`
   format (no version tag) using the OLD static `SALT`, so already-encrypted rows
   (if any) still decrypt. Detect by counting the segments / presence of the
   `v2:` marker. New writes always use `v2` + random salt. This avoids any DB
   migration or re-encryption pass while removing the vulnerability for all new
   data. (If it is certain no legacy ciphertext exists, this branch can be
   dropped, but keeping it is zero-risk.)

4. `encrypt`/`decrypt`/`encryptIfNeeded` now throw instead of silently passing
   plaintext. Callers already run inside route try/catch (`phone-config.ts`
   `/port` handler wraps in try/catch returning 500), so a missing key surfaces as
   a 500 rather than silent plaintext storage - the desired fail-closed behavior.

5. Startup: `ENCRYPTION_KEY` is already required in production
   (`src/index.ts:164`). Add it to the always-required list (move it out of the
   `if (isProduction)` block) so the process refuses to boot without it in every
   environment, matching the "require the key in all environments" requirement.

### Edge cases
- Key shorter than 32 chars -> throw at first use and at startup.
- Legacy static-salt ciphertext -> still decryptable via the versioned fallback.
- `decrypt` on a non-`enc:` plaintext value (e.g. a NULL-able column that was
  never encrypted) -> current code returns it unchanged (line 54); keep that
  specific pass-through for genuinely-unprefixed values so reads of un-encrypted
  legacy rows don't crash, but NEVER emit plaintext from `encrypt`.
- `encryptIfNeeded(null)` -> still returns null (no value to protect).

### How it fails closed
With no key (or a weak key), every encrypt/decrypt call throws and the request
fails (500) instead of persisting or returning plaintext. Random per-value salt
removes the static-salt weakness (identical plaintexts no longer share a derived
key, and precomputation against the fixed salt is impossible).

---

## Fix 6 - Extend zod validation to hand-parsed routes

### Problem (confirmed)
Routes that read `c.req.json()` / `c.req.parseBody()` with ad-hoc `if (!field)`
checks and NO zod (`safeParse` count = 0):
`capabilities.ts`, `escalation.ts`, `internal.ts`, `phone-config.ts`,
`promotions.ts`, `setup.ts`, `tenants.ts`, `training-data.ts`, `voicemails.ts`.
Partial coverage (some handlers unvalidated): `notifications.ts` (5 parse / 2
safeParse), `availability.ts` (4 / 2), `bookings.ts` (6 / 4).

The task explicitly names `internal.ts`, `voicemails.ts`, `phone-config.ts` "and
any others lacking it".

### Approach
For each hand-parsed handler, define a `z.object({...})` mirroring the exact
fields the code already reads and the existing informal checks, then
`safeParse` and return `400 { error, details }` on failure (matching the
established pattern in `bookings.ts:227-236`). Do not change accepted field names,
types, or optionality, so no request shape changes.

Priority order (do the three named files first, then the rest):

1. `internal.ts`:
   - `POST /voice-tools/:action` body
     `{ tenant_id: string, call_sid?: string, caller_phone?: string, escalation_phone?: string, args?: Record<string, unknown> }`
     (keep `tenant_id` required; `args` default `{}`). Preserve the current
     `if (!body.tenant_id || !action)` semantics.
   - `POST /calls/log` body: schema mirroring the large inline type
     (`tenant_id`, `call_sid` required; timestamps, enums for `direction`,
     `outcome_type`, numeric bounds for `duration_seconds`, `sentiment_score`,
     `cost_cents`; arrays for `intents_detected`). Keep `status` as a loose
     string (it is normalized by `mapCallStatus`). This is the highest-value one:
     it writes to `calls` and triggers automation.

2. `voicemails.ts`:
   - `PATCH /:id/status`: `z.object({ status: z.enum(["pending","reviewed","callback_scheduled","resolved"]) })` (replaces the inline `includes` check at line 46).
   - `/record` (moves to the public webhook router per Fix 3): validate the
     SignalWire POST body it reads (`tenantId`, `callSid`, `callerPhone`,
     `callerName?`, `reason`) with `reason` as `z.enum` of the `VoicemailReason`
     union. Keep required-field semantics from line 69.
   - Callback bodies (`complete`, `status`, `transcribe`): validate the fields
     read (`CallSid`, `RecordingUrl`, `RecordingSid`, `RecordingDuration`,
     `TranscriptionText`) as optional strings via a permissive
     `z.object({...}).passthrough()` so SignalWire's extra params are tolerated;
     the point is coercion/typing, not rejecting SignalWire.

3. `phone-config.ts`:
   - `POST /provision`: `{ phoneNumber: string.min(1) }`.
   - `POST /port`: `{ phone_number, current_carrier, authorized_name }` required
     (matches line 232), plus optional `account_number`, `pin`, `use_temp_number:
     boolean`.
   - `POST /forward`: `{ business_number: string.min(1) }`.
   Replace the inline `if (!body.x)` guards; keep identical error status (400).

4. Remaining lacking routes (`capabilities.ts`, `escalation.ts`,
   `promotions.ts`, `setup.ts`, `tenants.ts`, `training-data.ts`) and the
   partial ones (`notifications.ts`, `availability.ts` extra handlers): add
   `safeParse` schemas per handler mirroring current reads. Read each file first
   to enumerate fields; do not infer.

Shared helper (optional, reduces boilerplate): a tiny
`parseJson(c, schema)` util in a new `src/lib/validate.ts` that does
`const raw = await c.req.json().catch(() => null)` then `schema.safeParse` and
returns a typed result or a 400 response. Use it consistently.

### Edge cases
- `c.req.json()` on empty/invalid body currently throws in some handlers and is
  `.catch(()=>({}))`-guarded in others (e.g. `bookings.ts:321,401`); the helper
  must tolerate a missing/invalid body and turn it into a 400, not a 500, except
  where an empty body is currently valid (preserve those `.catch(() => ({}))`
  cases).
- SignalWire webhook bodies must use `.passthrough()` / optional fields so extra
  provider params never cause a 400 (would drop legitimate callbacks).
- `internal.ts` is authenticated by `INTERNAL_API_KEY`; validation is about
  robustness/defense-in-depth, not auth - keep 400 semantics.
- Keep every existing accepted shape: run `npm run typecheck` and spot-check that
  optional vs required matches today's behavior so no client breaks.

### How it fails closed
Malformed or unexpected input is rejected with 400 before it reaches DB writes,
automation triggers, or provider calls. Webhook validators stay permissive on
unknown keys but strict on the fields the handlers actually consume.

---

## Cross-cutting notes and env additions

New / clarified environment variables (document in `.env.example`):
- `SIGNALWIRE_SIGNING_KEY` - dashboard signing key for webhook HMAC verification
  (falls back to `SIGNALWIRE_WEBHOOK_SECRET` if unset).
- `ENCRYPTION_KEY` - now required in all environments (>= 32 chars).
- `CHAT_ALLOWED_ORIGINS` - optional; when set, chat origin enforcement returns 403
  for disallowed origins instead of silently rewriting.

Suggested implementation order (low-risk to high-touch):
1. Fix 1 (whitelist) - isolated, mechanical.
2. Fix 5 (encryption) - isolated module, add startup requirement.
3. Fix 2 (signature middleware) - new file, no behavior change until applied.
4. Fix 3 (re-mount voicemail webhooks) - depends on Fix 2.
5. Fix 4 (chat abuse) - isolated to chat route + rate-limit helper.
6. Fix 6 (zod) - broad but mechanical; do named files first.

Verification per fix: `source ~/.nvm/nvm.sh && nvm use default && npm run typecheck`.
Manual checks: signed vs unsigned request to `/sip/forward` and
`/webhooks/voicemail/callback/complete` (expect 200 vs 401); oversized/high-rate
`POST /api/chat` (expect 413/429); `encrypt()` throws with `ENCRYPTION_KEY`
unset; `sort_by=malicious` on `/api/bookings` returns normally sorted by default
column.
