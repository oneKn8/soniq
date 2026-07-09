# Soniq De-verticalization — Mechanical Refactor Contract

**Date:** 2026-07-08 · **Scope:** Phase 1 (de-verticalization, code-only) of the approved design
`2026-07-08-soniq-generic-rebrand-hardening-design.md`. This document is the single source of truth
that three parallel agents (soniq-api, soniq-dashboard, soniq-agent) MUST follow verbatim so they do
not diverge. Where this contract pins a name, signature, string, or return value, use it EXACTLY.

## Non-negotiable guardrails (all three agents)

- **NO DATABASE, NO MIGRATIONS.** Do not touch any `migrations/` dir, do not run psql/supabase/any DB
  command. The `tenants.industry` column STAYS. Stop reading/branching on it in code; where a write path
  still requires it, default to the neutral literal `"general"` and keep every read null-safe
  (`tenant?.industry ?? "general"` style). Never drop/rename a DB column. Keep DB column names
  `vapi_call_id` and `vapi_phone_number_id` exactly as-is in all SQL (renames are DEFERRED).
- **Wire contracts are frozen.** The `/internal/*` JSON response keys the Python agent consumes stay
  present and same-typed (see section 4). The dashboard↔API HTTP contract (routes, request/response
  shapes) stays stable. Extending a response with a NEW additive key is allowed; removing/renaming an
  existing key is NOT.
- No `git commit/checkout/reset/push`. Leave changes in the working tree.
- No emojis in code or comments. No "Claude"/"AI"/"Anthropic" authorship strings in comments.
- Node commands: `source ~/.nvm/nvm.sh && nvm use default` first.
- Verification gates: `soniq-api` → `npm run typecheck` clean; `soniq-dashboard` → `npm run build` +
  `npm run lint` clean; `soniq-agent` → `python -m py_compile agent.py tools.py tenant_config.py
  api_client.py call_logger.py` clean.

---

## 1. UNIVERSAL DECISIONS (pinned values — copy exactly)

### 1.1 Fixed terminology labels

There is NO per-industry relabeling. Every terminology helper returns this frozen object. Singular +
plural forms are fixed:

| Concept      | Singular       | Plural         |
|:-------------|:---------------|:---------------|
| customer     | `Customer`     | `Customers`    |
| booking      | `Booking`      | `Bookings`     |
| deal         | `Deal`         | `Deals`        |
| task         | `Task`         | `Tasks`        |
| availability | `Availability` | (n/a)          |
| revenue      | `Revenue`      | (n/a)          |

Canonical constant (identical in api and dashboard, defined per-service):

```
UNIVERSAL_TERMINOLOGY = {
  customer: "Customer",        customerPlural: "Customers",
  booking: "Booking",          bookingPlural: "Bookings",
  deal: "Deal",                dealPlural: "Deals",
  task: "Task",                taskPlural: "Tasks",
  availability: "Availability",
  revenue: "Revenue",
}
```

### 1.2 Capability enum (the ONE flat universal set)

Canonical capability ids (replace every per-industry capability menu). Exactly these six:

| id                    | label                        | default enabled |
|:----------------------|:-----------------------------|:----------------|
| `appointment_booking` | Appointment Booking          | on              |
| `order_taking`        | Order / Request Taking       | **OFF**         |
| `faq`                 | FAQ & Knowledge              | on              |
| `call_transfer`       | Call Transfer / Escalation   | on              |
| `voicemail`           | Voicemail                    | on              |
| `callbacks`           | Callbacks                    | on              |

Notes:
- Default-enabled set the setup wizard writes for a brand-new tenant:
  `["appointment_booking", "faq", "call_transfer", "voicemail", "callbacks"]` (i.e. all except
  `order_taking`).
- **Legacy tolerance (no migration):** existing `tenant_capabilities.capability` rows may hold legacy
  strings (`appointments`, `reservations`, `takeaway`, `messages`, `hours_location`, `transfer_human`,
  `patient_intake`, `insurance_questions`, …). Reads MUST NOT crash on unknown values. For the ONE gated
  behavior (`order_taking`, see 1.4) treat legacy `takeaway` and `orders` as aliases of `order_taking`.
  All other legacy values are simply passed through / ignored by gating.

### 1.3 ONE default deal-pipeline stage list (universal, tenant-overridable later via JSONB)

Exactly four stages, no per-industry pipelines:

```
stages: [
  { id: "new",       label: "New",       color: "blue",    isTerminal: false },
  { id: "qualified", label: "Qualified", color: "amber",   isTerminal: false },
  { id: "won",       label: "Won",       color: "emerald", isTerminal: true  },
  { id: "lost",      label: "Lost",      color: "red",     isTerminal: true  },
]
defaultStage:  "new"
completedStage:"won"
cancelledStage:"lost"
dealLabel: "Deal"  dealLabelPlural: "Deals"
```

Universal task types (unchanged from the existing `UNIVERSAL_TASK_TYPES`, keep exactly):

```
[ {value:"follow_up",label:"Follow Up"}, {value:"call_back",label:"Call Back"},
  {value:"email",label:"Email"}, {value:"meeting",label:"Meeting"},
  {value:"review",label:"Review"}, {value:"custom",label:"Custom"} ]
```

Deals already in the DB with legacy stage ids (`inquiry`, `scheduled`, `checked_in`, …) are null-safe:
`getPipeline` already collects unknown stages into a trailing `"other"` bucket. Keep that behavior.

### 1.4 Generalized `create_order` tool (domain-neutral, gated, OFF by default)

The pizza-specific order tool becomes a neutral "order / request" tool. Pin this schema everywhere
(agent tool signature, API `CreateOrderArgs`, executor):

| field              | type   | required | notes                                                        |
|:-------------------|:-------|:---------|:-------------------------------------------------------------|
| `customer_name`    | string | yes      | rejected if placeholder/empty                                |
| `request_summary`  | string | yes      | what the caller wants (replaces pizza `items`)               |
| `customer_phone`   | string | no       | falls back to caller ID                                      |
| `fulfillment_type` | string | no       | one of `pickup` \| `delivery` \| `onsite` \| `none` (default `none`) |
| `fulfillment_address` | string | no    | required only when `fulfillment_type === "delivery"`         |
| `notes`            | string | no       | special instructions                                         |

Behavior rules:
- Gating: `create_order` is offered ONLY when the tenant has the `order_taking` capability enabled. It
  is OFF by default. Gating is enforced in TWO places: (a) agent omits the tool from its tool list when
  `order_taking` not enabled; (b) API executor returns a soft failure if invoked without the capability.
- Persistence stays on the existing `bookings` table (NO new table): `booking_type = fulfillment_type`,
  `notes` = composed from `request_summary` + address/notes, `status = "confirmed"`, `source = "call"`.
- Confirmation code prefix: drop the pizza `TP-`; use a neutral `OR-` prefix.
- Result shape is UNCHANGED (`success, order_id, confirmation_code, estimated_time, message`).

### 1.5 Wire the currently-dead `log_note` tool

`log_note` is fully implemented on the API (`executeLogNote`, routed in `executeTool`) and defined in
the agent (`tools.py:log_note`) but NOT in `agent.py`'s tool list. Add `log_note` to the agent's
`tools=[...]` list. It is always-on (no capability gate).

---

## 2. REPLACEMENT API — exact substitution for every deleted export

Every current consumer must land on the replacement named here. `.js` import extensions are required in
soniq-api (ESM).

### 2.1 soniq-api

| Deleted symbol / file | Replacement | Signature / return |
|:--|:--|:--|
| `config/industry-prompts.ts` (whole file) | `config/universal-prompt.ts` (new) | see below |
| `getIndustryConfig(industry)` | removed | inlined into `buildSystemPrompt` via `UNIVERSAL_ROLE_TEMPLATE` + `CAPABILITY_BLOCKS` |
| `INDUSTRY_CONFIGS`, `GENERIC_CONFIG` | removed | no replacement (single universal role) |
| `getIndustryTerminology`, `isIndustrySupported` | removed | `UNIVERSAL_TERMINOLOGY` const |
| `IndustryType`, `IndustryConfig`, `IndustryTerminology` (types) | removed | `CapabilityId` union type in `universal-prompt.ts` |
| `config/industry-pipeline.ts` (whole file) | `config/universal-pipeline.ts` (new) | see below |
| `getPipelineConfig(industry)` | `getPipelineConfig()` | no args → returns the single universal `PipelineConfig` (1.3) |
| `getStagesForIndustry(industry)` | `getStages()` | no args → `StageConfig[]` |
| `getTaskTypesForIndustry(industry)` | `getTaskTypes()` | no args → `{value,label}[]` |
| `getAllValidStages()`, `getAllValidTaskTypes()` | keep same names | no args, unchanged behavior over the single pipeline |
| `PipelineConfig`, `StageConfig` (types) | keep, re-export from `universal-pipeline.ts` | unchanged shape |
| `CAPABILITY_OPTIONS` + `DEFAULT_CAPABILITIES` (in `routes/capabilities.ts`) | `UNIVERSAL_CAPABILITY_OPTIONS` (single flat array of the 6 ids from 1.2) | `GET /api/capabilities/options/:industry` keeps its path but ignores the param and always returns the universal list |

`config/universal-prompt.ts` (new) MUST export:
```
export type CapabilityId = "appointment_booking" | "order_taking" | "faq"
  | "call_transfer" | "voicemail" | "callbacks";
export const UNIVERSAL_TERMINOLOGY = { ...1.1... };
export const UNIVERSAL_ROLE_TEMPLATE: string;   // uses ${agentName}/${businessName}, no industry
export const CAPABILITY_BLOCKS: Record<CapabilityId, string>;  // one instruction block each
```

`buildSystemPrompt` (in `services/gemini/chat.ts`) — new signature (drops `industry`, adds capabilities
+ knowledge into options):
```
export function buildSystemPrompt(
  agentName: string,
  businessName: string,
  personality: { tone: string; verbosity: string; empathy: string },
  options?: {
    operatingHours?: any; locationAddress?: string; locationCity?: string;
    customInstructions?: string; escalationPhone?: string; timezone?: string;
    capabilities?: string[];   // NEW: enabled capability ids; appends matching CAPABILITY_BLOCKS
  },
): string
```
Compose: `MASTER_VOICE_PROMPT` + `UNIVERSAL_ROLE_TEMPLATE` (filled) + personality switches (keep as-is)
+ business context (drop the `Industry: ${industry}` line) + operating hours/location/escalation (keep)
+ one `CAPABILITY_BLOCKS[id]` per enabled capability + `customInstructions` + the closing CRITICAL RULES
block (keep). Remove the hardcoded "Grand Plaza Hotel"/industry example text.

### 2.2 soniq-dashboard

| Deleted symbol / file | Replacement | Signature / return |
|:--|:--|:--|
| `lib/industryPresets.ts` (whole file, ~1809 lines) | `lib/terminology.ts` (new) + `lib/capabilities.ts` (new) | see below |
| `context/IndustryContext.tsx` (whole file) | `lib/terminology.ts` (`useTerminology()` hook, no provider) | returns the frozen object below |
| `useIndustry()` | `useTerminology()` | returns `{ customerLabel, customerPluralLabel, transactionLabel, transactionPluralLabel, dealLabel, dealPluralLabel, availabilityLabel, revenueLabel, pipelineStages, taskTypes }` (field names kept identical to old context so destructures stay valid) |
| `useTerminology()` (old, from IndustryContext) | `useTerminology()` (new, from `lib/terminology.ts`) | same idea, fixed labels |
| `DEFAULT_INDUSTRY` | removed | no replacement |
| `IndustryProvider` | removed | delete the provider wrapper from `app/(dashboard)/layout.tsx` |
| context field `industry` | removed | consumers were all in deleted files (workstation/shell); if any survivor needs it, use `useTenant().currentTenant?.industry ?? "general"` |
| context field `preset` | removed | MobileNav: replace `preset.navLabels?.calendarTab` with the literal `"Calendar"` |
| context field `tenant` | removed | consumers were all deleted files; survivors use `useTenant()` |
| context field `industryLabel` | removed | TopBar + SystemHealth: use `useTenant().currentTenant?.business_name` (fallback `"Business"`) |
| context field `isSupported` | removed | no active consumers (verified 0) |
| context field `isLoading` | removed | only consumer was deleted `shell/AppShell` |
| `INDUSTRY_PRESETS`, `getPreset`, `getTerminology` | removed | `UNIVERSAL_TERMINOLOGY` / `useTerminology()` |
| `createDefaultConfig(industry, role)` | `createDefaultConfig(role?)` in `lib/terminology.ts` | drops the industry arg; builds `AppConfig` with `industry: "general"`, universal greetings/responses/voice/features/hours (reuse the existing `DEFAULT_*` consts, which are industry-agnostic), and `faqs: []` |
| `getCapabilitiesForIndustry(industry)` | `getUniversalCapabilities()` in `lib/capabilities.ts` | no args → `CapabilityDefinition[]` for the 6 universal ids |
| `getDefaultCapabilities(industry)` | `getDefaultCapabilities()` | no args → `["appointment_booking","faq","call_transfer","voicemail","callbacks"]` |
| `getCapabilityById(industry, id)` | `getCapabilityById(id)` | one arg |
| `UNIVERSAL_CAPABILITIES`, `RESTAURANT_CAPABILITIES`, `HEALTHCARE_CAPABILITIES` | folded into `UNIVERSAL_CAPABILITY_DEFS` in `lib/capabilities.ts` | single flat array |
| `INDUSTRY_CATEGORIES`, `getIndustriesByCategory`, `getPopularIndustries` | removed | industry picker UI is removed (see setup/settings edits) |
| `DEFAULT_VOICE_CONFIG`, `DEFAULT_FEATURE_FLAGS`, `DEFAULT_OPERATING_HOURS`, `DEFAULT_PERSONALITY`, `DEFAULT_GREETINGS`, `DEFAULT_RESPONSES` | move verbatim into `lib/terminology.ts` (or a new `lib/defaults.ts`) | unchanged values; re-export so `ConfigContext` imports still resolve |

`lib/terminology.ts` (new) MUST export:
```
export const UNIVERSAL_TERMINOLOGY = { ...1.1... } as const;
export const UNIVERSAL_PIPELINE_STAGES: PipelineStageConfig[];  // 1.3 stages, with bgColor/borderColor
export const UNIVERSAL_TASK_TYPES: IndustryTaskType[];          // 1.3 task types
export function useTerminology(): { customerLabel; customerPluralLabel; transactionLabel;
  transactionPluralLabel; dealLabel; dealPluralLabel; availabilityLabel; revenueLabel;
  pipelineStages; taskTypes };   // pure function, no React context needed (values are static)
```
Field mapping used to fill the hook (old context field → source):
`customerLabel→customer`, `customerPluralLabel→customerPlural`, `transactionLabel→booking`,
`transactionPluralLabel→bookingPlural`, `dealLabel→deal`, `dealPluralLabel→dealPlural`,
`availabilityLabel→availability`, `revenueLabel→revenue`, `pipelineStages→UNIVERSAL_PIPELINE_STAGES`,
`taskTypes→UNIVERSAL_TASK_TYPES`.

`types/index.ts`: keep `IndustryType` as a type alias `= string` (many types reference it; changing to
`string` avoids a cascade). Keep `IndustryTerminology`, `PipelineStageConfig`, `PipelineConfig`,
`IndustryTaskType`, `CapabilityDefinition` interfaces (still used by the universal modules). Remove
`IndustryCategory`, `IndustryPreset`, `INDUSTRY_CATEGORIES` usages. `AppConfig.industry` stays `string`
(default `"general"`).

### 2.3 soniq-agent

No industry symbols exist in the agent (it never reads industry). Changes are additive:
- `tools.py:create_order` → new neutral signature per 1.4 (params: `customer_name`, `request_summary`,
  `order_type`→rename to `fulfillment_type`, `customer_phone=""`, `fulfillment_address=""`, `notes=""`).
  Update the forwarded JSON keys to match 1.4.
- `agent.py` `SoniqAgent.__init__` builds the tools list conditionally: always include
  `check_availability, create_booking, transfer_to_human, end_call, log_note`; include `create_order`
  ONLY when `order_taking` is in `tenant_config.get("capabilities", [])` (treat legacy `takeaway`/`orders`
  as aliases). Import `log_note` (and keep `create_order`) from `tools`.

---

## 3. PER-SERVICE FILE ACTIONS

### 3.1 soniq-api

**DELETE:**
- `src/config/industry-prompts.ts`
- `src/config/industry-pipeline.ts`

**CREATE:**
- `src/config/universal-prompt.ts` (2.1)
- `src/config/universal-pipeline.ts` (2.1)

**EDIT:**
- `src/services/gemini/chat.ts` — new `buildSystemPrompt` signature (2.1); drop
  `import ... industry-prompts`; import from `universal-prompt.js`; remove `Industry:` line and
  industry role/critical/booking/faq blocks; append `CAPABILITY_BLOCKS` for enabled capabilities.
- `src/routes/internal.ts` —
  - `GET /internal/tenants/by-phone/:phone`: call `buildSystemPrompt(agent_name, business_name,
    agent_personality, {..., capabilities})`. Fetch the tenant's enabled capabilities (query
    `tenant_capabilities WHERE tenant_id=$1 AND is_enabled=true`) and pass as `options.capabilities`.
    Keep returning `industry: tenant.industry` in the JSON (wire-frozen) but do NOT branch on it. ADD a
    new `capabilities: string[]` key to the response (additive; the agent needs it for gating).
  - `POST /internal/calls/log`: `runPostCallAutomation({...})` — remove the `industry` field from the
    payload (post-call no longer takes industry). Keep everything else identical. Keep `vapi_call_id`
    column write as-is.
- `src/services/automation/post-call.ts` — remove `industry` from `PostCallContext`; change
  `getPipelineConfig(ctx.industry)` → `getPipelineConfig()`; import from `universal-pipeline.js`.
- `src/services/deals/deal-service.ts` — import from `universal-pipeline.js`; `getPipeline(tenantId,
  industry)` → `getPipeline(tenantId)` (drop param, use `getStages()`); `createDeal(tenantId, input,
  industry="default")` → `createDeal(tenantId, input)` using `getPipelineConfig().defaultStage`.
- `src/routes/deals.ts` — delete `getTenantIndustry` helper and `getTenantById` import if now unused;
  drop `industry` from `getPipeline(...)`, `createDeal(...)`; stage-validation uses `getStages()`;
  import `getStages` from `universal-pipeline.js` (remove `getStagesForIndustry`). Error message: drop
  the `for industry "X"` phrasing.
- `src/routes/capabilities.ts` — replace `CAPABILITY_OPTIONS`/`DEFAULT_CAPABILITIES` with one
  `UNIVERSAL_CAPABILITY_OPTIONS` array (the 6 ids from 1.2). `GET /options/:industry` keeps its path
  (frozen) but ignores the param and returns the universal list.
- `src/routes/tenants.ts` — remove the `VALID_INDUSTRIES` allow-list check in `PUT /:id`; still allow an
  `industry` field to be written but do not validate/branch on it (leave column writable, null-safe). In
  `POST /` drop `industry` from the required-fields check; if absent default to `"general"` when
  inserting (keep the column in the INSERT so the SQL still matches the schema).
- `src/routes/setup.ts` — `PUT /step/:step` (`business` case) and `POST /complete`: stop REQUIRING
  `industry`. Business step: require only `business_name`; when inserting a new tenant, pass
  `body.industry ?? "general"` for the `industry` column (keep it in the INSERT column list). `complete`:
  drop the `!tenant.industry` guard (require only `business_name`). Keep the `industry` column in the
  SELECT lists (frozen queries).
- `src/routes/chat.ts` — `buildSystemPrompt(...)` call drops the `industry` arg; keep returning
  `industry: tenant.industry` in `GET /config/:tenant_id` (frozen shape), but do not branch on it.
- `src/services/gemini/tools.ts` — rewrite `executeCreateOrder` to the neutral 1.4 schema (`OR-` prefix,
  `request_summary`, `fulfillment_type`/`fulfillment_address`, `notes`); add capability gating: if the
  tenant does not have `order_taking` enabled, return `{ success:false, message:"..." }` without
  inserting. `executeTool` switch and `executeLogNote` unchanged (log_note already routed).
- `src/types/voice.ts` — update `CreateOrderArgs` to the neutral 1.4 fields; keep `CreateOrderResult`,
  `LogNoteArgs`, `LogNoteResult` as-is.

**DO NOT TOUCH (out of Phase-1 scope; dead-code purge is Phase 2):** `services/vapi/*`,
`services/deepgram/*`, `services/fallback/*`, `services/connections/*`, `src/test-calendar.ts`. These
reference `tenant.industry` but are dead and slated for removal in Phase 2 — leave them for that agent.
Do NOT rename `vapi_call_id`/`vapi_phone_number_id` anywhere.

### 3.2 soniq-dashboard

**DELETE (files):**
- `lib/industryPresets.ts`
- `context/IndustryContext.tsx`
- Route: `app/(dashboard)/workstation/page.tsx` (and remove the now-empty `workstation/` dir)
- `components/workstation/` (entire dir): `ActivityFeed.tsx`, `ContextPanel.tsx`, `index.ts`,
  `ProviderAvailability.tsx`, `QuickActions.tsx`, `RoomGrid.tsx`, `StatsSummary.tsx`, `TodayPanel.tsx`,
  `VIPAlerts.tsx`, `WaitingRoom.tsx`, `WorkstationView.tsx`
- `components/templates/` (entire dir): `index.ts`, `clinic/ClinicWorkstation.tsx`, `clinic/index.ts`,
  `hotel/HotelWorkstation.tsx`, `hotel/index.ts`
- `lib/templates/` (entire dir): `configs.ts`, `index.ts`, `types.ts` (only imported by deleted
  workstation components — verify no survivor imports before deleting)
- `components/setup/steps/details/` (entire dir — vertical detail steps): `AppointmentDetails.tsx`,
  `EmergencyDetails.tsx`, `FAQDetails.tsx`, `PatientIntakeDetails.tsx`, `ReservationDetails.tsx`
  (keep `PromotionDetails.tsx` — it is industry-neutral and still used by `DetailsStep`; move it up to
  `components/setup/steps/` or keep the dir with only that file).

**CREATE:**
- `lib/terminology.ts` (2.2)
- `lib/capabilities.ts` (2.2) — `UNIVERSAL_CAPABILITY_DEFS`, `getUniversalCapabilities`,
  `getDefaultCapabilities`, `getCapabilityById`
- (optional) `lib/defaults.ts` — if you prefer to relocate the `DEFAULT_*` consts out of terminology.ts

**EDIT:**
- `app/(dashboard)/layout.tsx` — remove `IndustryProvider` import + wrapper (keep the other providers
  and the `<Zap/>` loading mark untouched here; Zap→Soniq mark is Phase 2).
- All active `useIndustry()` consumers → `useTerminology()` from `@/lib/terminology`, keep destructured
  field names (they match). The complete list of ACTIVE consumers to edit:
  - `components/dashboard/MobileNav.tsx` (was `preset.navLabels?.calendarTab` → literal `"Calendar"`)
  - `components/dashboard/TopBar.tsx` (was `industryLabel` → `useTenant().currentTenant?.business_name ?? "Business"`)
  - `components/dashboard/Sidebar.tsx` (`dealPluralLabel`)
  - `components/dashboard/SystemHealth.tsx` (`transactionPluralLabel`, `revenueLabel`; `industryLabel` → business_name/"Business")
  - `components/crm/shared/EmptyState.tsx` (`customerPluralLabel`, `transactionPluralLabel`)
  - `components/crm/deals/DealForm.tsx` (`customerLabel`, `dealLabel`, `pipelineStages`)
  - `components/crm/deals/DealsPage.tsx` (`customerLabel`, `revenueLabel`, `dealLabel`, `dealPluralLabel`, `pipelineStages`)
  - `components/crm/calls/CallsPage.tsx` (`transactionLabel`, 2 sites)
  - `components/crm/calendar/CalendarPage.tsx` (`transactionLabel`, `transactionPluralLabel`, 2 sites)
  - `components/crm/calendar/BookingForm.tsx` (`transactionLabel`)
  - `components/crm/tasks/TasksPage.tsx` (`customerLabel`, `taskTypes`)
  - `components/crm/tasks/TaskForm.tsx` (`customerLabel`, `dealLabel`, `taskTypes`)
  - `components/crm/contacts/ContactsPage.tsx` (`customerLabel`, `customerPluralLabel`, `transactionPluralLabel`)
  - `components/crm/notifications/NotificationsPage.tsx` (`transactionLabel`, `transactionPluralLabel`)
  - `app/(dashboard)/pending/page.tsx` (`transactionLabel`, `transactionPluralLabel`)
- `context/ConfigContext.tsx` — drop `createDefaultConfig/getPreset/getTerminology/INDUSTRY_PRESETS`
  imports from `industryPresets`; import `createDefaultConfig` (no-arg) + `UNIVERSAL_TERMINOLOGY` from
  `lib/terminology`; `createDefaultConfig("hotel","developer")`/`createDefaultConfig(industry)` calls →
  `createDefaultConfig("developer")`/`createDefaultConfig()`. Provide `getPreset`/`getTerminology`/
  `industryPresets` context values as thin shims returning universal data (or drop them and update the 2
  consumers below). `generateDashboardMetrics(config.industry)` / `generateIndustryMetrics(...)` in
  `lib/mockData.ts` become industry-agnostic (ignore the arg or drop it).
- `lib/mockData.ts` — remove `INDUSTRY_PRESETS` import + `INDUSTRY_PRESETS[industry]` lookups; make
  metric generators return neutral mock data (no per-industry branching).
- `components/settings/GeneralTab.tsx` — remove the industry picker (categories/popular industries);
  drop `INDUSTRY_CATEGORIES`/`getPopularIndustries`/`industryPresets` usage. Show business name + fixed
  universal terminology instead.
- `components/settings/PricingTab.tsx` — `getTerminology(config.industry)` → `UNIVERSAL_TERMINOLOGY`.
- `app/(dashboard)/settings/business/page.tsx` — remove the industry-selection UI
  (`INDUSTRY_CATEGORIES`, `INDUSTRY_PRESETS`, `getPopularIndustries`); keep name/location fields.
- `app/(dashboard)/settings/capabilities/page.tsx` — replace `INDUSTRY_PRESETS[industry]` capability
  derivation with `getUniversalCapabilities()`.
- `components/setup/steps/BusinessStep.tsx` — remove the industry `SelectionCard` grid + `INDUSTRY_PRESETS`
  import. `canContinue` = name + city only. Do not send `industry` from the client (API defaults it).
- `components/setup/steps/CapabilitiesStep.tsx` — remove `INDUSTRY_PRESETS` + `INDUSTRY_CAPABILITIES`
  per-industry maps; present the flat 6 universal capabilities from `getUniversalCapabilities()`;
  recommended-set = `getDefaultCapabilities()`. Remove the industry-driven filtering `useEffect`s.
- `components/setup/steps/DetailsStep.tsx` — remove imports of the deleted vertical detail components
  (`ReservationDetails`, `AppointmentDetails`, `PatientIntakeDetails`, `EmergencyDetails`, `FAQDetails`);
  reduce `CAPABILITY_COMPONENTS`/`CAPABILITY_LABELS` to the neutral set (keep the always-shown
  `PromotionDetails` promotions section). If no neutral detail components remain, render only the
  promotions section + the existing empty-state.
- `components/setup/steps/ReviewStep.tsx` — remove `INDUSTRY_PRESETS[...]` lookup; show business name +
  universal labels; do not display an industry field.
- `components/setup/SetupContext.tsx` — `businessData.industry` is now optional/unused for gating: keep
  the field typed `string | null` (DB still has the column) but remove it from `canProceed()` business
  validation (name + city only). `getStepData("business")` may still send `industry` if present, else
  omit; the API defaults to `"general"`. `ApiProgressResponse.data.industry` stays (frozen wire).
- `components/dashboard/Sidebar.tsx` + `components/dashboard/MobileNav.tsx` — remove the "Workstation"
  nav entry entirely (see section 5).
- `components/demo/SoniqWidget.tsx` — the string match `lowerMessage.includes("workstation")` (line ~123)
  is a demo keyword only; remove that branch so the demo does not advertise a removed route.
- `lib/api/deals.ts`, `lib/api/tasks.ts` — comment-only references to `industryPresets`; update the
  comments to say "universal pipeline/task types" (no code change).

**DO NOT TOUCH in Phase 1 (Phase 2 dead-code):** `components/shell/*` (AppShell, Sidebar, TopBar,
CommandPalette) — verified NOT imported by any active route (`app/`), so they are already dead. They
reference the old `useIndustry`; leave them for the Phase-2 dead-code removal agent. If `npm run build`
fails because these are still type-checked, the minimal fix is to DELETE the `components/shell/` dir now
(it has zero active importers) rather than porting it.

### 3.3 soniq-agent

**DELETE:** none.

**EDIT:**
- `agent.py` — import `create_order, log_note` from `tools` (keep the others); build `tools=[...]`
  conditionally (always `check_availability, create_booking, transfer_to_human, end_call, log_note`;
  add `create_order` iff `order_taking` in `tenant_config.get("capabilities", [])`). Nothing else
  changes (voice pipeline, watchdog, logging untouched).
- `tools.py` — `create_order` signature → neutral 1.4 (`customer_name, request_summary, fulfillment_type,
  customer_phone="", fulfillment_address="", notes=""`); forward JSON keys matching 1.4. Update the
  docstring to be domain-neutral ("Place an order or log a caller request", not "Place a food order").
  `log_note` already correct.
- `tenant_config.py` / `api_client.py` — no change (they pass the `/internal` JSON straight through; the
  new `capabilities` key rides along automatically in the returned dict).

---

## 4. WIRE INVARIANTS (must not break)

### 4.1 `GET /internal/tenants/by-phone/:phone` response — keep ALL these keys, same types:
`id, business_name, industry, agent_name, phone_number, voice_config, agent_personality,
greeting_standard, greeting_after_hours, greeting_returning, timezone, operating_hours,
escalation_enabled, escalation_phone, escalation_triggers, features, voice_pipeline,
max_call_duration_seconds, system_prompt`.
- `industry` STAYS in the payload (may be `"general"`); do not branch on it.
- **ADD** one new key: `capabilities: string[]` (enabled capability ids). Additive only.
- The Python agent consumes `id, business_name, voice_config.voice_id, escalation_phone,
  max_call_duration_seconds, greeting_standard, system_prompt` and now `capabilities` — all present.

### 4.2 `POST /internal/voice-tools/:action` — request/response unchanged
(`{tenant_id, call_sid, caller_phone, escalation_phone, args}` → `{result}` or `{error}`). The neutral
`create_order` args travel inside `args`; the executor reads the new field names.

### 4.3 `POST /internal/calls/log` — unchanged request keys; still writes DB column `vapi_call_id` from
`call_sid`. Only internal change: drop `industry` from the `runPostCallAutomation(...)` call args.

### 4.4 Tenant config columns the setup wizard writes (keep writing these exact columns, schema frozen):
- `business` step: `business_name`, `industry` (default `"general"` when omitted — do NOT remove the
  column from the INSERT/UPDATE), `location_city`, `location_address`, `setup_step`, `status`.
- `capabilities` step: rows in `tenant_capabilities (tenant_id, capability, config, is_enabled)` — now
  using the 6 universal ids. Delete-then-insert transaction unchanged.
- `assistant` step: `agent_name`, `agent_personality` (JSONB), `voice_config` (JSONB),
  `greeting_standard`, `greeting_after_hours`, `greeting_returning`.
- `hours`: `timezone`, `operating_hours` (JSONB), `after_hours_behavior`.
- `escalation`: `escalation_enabled`, `escalation_phone`, `escalation_triggers`, `transfer_behavior`,
  plus `escalation_contacts` rows.
- `complete`: `status="active"`, `setup_completed=true`, `setup_completed_at`, `is_active=true`,
  `phone_number` (from `phone_configurations`).

---

## 5. DASHBOARD `/workstation` REMOVAL PLAN (no 404s, no broken imports)

1. **Route:** delete `app/(dashboard)/workstation/page.tsx` and its dir. There is no other file that
   `import`s this page, so Next.js simply stops serving `/workstation`.
2. **Nav entries (remove all links so nothing points at the dead route):**
   - `components/dashboard/Sidebar.tsx`: remove the `{ id: "workstation", label: "Workstation", icon:
     Headphones }` nav item (line ~70) and the `workstation` entries in the union type (line ~31, ~54)
     and the `workstation: "/workstation"` href map (line ~35). Remove the now-unused `Headphones`
     import if nothing else uses it.
   - `components/dashboard/MobileNav.tsx`: remove the `workstation` nav object (`id/href/icon` at
     lines ~28-31) and its icon import if unused.
   - `components/shell/Sidebar.tsx`: contains a `Workstation` link too, but `components/shell/*` is dead
     (no active importer). Either leave it (Phase 2 deletes the dir) or delete the `components/shell/`
     dir now if the build type-checks it. Do not wire it to anything.
3. **Component dirs:** delete `components/workstation/` and `components/templates/` entirely (section 3.2).
   Verify no survivor imports with:
   `grep -rn "components/workstation\|components/templates\|lib/templates" app components --include="*.tsx" --include="*.ts"`
   → must return only files already being deleted. `lib/templates/*` is only imported by
   `components/workstation/WorkstationView.tsx` + `QuickActions.tsx` (both deleted), so delete `lib/templates/` too.
4. **Context:** `WorkstationView`, `StatsSummary`, `TodayPanel`, `WaitingRoom`, the two `*Workstation`
   templates are the ONLY active `useIndustry()` consumers that read `industry`/`preset`/`tenant`. Since
   they are deleted, no survivor needs those removed context fields — the `useTerminology()` replacement
   (labels + pipeline + tasks only) covers every remaining consumer.
5. **Demo:** remove the `"workstation"` keyword branch in `components/demo/SoniqWidget.tsx` so the demo
   assistant no longer references the removed page.
6. After edits, confirm: `grep -rn "workstation" app components --include="*.tsx" --include="*.ts"`
   returns nothing (case-insensitive) except intentional unrelated matches; then run `npm run build` +
   `npm run lint`.

---

## 6. Suggested execution order per agent (each independently shippable)

- **api:** create `universal-prompt.ts` + `universal-pipeline.ts` → rewrite `buildSystemPrompt` →
  update `deal-service`, `deals`, `post-call`, `capabilities`, `tenants`, `setup`, `chat`, `internal`,
  `gemini/tools`, `types/voice` → delete the two industry config files → `npm run typecheck`.
- **dashboard:** create `lib/terminology.ts` + `lib/capabilities.ts` → swap all `useIndustry`→
  `useTerminology` consumers → rework `ConfigContext`/`mockData`/settings/setup steps → delete
  `industryPresets.ts`, `IndustryContext.tsx`, workstation/templates/lib-templates/detail-steps + route
  → remove nav entries → `npm run build && npm run lint`.
- **agent:** neutralize `tools.py:create_order` → conditional tool list + wire `log_note` in `agent.py`
  → `python -m py_compile ...`.

Cross-service consistency check before declaring done: the capability id `order_taking` and the neutral
`create_order` field names (`request_summary`, `fulfillment_type`, `fulfillment_address`, `notes`) must
be byte-identical in the agent tool call, `CreateOrderArgs`, and `executeCreateOrder`.
