# Soniq Core - Project Context

## Overview

White-label SaaS dashboard for AI voice agents. "Universal Enterprise" theme (Deep Zinc #09090b, not OLED black) that works on any monitor.

## Three-Tier Access System

| Role          | Who                             | Access                                                                                                 |
| ------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Developer** | Platform developers (us)        | Full system access - infrastructure, all customers, pricing, voice providers, integrations             |
| **Admin**     | Business owners (our customers) | Business configuration - agent settings, voice selection, hours, escalation, billing, staff management |
| **Staff**     | Business employees              | Monitoring only - view dashboard, calls, analytics, take over calls when agent fails                   |

## Key Files

| File                            | Purpose                                                                   |
| ------------------------------- | ------------------------------------------------------------------------- |
| `types/index.ts`                | Full type system: 3-tier roles, permissions, 27 industries, billing types |
| `lib/industryPresets.ts`        | 27 industry configs across 6 categories                                   |
| `lib/mockData.ts`               | Real-time simulation data generators                                      |
| `context/ConfigContext.tsx`     | State management with `hasPermission()`, `setUserRole()`                  |
| `components/SetupWizard.tsx`    | 3-step onboarding with industry selection                                 |
| `components/settings/index.tsx` | Role-based tab visibility with tier checks                                |

## Settings Tabs

**Admin Tabs:** General, Agent, Voice, Greetings, Responses, Hours, Escalation, Billing

**Developer Only Tabs:** Pricing, Integrations, Advanced

**Staff:** No settings access (monitoring view only)

## Industries (27 total)

| Category      | Industries                                                                            |
| ------------- | ------------------------------------------------------------------------------------- |
| Hospitality   | hotel, motel, vacation_rental, restaurant, catering                                   |
| Healthcare    | medical, dental, veterinary, mental_health, chiropractic                              |
| Automotive    | auto_dealer, auto_service, car_rental, towing                                         |
| Professional  | legal, accounting, insurance, consulting                                              |
| Personal Care | salon, spa, barbershop, fitness                                                       |
| Property      | real_estate, property_management, home_services, hvac, plumbing, electrical, cleaning |

## SOW Reference Prices

- Hotel King Room: $139/night
- Pet Fee: $25/night
- Cleaning: $120 base / $180 deep
- Target: 47 bookings

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Lucide React icons
- React Context + localStorage
- TypeScript

## Component Structure

```
components/
  SetupWizard.tsx          # Onboarding wizard
  dashboard/
    index.tsx              # Dashboard exports
    Sidebar.tsx            # Navigation sidebar
    TopBar.tsx             # Top navigation bar
    SystemHealth.tsx       # System status panel
    Waveform.tsx           # Audio visualization
    ActivityLog.tsx        # Real-time logs
  settings/
    index.tsx              # Settings panel with tier-based tabs
    GeneralTab.tsx         # Business identity (admin)
    AgentTab.tsx           # Agent personality (admin)
    VoiceTab.tsx           # Voice configuration (admin + developer provider controls)
    GreetingsTab.tsx       # Custom greetings (admin)
    ResponsesTab.tsx       # Custom AI responses (admin)
    HoursTab.tsx           # Operating hours (admin)
    EscalationTab.tsx      # Call transfer rules (admin)
    BillingTab.tsx         # Payment & subscription (admin)
    PricingTab.tsx         # Rate configuration (developer)
    IntegrationsTab.tsx    # Third-party services (developer)
```

## Key Context Functions

```typescript
// From useConfig()
hasPermission(permission: Permission): boolean
setUserRole(role: UserRole): void  // 'developer' | 'admin' | 'staff'
getUserPermissions(): Permission[]
switchIndustry(industry: IndustryType): void
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
