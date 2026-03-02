// Soniq Core - Production Type System
// Voice Logic Engine Schema

// ============================================================================
// ACCESS CONTROL
// ============================================================================
// Three-tier access system:
// - developer: Platform developers with full system access
// - admin: Business owners who configure their agent and workflow
// - staff: Business employees who monitor and can take over calls

export type UserRole = "developer" | "admin" | "staff";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  businessId?: string; // Which business this user belongs to
  subscriptionTier?: SubscriptionTier;
  permissions: Permission[];
}

export type Permission =
  // Staff permissions (monitoring & basic operations)
  | "view_dashboard"
  | "view_analytics"
  | "view_calls"
  | "view_agent_status"
  | "takeover_call"
  // Admin permissions (business owner controls)
  | "manage_agent"
  | "manage_voice"
  | "manage_hours"
  | "manage_escalation"
  | "manage_greetings"
  | "manage_responses"
  | "manage_billing"
  | "manage_staff"
  // Developer permissions (platform-level)
  | "view_pricing"
  | "manage_pricing"
  | "switch_industry"
  | "view_integrations"
  | "manage_integrations"
  | "view_all_customers"
  | "manage_voice_providers"
  | "manage_infrastructure"
  | "view_system_logs";

// Staff: Monitor agent, view calls, take over when needed
export const STAFF_PERMISSIONS: Permission[] = [
  "view_dashboard",
  "view_analytics",
  "view_calls",
  "view_agent_status",
  "takeover_call",
];

// Admin (Business Owner): Configure their agent and business workflow
export const ADMIN_PERMISSIONS: Permission[] = [
  ...STAFF_PERMISSIONS,
  "manage_agent",
  "manage_voice",
  "manage_hours",
  "manage_escalation",
  "manage_greetings",
  "manage_responses",
  "manage_billing",
  "manage_staff",
];

// Developer: Full platform access
export const DEVELOPER_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  "view_pricing",
  "manage_pricing",
  "switch_industry",
  "view_integrations",
  "manage_integrations",
  "view_all_customers",
  "manage_voice_providers",
  "manage_infrastructure",
  "view_system_logs",
];

// Legacy export for backward compatibility during migration
export const CUSTOMER_PERMISSIONS = STAFF_PERMISSIONS;

// ============================================================================
// SUBSCRIPTION & BILLING
// ============================================================================

export type SubscriptionTier = "starter" | "professional" | "enterprise";

export interface Subscription {
  id: string;
  tier: SubscriptionTier;
  status: "active" | "past_due" | "canceled" | "trialing";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
}

export interface BillingInfo {
  customerId: string;
  paymentMethodId?: string;
  paymentMethodLast4?: string;
  paymentMethodBrand?: string;
  billingEmail: string;
  billingAddress?: BillingAddress;
  autoPayEnabled: boolean;
  invoices: Invoice[];
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "open" | "void" | "uncollectible";
  createdAt: string;
  paidAt?: string;
  pdfUrl?: string;
}

// ============================================================================
// INDUSTRY CONFIGURATION
// ============================================================================

export type IndustryType =
  // Hospitality
  | "hotel"
  | "motel"
  | "restaurant"
  // Healthcare
  | "medical"
  | "dental"
  // Personal Care
  | "salon"
  // Automotive
  | "auto_service";

export type IndustryCategory =
  | "hospitality"
  | "healthcare"
  | "personal_care"
  | "automotive";

export interface CapabilityQuestion {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "multiselect" | "toggle" | "textarea";
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  helperText?: string;
}

export interface CapabilityDefinition {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: "core" | "communication" | "advanced";
  questions: CapabilityQuestion[];
}

export interface IndustryPreset {
  id: IndustryType;
  category: IndustryCategory;
  label: string;
  description: string;
  icon: string;
  popular: boolean; // Show in quick-select
  metrics: MetricDefinition[];
  intents: IntentDefinition[];
  defaultPricing: PricingConfig;
  terminology: IndustryTerminology;
  greetingTemplates: string[];
  faqTemplates: FAQTemplate[];
  // Capability configuration (optional for backward compatibility)
  availableCapabilities?: string[];
  defaultCapabilities?: string[];
  capabilities?: CapabilityDefinition[];
  // Short labels for mobile navigation tabs
  navLabels?: { calendarTab: string };
  // CRM pipeline configuration
  pipeline: PipelineConfig;
  taskTypes: IndustryTaskType[];
}

export interface IndustryTerminology {
  transaction: string;
  transactionPlural: string;
  customer: string;
  customerPlural: string;
  availability: string;
  revenue: string;
  deal: string;
  dealPlural: string;
}

export interface PipelineStageConfig {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  isTerminal: boolean;
}

export interface PipelineConfig {
  stages: PipelineStageConfig[];
  defaultStage: string;
  completedStage: string;
  cancelledStage: string;
}

export interface IndustryTaskType {
  value: string;
  label: string;
}

export interface FAQTemplate {
  question: string;
  answer: string;
  category: string;
}

// ============================================================================
// APP CONFIGURATION
// ============================================================================

export interface AppConfig {
  // Identity
  industry: IndustryType;
  businessName: string;
  agentName: string;
  agentVoice: VoiceConfig;
  agentPersonality: AgentPersonality;

  // Branding
  themeColor: ThemeColor;
  logoUrl?: string;

  // Pricing (Admin controlled - hidden from customers)
  pricing: PricingConfig;

  // Operational Settings
  operatingHours: OperatingHours;
  lateNightMode: LateNightConfig;
  escalation: EscalationConfig;

  // Agent Customization (Customer accessible)
  greetings: GreetingConfig;
  responses: CustomResponses;
  faqs: FAQ[];

  // Feature Flags
  features: FeatureFlags;

  // Billing (Customer accessible)
  billing?: BillingInfo;
  subscription?: Subscription;

  // Access Control
  userRole: UserRole;

  // System
  isConfigured: boolean;
  configuredAt?: string;
  lastModified?: string;
}

export interface AgentPersonality {
  tone: "professional" | "friendly" | "casual" | "formal";
  verbosity: "concise" | "balanced" | "detailed";
  empathy: "low" | "medium" | "high";
  humor: boolean;
}

export interface GreetingConfig {
  standard: string;
  afterHours: string;
  holiday: string;
  busy: string;
  returning: string; // For recognized callers
}

export interface CustomResponses {
  notAvailable: string;
  transferring: string;
  bookingConfirmed: string;
  bookingFailed: string;
  goodbye: string;
  holdMessage: string;
  fallback: string; // When AI doesn't understand
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  enabled: boolean;
  priority: number;
}

export type ThemeColor =
  | "zinc"
  | "indigo"
  | "emerald"
  | "blue"
  | "violet"
  | "amber"
  | "rose";

export interface VoiceConfig {
  provider: "openai" | "elevenlabs" | "cartesia";
  voiceId: string;
  voiceName: string;
  speakingRate: number;
  pitch: number;
  language: string;
  accent?: string;
}

export interface PricingConfig {
  baseRate: number;
  currency: string;
  taxRate: number;
  fees: FeeConfig[];
  rateModifiers?: RateModifier[];
}

export interface FeeConfig {
  id: string;
  label: string;
  amount: number;
  type: "fixed" | "percentage";
  conditional?: string;
}

export interface RateModifier {
  id: string;
  label: string;
  multiplier: number;
  conditions: string[];
}

export interface OperatingHours {
  timezone: string;
  schedule: DaySchedule[];
  holidays: string[];
}

export interface DaySchedule {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  enabled: boolean;
  openTime: string;
  closeTime: string;
}

export interface LateNightConfig {
  enabled: boolean;
  startTime: string;
  endTime: string;
  behavior: "full_service" | "limited" | "message_only";
  limitedIntents?: string[];
}

export interface EscalationConfig {
  enabled: boolean;
  triggers: EscalationTrigger[];
  fallbackPhone?: string;
  fallbackEmail?: string;
  notifyOnEscalation: boolean;
  maxWaitTime: number; // seconds before auto-escalate
}

export interface EscalationTrigger {
  id: string;
  condition: string;
  action: "transfer" | "message" | "email" | "sms";
  priority: "low" | "medium" | "high" | "critical";
}

export interface FeatureFlags {
  smsConfirmations: boolean;
  emailNotifications: boolean;
  liveTransfer: boolean;
  voicemailFallback: boolean;
  sentimentAnalysis: boolean;
  recordingEnabled: boolean;
  transcriptionEnabled: boolean;
  callerIdLookup: boolean;
  multiLanguage: boolean;
}

// ============================================================================
// METRICS & ANALYTICS
// ============================================================================

export interface MetricDefinition {
  id: string;
  label: string;
  shortLabel: string;
  unit?: string;
  format: "number" | "currency" | "percentage" | "duration" | "time";
  thresholds?: MetricThresholds;
}

export interface MetricThresholds {
  warning: number;
  critical: number;
  direction: "above" | "below";
}

export interface MetricValue {
  id: string;
  value: number;
  previousValue?: number;
  trend?: "up" | "down" | "stable";
  status: "nominal" | "warning" | "critical";
  timestamp: string;
}

export interface DashboardMetrics {
  system: SystemMetrics;
  business: BusinessMetrics;
  calls: CallMetrics;
}

export interface SystemMetrics {
  status: "online" | "degraded" | "offline";
  latency: number;
  uptime: number;
  activeCalls: number;
  queuedCalls: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

export interface BusinessMetrics {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  transactionsToday: number;
  transactionsWeek: number;
  conversionRate: number;
  avgTransactionValue: number;
  missedOpportunities: number;
}

export interface CallMetrics {
  totalToday: number;
  totalWeek: number;
  avgDuration: number;
  avgWaitTime: number;
  abandonRate: number;
  satisfactionScore?: number;
}

// ============================================================================
// CALL & SESSION MANAGEMENT
// ============================================================================

export interface CallSession {
  id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: CallStatus;
  callerPhone?: string;
  callerName?: string;
  intentsDetected: DetectedIntent[];
  sentimentScore?: number;
  outcome?: CallOutcome;
  revenue?: number;
  recordingUrl?: string;
  transcriptId?: string;
}

export type CallStatus =
  | "ringing"
  | "connected"
  | "processing"
  | "ai_speaking"
  | "user_speaking"
  | "on_hold"
  | "transferring"
  | "completed"
  | "failed"
  | "abandoned";

export interface CallOutcome {
  type:
    | "booking"
    | "appointment"
    | "inquiry"
    | "support"
    | "escalation"
    | "hangup";
  success: boolean;
  details?: Record<string, unknown>;
}

export interface DetectedIntent {
  id: string;
  name: string;
  confidence: number;
  timestamp: string;
  parameters?: Record<string, unknown>;
}

export interface IntentDefinition {
  id: string;
  name: string;
  description: string;
  examples: string[];
  action: "book" | "inquire" | "transfer" | "message" | "custom";
  requiresConfirmation: boolean;
}

// ============================================================================
// ACTIVITY LOG
// ============================================================================

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  metadata?: Record<string, unknown>;
  callId?: string;
}

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";

export type LogCategory =
  | "SYSTEM"
  | "CALL"
  | "INTENT"
  | "BOOKING"
  | "PAYMENT"
  | "TRANSFER"
  | "ERROR"
  | "SECURITY";

// ============================================================================
// UI STATE
// ============================================================================

export type ViewType =
  | "dashboard"
  | "calls"
  | "analytics"
  | "settings"
  // CRM views
  | "contacts"
  | "calendar"
  | "notifications"
  | "resources"
  | "deals"
  | "tasks";

export type SettingsTab =
  | "general"
  | "business"
  | "agent"
  | "assistant"
  | "voice"
  | "greetings"
  | "responses"
  | "instructions"
  | "hours"
  | "escalation"
  | "billing"
  | "phone"
  | "capabilities"
  | "promotions"
  // Admin only tabs
  | "pricing"
  | "integrations"
  | "advanced";

export const CUSTOMER_SETTINGS_TABS: SettingsTab[] = [
  "general",
  "agent",
  "voice",
  "greetings",
  "responses",
  "instructions",
  "hours",
  "escalation",
  "billing",
];

export const ADMIN_SETTINGS_TABS: SettingsTab[] = [
  ...CUSTOMER_SETTINGS_TABS,
  "pricing",
  "integrations",
  "advanced",
];

export interface UIState {
  currentView: ViewType;
  settingsTab: SettingsTab;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
}

// ============================================================================
// WAVEFORM VISUALIZATION
// ============================================================================

export type SpeakerState = "idle" | "user" | "ai" | "processing" | "ringing";

export interface WaveformConfig {
  userColor: string;
  aiColor: string;
  idleColor: string;
  processingColor: string;
  sensitivity: number;
  smoothing: number;
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

export interface DashboardMetric {
  label: string;
  value: string | number;
  icon: string;
  trend: string;
}

// ============================================================================
// SETUP WIZARD TYPES
// ============================================================================

export type SetupStep =
  | "business"
  | "capabilities"
  | "details"
  | "integrations"
  | "assistant"
  | "phone"
  | "hours"
  | "escalation"
  | "review";

export type TenantStatus = "draft" | "active" | "suspended";

export type PhoneSetupType = "new" | "port" | "forward" | "sip";

export type PhoneStatus =
  | "pending"
  | "active"
  | "porting"
  | "porting_with_temp"
  | "failed";

export type PortStatus =
  | "draft"
  | "submitted"
  | "pending"
  | "approved"
  | "rejected"
  | "completed";

export type IntegrationStatus = "active" | "expired" | "revoked" | "error";

export type IntegrationProvider =
  | "google_calendar"
  | "outlook"
  | "calendly"
  | "acuity"
  | "square"
  | "vagaro"
  | "mindbody"
  | "toast"
  | "opentable";

export type MentionBehavior = "always" | "relevant" | "interested";

export type ContactAvailability = "business_hours" | "always" | "custom";

export type TransferType = "warm" | "cold" | "callback";

export type NoAnswerBehavior =
  | "next_contact"
  | "message"
  | "retry"
  | "voicemail";

export type BookingStatus = "pending" | "confirmed" | "rejected" | "cancelled";

export interface TenantCapability {
  id: string;
  tenant_id: string;
  capability: string;
  config: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
}

export interface TenantIntegration {
  id: string;
  tenant_id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  external_account_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantPromotion {
  id: string;
  tenant_id: string;
  offer_text: string;
  mention_behavior: MentionBehavior;
  is_active: boolean;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
}

export interface PhoneConfiguration {
  id: string;
  tenant_id: string;
  phone_number?: string;
  setup_type: PhoneSetupType;
  provider: string;
  provider_sid?: string;
  status: PhoneStatus;
  port_request_id?: string;
  a2p_brand_id?: string;
  a2p_campaign_id?: string;
  verified_at?: string;
  created_at: string;
}

export interface PortRequest {
  id: string;
  tenant_id: string;
  phone_number: string;
  current_carrier: string;
  authorized_name: string;
  status: PortStatus;
  loa_signed_at?: string;
  rejection_reason?: string;
  estimated_completion?: string;
  submitted_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface EscalationContact {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  role?: string;
  is_primary: boolean;
  availability: ContactAvailability;
  availability_hours?: Record<string, unknown>;
  sort_order: number;
  created_at: string;
}

export interface PendingBooking {
  id: string;
  tenant_id: string;
  call_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  requested_date?: string;
  requested_time?: string;
  service?: string;
  notes?: string;
  status: BookingStatus;
  confirmed_by?: string;
  confirmed_at?: string;
  created_at: string;
}

export interface CapabilityOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: "core" | "communication" | "advanced";
  requiresIntegration?: boolean;
}

export interface TransferBehavior {
  type: TransferType;
  no_answer: NoAnswerBehavior;
}

// Extended Tenant type with new setup wizard fields
export interface TenantExtended {
  id: string;
  created_at: string;
  updated_at: string;
  business_name: string;
  industry: IndustryType;
  phone_number: string;
  agent_name: string;
  agent_personality: AgentPersonality;
  voice_config: VoiceConfig;
  greeting_standard: string;
  greeting_after_hours?: string;
  greeting_returning?: string;
  timezone: string;
  operating_hours: OperatingHours;
  escalation_enabled: boolean;
  escalation_phone?: string;
  escalation_triggers: string[];
  features: FeatureFlags;
  is_active: boolean;
  subscription_tier: SubscriptionTier;
  // New setup wizard fields
  setup_step?: SetupStep;
  setup_completed_at?: string;
  status: TenantStatus;
  location_city?: string;
  location_address?: string;
  assisted_mode: boolean;
  after_hours_behavior?: string;
  transfer_behavior?: TransferBehavior;
}
