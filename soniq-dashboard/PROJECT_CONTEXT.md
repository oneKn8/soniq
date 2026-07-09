# Soniq - Project Context

## Overview

White-label SaaS dashboard for AI voice agents. "Universal Enterprise" theme (Deep Zinc #09090b, not OLED black) that works on any monitor.

Soniq ships a single **universal agent**. There is no per-industry agent catalog: every tenant runs the same flat capability set, and `industry` is a free-form label used for terminology and context only, not a preset selector.

## Three-Tier Access System

| Role          | Who                             | Access                                                                                                 |
| ------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Developer** | Platform developers (us)        | Full system access - infrastructure, all customers, pricing, voice providers, integrations             |
| **Admin**     | Business owners (our customers) | Business configuration - agent settings, voice selection, hours, escalation, billing, staff management |
| **Staff**     | Business employees              | Monitoring only - view dashboard, calls, analytics, take over calls when agent fails                   |

## Universal Capabilities

Defined once in `lib/capabilities.ts` as `UNIVERSAL_CAPABILITY_DEFS`. Every tenant shares the same set; there is no per-industry capability menu.

| Capability            | Notes                                        |
| --------------------- | -------------------------------------------- |
| `appointment_booking` | Schedule, reschedule, cancel                 |
| `order_taking`        | OFF by default                               |
| `faq`                 | Answer common questions                      |
| `call_transfer`       | Route to a human                             |
| `voicemail`           | Capture messages                             |
| `callbacks`           | Offer/queue callbacks                        |

## Key Files

| File                            | Purpose                                                                    |
| ------------------------------- | -------------------------------------------------------------------------- |
| `types/index.ts`                | Full type system: 3-tier roles, permissions, billing types                 |
| `lib/capabilities.ts`           | Universal (flat) capability definitions shared by every tenant             |
| `lib/terminology.ts`            | Universal terminology and defaults (e.g. deal/contact labels)              |
| `lib/mockData.ts`               | Real-time simulation data generators                                       |
| `context/ConfigContext.tsx`     | State management with `hasPermission()`, `setUserRole()`                    |
| `components/setup/`             | Multi-step onboarding wizard (see below)                                    |
| `components/settings/index.tsx` | Role-based tab visibility with tier checks                                 |

## Onboarding (Setup Wizard)

Route: `app/setup/[step]/page.tsx`. State lives in `components/setup/SetupContext.tsx`; progress UI in `SetupProgressBar.tsx` and `SelectionCard.tsx`.

Steps (`components/setup/steps/`): Business, Details, Assistant, Capabilities, Hours, Phone, Escalation, Integrations, Review.

## Settings Tabs

Tabs are declared in `components/settings/index.tsx` (`ALL_TABS`) and filtered by access tier plus permission. Some tabs open standalone pages under `app/(dashboard)/settings/*` via an `href`.

**Business:** General, Business Info, Hours, Phone, Billing

**Agent:** Agent, Assistant, Voice, Capabilities, Greetings, Responses, Escalation, Promotions, Instructions

**Platform:** Pricing (developer), Integrations, Advanced (developer)

**Staff:** No settings access (monitoring view only)

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Lucide React icons
- React Context + localStorage (with Supabase auth/data)
- TypeScript

## Component Structure

```
components/
  setup/                   # Onboarding wizard (SetupContext, steps/, progress UI)
  dashboard/
    index.tsx              # Dashboard exports
    Sidebar.tsx            # Navigation sidebar (brand mark via SoniqMark)
    TopBar.tsx             # Top navigation bar
    MobileNav.tsx          # Mobile navigation
    SystemHealth.tsx       # System status panel
    Waveform.tsx           # Audio visualization
    ActivityLog.tsx        # Real-time logs
    SetupIncompleteBanner.tsx
  settings/
    index.tsx              # Settings panel with tier-based tabs
    GeneralTab.tsx         # Business identity (admin)
    AgentTab.tsx           # Agent personality (admin)
    VoiceTab.tsx           # Voice configuration (admin + developer provider controls)
    VoicePreview.tsx       # Voice preview
    GreetingsTab.tsx       # Custom greetings (admin)
    ResponsesTab.tsx       # Custom AI responses (admin)
    InstructionsTab.tsx    # Custom AI instructions (admin)
    HoursTab.tsx           # Operating hours (admin)
    EscalationTab.tsx      # Call transfer rules (admin)
    BillingTab.tsx         # Payment & subscription (admin)
    PricingTab.tsx         # Rate configuration (developer)
    IntegrationsTab.tsx    # Third-party services
  brand/                   # SoniqMark, SoniqWordmark
  crm/ escalation/ landing/ auth/ demo/ profile/ ...
```

## Key Context Functions

```typescript
// From useConfig()
hasPermission(permission: Permission): boolean
setUserRole(role: UserRole): void  // 'developer' | 'admin' | 'staff'
getUserPermissions(): Permission[]
switchIndustry(industry: IndustryType): void  // industry is a free-form string label
updateConfig<K>(key: K, value: AppConfig[K]): void
```

## Permissions

**Staff Permissions (monitoring):**

- view_dashboard, view_analytics, view_calls
- view_agent_status, takeover_call

**Admin Permissions (business owner):**

- All staff permissions plus:
- manage_agent, manage_voice, manage_hours
- manage_escalation, manage_greetings, manage_responses
- manage_billing, manage_staff

**Developer Permissions (platform):**

- All admin permissions plus:
- view_pricing, manage_pricing
- switch_industry
- view_integrations, manage_integrations
- view_all_customers
- manage_voice_providers, manage_infrastructure
- view_system_logs
