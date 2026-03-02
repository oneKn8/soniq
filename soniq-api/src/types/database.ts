// Database Types for Supabase

export interface Tenant {
  id: string;
  created_at: string;
  updated_at: string;

  // Identity
  business_name: string;
  industry: string;
  phone_number: string; // SignalWire phone number assigned to this tenant
  vapi_phone_number_id?: string; // Vapi phone number ID for direct webhook lookup

  // Agent configuration
  agent_name: string;
  agent_personality: AgentPersonality;
  voice_config: VoiceConfig;

  // Greetings
  greeting_standard: string;
  greeting_after_hours: string;
  greeting_returning: string;

  // Operating hours
  timezone: string;
  operating_hours: OperatingHours;

  // Escalation
  escalation_enabled: boolean;
  escalation_phone?: string;
  escalation_triggers: string[];

  // Feature flags
  features: FeatureFlags;

  // Voice pipeline routing
  voice_pipeline: "custom" | "livekit";

  // Status
  is_active: boolean;
  subscription_tier: "starter" | "professional" | "enterprise";
}

export interface AgentPersonality {
  tone: "professional" | "friendly" | "casual" | "formal";
  verbosity: "concise" | "balanced" | "detailed";
  empathy: "low" | "medium" | "high";
  humor: boolean;
}

export interface VoiceConfig {
  provider: "cartesia" | "openai" | "elevenlabs";
  voice_id: string;
  voice_name: string;
  speaking_rate: number;
  pitch: number;
}

export interface OperatingHours {
  schedule: DaySchedule[];
  holidays: string[];
}

export interface DaySchedule {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  enabled: boolean;
  open_time: string;
  close_time: string;
}

export interface FeatureFlags {
  sms_confirmations: boolean;
  email_notifications: boolean;
  live_transfer: boolean;
  voicemail_fallback: boolean;
  sentiment_analysis: boolean;
  recording_enabled: boolean;
  transcription_enabled: boolean;
}

export interface Call {
  id: string;
  created_at: string;
  updated_at: string;

  // References
  tenant_id: string;
  vapi_call_id: string; // Actually SignalWire call SID (legacy column name)
  contact_id?: string; // CRM contact reference

  // Call details
  caller_phone?: string;
  caller_name?: string;
  direction: "inbound" | "outbound";
  status: "ringing" | "connected" | "completed" | "failed" | "missed";

  // Timing
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;

  // Outcome
  ended_reason?: string;
  outcome_type?: "booking" | "inquiry" | "support" | "escalation" | "hangup";
  outcome_success?: boolean;

  // AI analysis
  transcript?: string;
  summary?: string;
  sentiment_score?: number;
  intents_detected?: string[];

  // Recording
  recording_url?: string;

  // Cost tracking
  cost_cents?: number;
}

export interface Booking {
  id: string;
  created_at: string;
  updated_at: string;

  // References
  tenant_id: string;
  call_id?: string;
  contact_id?: string; // CRM contact reference
  resource_id?: string; // CRM resource reference
  slot_id?: string; // Availability slot reference

  // Customer
  customer_name: string;
  customer_phone: string;
  customer_email?: string;

  // Booking details
  booking_type: string;
  booking_date: string;
  booking_time: string;
  duration_minutes?: number;
  notes?: string;

  // Status
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  confirmation_code: string;

  // Pricing
  amount_cents?: number;

  // Reminders
  reminder_sent: boolean;
  reminder_sent_at?: string;

  // CRM fields
  source?: "call" | "web" | "manual" | "api";
  rescheduled_from?: string;
  rescheduled_count?: number;
}

export interface CallbackQueue {
  id: string;
  created_at: string;

  // References
  tenant_id: string;
  original_call_id?: string;
  contact_id?: string; // CRM contact reference

  // Callback details
  phone_number: string;
  reason: string;
  priority: "low" | "medium" | "high";

  // Status
  status: "pending" | "in_progress" | "completed" | "failed";
  attempts: number;
  last_attempt_at?: string;
  completed_at?: string;
  notes?: string;
}

export interface SmsMessage {
  id: string;
  created_at: string;

  // References
  tenant_id: string;
  booking_id?: string;
  call_id?: string;
  contact_id?: string; // CRM contact reference

  // Message details
  to_phone: string;
  from_phone: string;
  message_type: "confirmation" | "reminder" | "missed_call" | "custom";
  body: string;

  // Twilio tracking
  twilio_sid?: string;
  status: "pending" | "sent" | "delivered" | "failed";
  error_message?: string;
}

// View/query types
export interface TenantWithStats extends Tenant {
  calls_today: number;
  calls_this_week: number;
  revenue_this_month: number;
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

export type PhoneSetupType = "new" | "port" | "forward";

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
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  scopes?: string;
  external_account_id?: string;
  status: IntegrationStatus;
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
  account_number?: string;
  pin?: string;
  authorized_name: string;
  loa_signed_at?: string;
  status: PortStatus;
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

export interface TransferBehavior {
  type: TransferType;
  no_answer: NoAnswerBehavior;
}

// Extended Tenant type with new setup wizard fields
export interface TenantExtended extends Tenant {
  setup_step?: SetupStep;
  setup_completed_at?: string;
  status: TenantStatus;
  location_city?: string;
  location_address?: string;
  assisted_mode: boolean;
  after_hours_behavior?: string;
  transfer_behavior?: TransferBehavior;
}

// ============================================================================
// API REQUEST TYPES
// ============================================================================

export interface SaveSetupStepRequest {
  step: SetupStep;
  data: Record<string, unknown>;
}

export interface CreateCapabilityRequest {
  capability: string;
  config?: Record<string, unknown>;
}

export interface CreateEscalationContactRequest {
  name: string;
  phone: string;
  role?: string;
  is_primary?: boolean;
  availability?: ContactAvailability;
  availability_hours?: Record<string, unknown>;
}

export interface CreatePromotionRequest {
  offer_text: string;
  mention_behavior?: MentionBehavior;
  is_active?: boolean;
  starts_at?: string;
  ends_at?: string;
}

export interface ProvisionPhoneRequest {
  phone_number: string;
}

export interface CreatePortRequest {
  phone_number: string;
  current_carrier: string;
  account_number: string;
  pin?: string;
  authorized_name: string;
}
