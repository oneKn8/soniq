// Soniq Core - Industry Presets
// SOW-Aligned Configuration Templates

import type {
  IndustryPreset,
  IndustryType,
  IndustryCategory,
  AppConfig,
  VoiceConfig,
  FeatureFlags,
  GreetingConfig,
  CustomResponses,
  AgentPersonality,
  CapabilityDefinition,
  IndustryTaskType,
} from "@/types";

// ============================================================================
// UNIVERSAL TASK TYPES
// ============================================================================

const UNIVERSAL_TASK_TYPES: IndustryTaskType[] = [
  { value: "follow_up", label: "Follow Up" },
  { value: "call_back", label: "Call Back" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "review", label: "Review" },
  { value: "custom", label: "Custom" },
];

// ============================================================================
// INDUSTRY CATEGORY METADATA
// ============================================================================

export const INDUSTRY_CATEGORIES: Record<
  IndustryCategory,
  { label: string; icon: string; description: string }
> = {
  hospitality: {
    label: "Hospitality",
    icon: "Building2",
    description: "Hotels, restaurants, and lodging services",
  },
  healthcare: {
    label: "Healthcare",
    icon: "Stethoscope",
    description: "Medical, dental, and wellness practices",
  },
  automotive: {
    label: "Automotive",
    icon: "Car",
    description: "Auto service and repair",
  },
  personal_care: {
    label: "Personal Care",
    icon: "Scissors",
    description: "Salons and styling studios",
  },
};

// ============================================================================
// INDUSTRY PRESETS (SOW-ALIGNED)
// ============================================================================

export const INDUSTRY_PRESETS: Record<IndustryType, IndustryPreset> = {
  // ==========================================================================
  // HOSPITALITY
  // ==========================================================================
  hotel: {
    id: "hotel",
    category: "hospitality",
    label: "Hotel",
    description: "Full-service hotels and resorts",
    icon: "Building2",
    popular: true,
    navLabels: { calendarTab: "Reserve" },
    terminology: {
      transaction: "Reservation",
      transactionPlural: "Reservations",
      customer: "Guest",
      customerPlural: "Guests",
      availability: "Room Availability",
      revenue: "Revenue",
      deal: "Booking",
      dealPlural: "Bookings",
    },
    metrics: [
      {
        id: "occupancy",
        label: "Occupancy Rate",
        shortLabel: "OCC",
        unit: "%",
        format: "percentage",
      },
      {
        id: "adr",
        label: "Average Daily Rate",
        shortLabel: "ADR",
        format: "currency",
      },
      {
        id: "revpar",
        label: "Revenue Per Room",
        shortLabel: "RevPAR",
        format: "currency",
      },
      {
        id: "bookings",
        label: "Reservations Today",
        shortLabel: "RES",
        format: "number",
      },
    ],
    intents: [
      {
        id: "book_room",
        name: "Book Room",
        description: "Guest wants to reserve a room",
        examples: ["I need a room", "Book for tonight"],
        action: "book",
        requiresConfirmation: true,
      },
      {
        id: "check_rates",
        name: "Check Rates",
        description: "Guest inquiring about pricing",
        examples: ["What are your rates", "How much for a king"],
        action: "inquire",
        requiresConfirmation: false,
      },
      {
        id: "check_availability",
        name: "Check Availability",
        description: "Guest checking if rooms available",
        examples: ["Do you have rooms", "Available this weekend"],
        action: "inquire",
        requiresConfirmation: false,
      },
      {
        id: "pet_policy",
        name: "Pet Policy",
        description: "Guest asking about pets",
        examples: ["Do you allow dogs", "Pet friendly"],
        action: "inquire",
        requiresConfirmation: false,
      },
      {
        id: "group_booking",
        name: "Group Booking",
        description: "Large party inquiry",
        examples: ["10 rooms", "Family reunion", "Wedding block"],
        action: "transfer",
        requiresConfirmation: false,
      },
    ],
    defaultPricing: {
      baseRate: 139,
      currency: "USD",
      taxRate: 0.12,
      fees: [
        {
          id: "pet",
          label: "Pet Fee",
          amount: 25,
          type: "fixed",
          conditional: "hasPet",
        },
        { id: "resort", label: "Resort Fee", amount: 15, type: "fixed" },
        { id: "parking", label: "Parking", amount: 0, type: "fixed" },
      ],
      rateModifiers: [
        {
          id: "weekend",
          label: "Weekend Rate",
          multiplier: 1.15,
          conditions: ["isFriday", "isSaturday"],
        },
        {
          id: "suite",
          label: "Suite Upgrade",
          multiplier: 1.36,
          conditions: ["roomType === suite"],
        },
      ],
    },
    greetingTemplates: [
      "Thank you for calling {businessName}. This is {agentName}, how may I assist you today?",
      "Welcome to {businessName}! I'm {agentName}, your virtual concierge. How can I help?",
    ],
    faqTemplates: [
      {
        question: "What time is check-in?",
        answer: "Check-in begins at 3:00 PM and checkout is at 11:00 AM.",
        category: "policies",
      },
      {
        question: "Do you have parking?",
        answer: "Yes, we offer complimentary self-parking for all guests.",
        category: "amenities",
      },
      {
        question: "Is breakfast included?",
        answer:
          "Continental breakfast is included with your stay, served from 6:30-9:30 AM.",
        category: "amenities",
      },
    ],
    pipeline: {
      stages: [
        {
          id: "inquiry",
          label: "Inquiry",
          color: "text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          isTerminal: false,
        },
        {
          id: "reserved",
          label: "Reserved",
          color: "text-cyan-400",
          bgColor: "bg-cyan-500/10",
          borderColor: "border-cyan-500/30",
          isTerminal: false,
        },
        {
          id: "checked_in",
          label: "Checked In",
          color: "text-amber-400",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          isTerminal: false,
        },
        {
          id: "checked_out",
          label: "Checked Out",
          color: "text-emerald-400",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/30",
          isTerminal: true,
        },
        {
          id: "cancelled",
          label: "Cancelled",
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          isTerminal: true,
        },
        {
          id: "no_show",
          label: "No-Show",
          color: "text-orange-400",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/30",
          isTerminal: true,
        },
      ],
      defaultStage: "inquiry",
      completedStage: "checked_out",
      cancelledStage: "cancelled",
    },
    taskTypes: UNIVERSAL_TASK_TYPES,
  },

  motel: {
    id: "motel",
    category: "hospitality",
    label: "Motel",
    description: "Budget-friendly roadside lodging",
    icon: "Building",
    popular: true,
    navLabels: { calendarTab: "Reserve" },
    terminology: {
      transaction: "Reservation",
      transactionPlural: "Reservations",
      customer: "Guest",
      customerPlural: "Guests",
      availability: "Room Availability",
      revenue: "Revenue",
      deal: "Booking",
      dealPlural: "Bookings",
    },
    metrics: [
      {
        id: "occupancy",
        label: "Occupancy Rate",
        shortLabel: "OCC",
        unit: "%",
        format: "percentage",
      },
      {
        id: "adr",
        label: "Average Daily Rate",
        shortLabel: "ADR",
        format: "currency",
      },
      {
        id: "bookings",
        label: "Bookings Today",
        shortLabel: "BOOK",
        format: "number",
      },
      {
        id: "walkins",
        label: "Walk-ins",
        shortLabel: "WALK",
        format: "number",
      },
    ],
    intents: [
      {
        id: "book_room",
        name: "Book Room",
        description: "Guest wants to reserve",
        examples: ["Need a room tonight", "Book a room"],
        action: "book",
        requiresConfirmation: true,
      },
      {
        id: "check_rates",
        name: "Check Rates",
        description: "Price inquiry",
        examples: ["How much per night", "Your rates"],
        action: "inquire",
        requiresConfirmation: false,
      },
      {
        id: "check_availability",
        name: "Availability",
        description: "Room availability",
        examples: ["Any rooms available", "Have vacancies"],
        action: "inquire",
        requiresConfirmation: false,
      },
    ],
    defaultPricing: {
      baseRate: 69,
      currency: "USD",
      taxRate: 0.1,
      fees: [
        {
          id: "pet",
          label: "Pet Fee",
          amount: 15,
          type: "fixed",
          conditional: "hasPet",
        },
      ],
    },
    greetingTemplates: [
      "Thank you for calling {businessName}. How can I help you today?",
    ],
    faqTemplates: [
      {
        question: "What time is check-in?",
        answer: "Check-in is at 2:00 PM, checkout by 11:00 AM.",
        category: "policies",
      },
      {
        question: "Do you allow pets?",
        answer: "Yes, we are pet-friendly with a $15 per night pet fee.",
        category: "policies",
      },
    ],
    pipeline: {
      stages: [
        {
          id: "inquiry",
          label: "Inquiry",
          color: "text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          isTerminal: false,
        },
        {
          id: "reserved",
          label: "Reserved",
          color: "text-cyan-400",
          bgColor: "bg-cyan-500/10",
          borderColor: "border-cyan-500/30",
          isTerminal: false,
        },
        {
          id: "checked_in",
          label: "Checked In",
          color: "text-amber-400",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          isTerminal: false,
        },
        {
          id: "checked_out",
          label: "Checked Out",
          color: "text-emerald-400",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/30",
          isTerminal: true,
        },
        {
          id: "cancelled",
          label: "Cancelled",
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          isTerminal: true,
        },
        {
          id: "no_show",
          label: "No-Show",
          color: "text-orange-400",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/30",
          isTerminal: true,
        },
      ],
      defaultStage: "inquiry",
      completedStage: "checked_out",
      cancelledStage: "cancelled",
    },
    taskTypes: UNIVERSAL_TASK_TYPES,
  },

  restaurant: {
    id: "restaurant",
    category: "hospitality",
    label: "Restaurant",
    description: "Restaurants and dining establishments",
    icon: "UtensilsCrossed",
    popular: true,
    navLabels: { calendarTab: "Reserve" },
    terminology: {
      transaction: "Reservation",
      transactionPlural: "Reservations",
      customer: "Guest",
      customerPlural: "Guests",
      availability: "Table Availability",
      revenue: "Revenue",
      deal: "Reservation",
      dealPlural: "Reservations",
    },
    metrics: [
      {
        id: "covers",
        label: "Covers Today",
        shortLabel: "COV",
        format: "number",
      },
      {
        id: "reservations",
        label: "Reservations",
        shortLabel: "RES",
        format: "number",
      },
      {
        id: "walkins",
        label: "Walk-ins",
        shortLabel: "WALK",
        format: "number",
      },
      {
        id: "avgCheck",
        label: "Avg Check",
        shortLabel: "AVG",
        format: "currency",
      },
    ],
    intents: [
      {
        id: "make_reservation",
        name: "Make Reservation",
        description: "Guest wants to book a table",
        examples: ["Table for 4", "Reservation for tonight"],
        action: "book",
        requiresConfirmation: true,
      },
      {
        id: "check_availability",
        name: "Check Availability",
        description: "Table availability",
        examples: ["Open at 7", "Available Saturday"],
        action: "inquire",
        requiresConfirmation: false,
      },
      {
        id: "menu_info",
        name: "Menu Info",
        description: "Menu questions",
        examples: ["Vegetarian options", "Gluten free"],
        action: "inquire",
        requiresConfirmation: false,
      },
      {
        id: "hours",
        name: "Hours",
        description: "Operating hours",
        examples: ["What time do you close", "Open on Sunday"],
        action: "inquire",
        requiresConfirmation: false,
      },
    ],
    defaultPricing: {
      baseRate: 0,
      currency: "USD",
      taxRate: 0.08,
      fees: [
        {
          id: "large_party",
          label: "Large Party Fee",
          amount: 18,
          type: "percentage",
          conditional: "partySize >= 8",
        },
      ],
    },
    greetingTemplates: [
      "Thank you for calling {businessName}. Would you like to make a reservation?",
    ],
    faqTemplates: [
      {
        question: "Do you take reservations?",
        answer: "Yes, we accept reservations for parties of any size.",
        category: "reservations",
      },
      {
        question: "Do you have outdoor seating?",
        answer: "Yes, we have a beautiful patio available weather permitting.",
        category: "amenities",
      },
    ],
    pipeline: {
      stages: [
        {
          id: "inquiry",
          label: "Inquiry",
          color: "text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          isTerminal: false,
        },
        {
          id: "reserved",
          label: "Reserved",
          color: "text-cyan-400",
          bgColor: "bg-cyan-500/10",
          borderColor: "border-cyan-500/30",
          isTerminal: false,
        },
        {
          id: "confirmed",
          label: "Confirmed",
          color: "text-amber-400",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          isTerminal: false,
        },
        {
          id: "seated",
          label: "Seated",
          color: "text-purple-400",
          bgColor: "bg-purple-500/10",
          borderColor: "border-purple-500/30",
          isTerminal: false,
        },
        {
          id: "completed",
          label: "Completed",
          color: "text-emerald-400",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/30",
          isTerminal: true,
        },
        {
          id: "no_show",
          label: "No-Show",
          color: "text-orange-400",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/30",
          isTerminal: true,
        },
        {
          id: "cancelled",
          label: "Cancelled",
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          isTerminal: true,
        },
      ],
      defaultStage: "inquiry",
      completedStage: "completed",
      cancelledStage: "cancelled",
    },
    taskTypes: [
      ...UNIVERSAL_TASK_TYPES,
      { value: "vendor_order", label: "Vendor Order" },
      { value: "event_setup", label: "Event Setup" },
    ],
  },

  // ==========================================================================
  // HEALTHCARE
  // ==========================================================================
  medical: {
    id: "medical",
    category: "healthcare",
    label: "Medical Practice",
    description: "Primary care and specialty clinics",
    icon: "Stethoscope",
    popular: true,
    navLabels: { calendarTab: "Appts" },
    terminology: {
      transaction: "Appointment",
      transactionPlural: "Appointments",
      customer: "Patient",
      customerPlural: "Patients",
      availability: "Schedule",
      revenue: "Billing",
      deal: "Case",
      dealPlural: "Cases",
    },
    metrics: [
      {
        id: "appointments",
        label: "Appointments Today",
        shortLabel: "APPT",
        format: "number",
      },
      {
        id: "scheduled",
        label: "Scheduled",
        shortLabel: "SCHD",
        format: "number",
      },
      {
        id: "callbacks",
        label: "Pending Callbacks",
        shortLabel: "CALL",
        format: "number",
        thresholds: { warning: 5, critical: 10, direction: "above" },
      },
      {
        id: "noshow",
        label: "No-Show Rate",
        shortLabel: "NS%",
        unit: "%",
        format: "percentage",
      },
    ],
    intents: [
      {
        id: "schedule_appointment",
        name: "Schedule Appointment",
        description: "Patient wants to book",
        examples: ["Schedule with Dr. Martinez", "Need an appointment"],
        action: "book",
        requiresConfirmation: true,
      },
      {
        id: "reschedule",
        name: "Reschedule",
        description: "Patient needs to change time",
        examples: ["Reschedule my appointment", "Change my time"],
        action: "book",
        requiresConfirmation: true,
      },
      {
        id: "cancel",
        name: "Cancel Appointment",
        description: "Patient canceling",
        examples: ["Cancel my appointment", "I cant make it"],
        action: "book",
        requiresConfirmation: true,
      },
      {
        id: "prescription",
        name: "Prescription Refill",
        description: "Patient needs refill",
        examples: ["Refill my prescription", "Need more medication"],
        action: "message",
        requiresConfirmation: false,
      },
      {
        id: "urgent",
        name: "Urgent/Emergency",
        description: "Urgent medical need",
        examples: ["Its an emergency", "Urgent"],
        action: "transfer",
        requiresConfirmation: false,
      },
    ],
    defaultPricing: {
      baseRate: 150,
      currency: "USD",
      taxRate: 0,
      fees: [
        {
          id: "new_patient",
          label: "New Patient Fee",
          amount: 50,
          type: "fixed",
          conditional: "isNewPatient",
        },
        {
          id: "late_cancel",
          label: "Late Cancellation",
          amount: 75,
          type: "fixed",
          conditional: "isLateCancellation",
        },
      ],
    },
    greetingTemplates: [
      "Thank you for calling {businessName}. This is {agentName}. How may I help you today?",
      "{businessName}, this is {agentName}. Are you calling to schedule an appointment?",
    ],
    faqTemplates: [
      {
        question: "Do you accept my insurance?",
        answer:
          "We accept most major insurance plans. Please provide your insurance information and we can verify coverage.",
        category: "billing",
      },
      {
        question: "What should I bring to my appointment?",
        answer:
          "Please bring your photo ID, insurance card, and a list of current medications.",
        category: "appointments",
      },
    ],
    pipeline: {
      stages: [
        {
          id: "inquiry",
          label: "Inquiry",
          color: "text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          isTerminal: false,
        },
        {
          id: "scheduled",
          label: "Scheduled",
          color: "text-cyan-400",
          bgColor: "bg-cyan-500/10",
          borderColor: "border-cyan-500/30",
          isTerminal: false,
        },
        {
          id: "confirmed",
          label: "Confirmed",
          color: "text-amber-400",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          isTerminal: false,
        },
        {
          id: "completed",
          label: "Completed",
          color: "text-emerald-400",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/30",
          isTerminal: true,
        },
        {
          id: "no_show",
          label: "No-Show",
          color: "text-orange-400",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/30",
          isTerminal: true,
        },
        {
          id: "cancelled",
          label: "Cancelled",
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          isTerminal: true,
        },
      ],
      defaultStage: "inquiry",
      completedStage: "completed",
      cancelledStage: "cancelled",
    },
    taskTypes: [
      ...UNIVERSAL_TASK_TYPES,
      { value: "insurance_verification", label: "Insurance Verification" },
      { value: "prescription_refill", label: "Prescription Refill" },
    ],
  },

  dental: {
    id: "dental",
    category: "healthcare",
    label: "Dental Office",
    description: "Dental practices and clinics",
    icon: "Smile",
    popular: true,
    navLabels: { calendarTab: "Appts" },
    terminology: {
      transaction: "Appointment",
      transactionPlural: "Appointments",
      customer: "Patient",
      customerPlural: "Patients",
      availability: "Schedule",
      revenue: "Production",
      deal: "Case",
      dealPlural: "Cases",
    },
    metrics: [
      {
        id: "appointments",
        label: "Appointments Today",
        shortLabel: "APPT",
        format: "number",
      },
      {
        id: "production",
        label: "Daily Production",
        shortLabel: "PROD",
        format: "currency",
      },
      {
        id: "newPatients",
        label: "New Patients",
        shortLabel: "NEW",
        format: "number",
      },
      {
        id: "recalls",
        label: "Recalls Due",
        shortLabel: "RCL",
        format: "number",
      },
    ],
    intents: [
      {
        id: "schedule_appointment",
        name: "Schedule Appointment",
        description: "Patient wants to book",
        examples: ["Schedule a cleaning", "Book dental appointment"],
        action: "book",
        requiresConfirmation: true,
      },
      {
        id: "emergency",
        name: "Dental Emergency",
        description: "Urgent dental issue",
        examples: ["Tooth pain", "Broken tooth", "Emergency"],
        action: "transfer",
        requiresConfirmation: false,
      },
      {
        id: "insurance",
        name: "Insurance Question",
        description: "Coverage inquiry",
        examples: ["Do you take Delta Dental", "Insurance accepted"],
        action: "inquire",
        requiresConfirmation: false,
      },
    ],
    defaultPricing: {
      baseRate: 175,
      currency: "USD",
      taxRate: 0,
      fees: [
        {
          id: "new_patient",
          label: "New Patient Exam",
          amount: 99,
          type: "fixed",
        },
        {
          id: "late_cancel",
          label: "Missed Appointment",
          amount: 50,
          type: "fixed",
        },
      ],
    },
    greetingTemplates: [
      "Thank you for calling {businessName}. This is {agentName}, how can I help you today?",
    ],
    faqTemplates: [
      {
        question: "How often should I get a cleaning?",
        answer: "We recommend professional cleanings every 6 months.",
        category: "care",
      },
    ],
    pipeline: {
      stages: [
        {
          id: "inquiry",
          label: "Inquiry",
          color: "text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          isTerminal: false,
        },
        {
          id: "scheduled",
          label: "Scheduled",
          color: "text-cyan-400",
          bgColor: "bg-cyan-500/10",
          borderColor: "border-cyan-500/30",
          isTerminal: false,
        },
        {
          id: "confirmed",
          label: "Confirmed",
          color: "text-amber-400",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          isTerminal: false,
        },
        {
          id: "completed",
          label: "Completed",
          color: "text-emerald-400",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/30",
          isTerminal: true,
        },
        {
          id: "no_show",
          label: "No-Show",
          color: "text-orange-400",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/30",
          isTerminal: true,
        },
        {
          id: "cancelled",
          label: "Cancelled",
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          isTerminal: true,
        },
      ],
      defaultStage: "inquiry",
      completedStage: "completed",
      cancelledStage: "cancelled",
    },
    taskTypes: [
      ...UNIVERSAL_TASK_TYPES,
      { value: "insurance_verification", label: "Insurance Verification" },
    ],
  },

  // ==========================================================================
  // AUTOMOTIVE
  // ==========================================================================
  auto_service: {
    id: "auto_service",
    category: "automotive",
    label: "Auto Service",
    description: "Auto repair and service centers",
    icon: "Wrench",
    popular: true,
    navLabels: { calendarTab: "Service" },
    terminology: {
      transaction: "Service",
      transactionPlural: "Services",
      customer: "Customer",
      customerPlural: "Customers",
      availability: "Bay Availability",
      revenue: "Revenue",
      deal: "Service Order",
      dealPlural: "Service Orders",
    },
    metrics: [
      {
        id: "appointments",
        label: "Appointments",
        shortLabel: "APPT",
        format: "number",
      },
      {
        id: "inProgress",
        label: "In Progress",
        shortLabel: "WIP",
        format: "number",
      },
      {
        id: "completed",
        label: "Completed",
        shortLabel: "DONE",
        format: "number",
      },
      {
        id: "avgTicket",
        label: "Avg Ticket",
        shortLabel: "AVG",
        format: "currency",
      },
    ],
    intents: [
      {
        id: "schedule_service",
        name: "Schedule Service",
        description: "Customer needs service",
        examples: ["Oil change", "Schedule service"],
        action: "book",
        requiresConfirmation: true,
      },
      {
        id: "get_quote",
        name: "Get Quote",
        description: "Price estimate",
        examples: ["How much for brakes", "Cost of"],
        action: "inquire",
        requiresConfirmation: false,
      },
      {
        id: "status",
        name: "Check Status",
        description: "Vehicle status",
        examples: ["Is my car ready", "Status update"],
        action: "inquire",
        requiresConfirmation: false,
      },
      {
        id: "emergency",
        name: "Emergency",
        description: "Breakdown",
        examples: ["Car broke down", "Wont start"],
        action: "transfer",
        requiresConfirmation: false,
      },
    ],
    defaultPricing: {
      baseRate: 95,
      currency: "USD",
      taxRate: 0.08,
      fees: [
        {
          id: "diagnostic",
          label: "Diagnostic Fee",
          amount: 89,
          type: "fixed",
        },
        { id: "shop", label: "Shop Supplies", amount: 5, type: "percentage" },
      ],
    },
    greetingTemplates: [
      "Thank you for calling {businessName}. What can we help you with today?",
    ],
    faqTemplates: [
      {
        question: "Do you offer loaner cars?",
        answer:
          "Yes, we have loaner vehicles available for major repairs by appointment.",
        category: "services",
      },
    ],
    pipeline: {
      stages: [
        {
          id: "inquiry",
          label: "Inquiry",
          color: "text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          isTerminal: false,
        },
        {
          id: "quoted",
          label: "Quoted",
          color: "text-cyan-400",
          bgColor: "bg-cyan-500/10",
          borderColor: "border-cyan-500/30",
          isTerminal: false,
        },
        {
          id: "scheduled",
          label: "Scheduled",
          color: "text-amber-400",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          isTerminal: false,
        },
        {
          id: "in_progress",
          label: "In Progress",
          color: "text-purple-400",
          bgColor: "bg-purple-500/10",
          borderColor: "border-purple-500/30",
          isTerminal: false,
        },
        {
          id: "completed",
          label: "Completed",
          color: "text-emerald-400",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/30",
          isTerminal: true,
        },
        {
          id: "cancelled",
          label: "Cancelled",
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          isTerminal: true,
        },
      ],
      defaultStage: "inquiry",
      completedStage: "completed",
      cancelledStage: "cancelled",
    },
    taskTypes: [
      ...UNIVERSAL_TASK_TYPES,
      { value: "parts_order", label: "Parts Order" },
      { value: "vehicle_pickup", label: "Vehicle Pickup" },
    ],
  },

  // ==========================================================================
  // PERSONAL CARE
  // ==========================================================================
  salon: {
    id: "salon",
    category: "personal_care",
    label: "Hair Salon",
    description: "Hair salons and styling studios",
    icon: "Scissors",
    popular: true,
    navLabels: { calendarTab: "Appts" },
    terminology: {
      transaction: "Appointment",
      transactionPlural: "Appointments",
      customer: "Client",
      customerPlural: "Clients",
      availability: "Stylist Availability",
      revenue: "Revenue",
      deal: "Appointment",
      dealPlural: "Appointments",
    },
    metrics: [
      {
        id: "appointments",
        label: "Appointments",
        shortLabel: "APPT",
        format: "number",
      },
      {
        id: "walkins",
        label: "Walk-ins",
        shortLabel: "WALK",
        format: "number",
      },
      {
        id: "productSales",
        label: "Product Sales",
        shortLabel: "PROD",
        format: "currency",
      },
      {
        id: "avgTicket",
        label: "Avg Ticket",
        shortLabel: "AVG",
        format: "currency",
      },
    ],
    intents: [
      {
        id: "book_appointment",
        name: "Book Appointment",
        description: "Client wants to book",
        examples: ["Book a haircut", "Appointment with Sarah"],
        action: "book",
        requiresConfirmation: true,
      },
      {
        id: "services",
        name: "Services",
        description: "Service inquiry",
        examples: ["Do you do color", "Services offered"],
        action: "inquire",
        requiresConfirmation: false,
      },
      {
        id: "pricing",
        name: "Pricing",
        description: "Price inquiry",
        examples: ["How much for highlights", "Pricing"],
        action: "inquire",
        requiresConfirmation: false,
      },
    ],
    defaultPricing: {
      baseRate: 45,
      currency: "USD",
      taxRate: 0.08,
      fees: [
        { id: "color", label: "Color Service", amount: 85, type: "fixed" },
        {
          id: "noshow",
          label: "No-Show Fee",
          amount: 25,
          type: "fixed",
          conditional: "isNoShow",
        },
      ],
    },
    greetingTemplates: [
      "Thank you for calling {businessName}. Would you like to book an appointment?",
    ],
    faqTemplates: [
      {
        question: "Do I need an appointment?",
        answer:
          "Appointments are recommended but we do accept walk-ins when stylists are available.",
        category: "booking",
      },
    ],
    pipeline: {
      stages: [
        {
          id: "inquiry",
          label: "Inquiry",
          color: "text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          isTerminal: false,
        },
        {
          id: "booked",
          label: "Booked",
          color: "text-cyan-400",
          bgColor: "bg-cyan-500/10",
          borderColor: "border-cyan-500/30",
          isTerminal: false,
        },
        {
          id: "confirmed",
          label: "Confirmed",
          color: "text-amber-400",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          isTerminal: false,
        },
        {
          id: "completed",
          label: "Completed",
          color: "text-emerald-400",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/30",
          isTerminal: true,
        },
        {
          id: "no_show",
          label: "No-Show",
          color: "text-orange-400",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/30",
          isTerminal: true,
        },
        {
          id: "cancelled",
          label: "Cancelled",
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          isTerminal: true,
        },
      ],
      defaultStage: "inquiry",
      completedStage: "completed",
      cancelledStage: "cancelled",
    },
    taskTypes: UNIVERSAL_TASK_TYPES,
  },
};

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  provider: "openai",
  voiceId: "nova",
  voiceName: "Nova",
  speakingRate: 1.0,
  pitch: 1.0,
  language: "en-US",
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  smsConfirmations: true,
  emailNotifications: true,
  liveTransfer: true,
  voicemailFallback: true,
  sentimentAnalysis: false,
  recordingEnabled: true,
  transcriptionEnabled: true,
  callerIdLookup: false,
  multiLanguage: false,
};

export const DEFAULT_OPERATING_HOURS = {
  timezone: "America/New_York",
  schedule: [
    { day: 0 as const, enabled: false, openTime: "09:00", closeTime: "17:00" },
    { day: 1 as const, enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: 2 as const, enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: 3 as const, enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: 4 as const, enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: 5 as const, enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: 6 as const, enabled: false, openTime: "09:00", closeTime: "17:00" },
  ],
  holidays: [],
};

export const DEFAULT_PERSONALITY: AgentPersonality = {
  tone: "professional",
  verbosity: "balanced",
  empathy: "medium",
  humor: false,
};

export const DEFAULT_GREETINGS: GreetingConfig = {
  standard:
    "Thank you for calling {businessName}. This is {agentName}, how may I assist you today?",
  afterHours:
    "Thank you for calling {businessName}. We are currently closed. I can still help with some requests or take a message.",
  holiday:
    "Happy holidays from {businessName}! We are currently closed but I can still assist you.",
  busy: "Thank you for your patience. I'm {agentName} with {businessName}. How can I help you?",
  returning:
    "Welcome back! Thank you for calling {businessName} again. How can I help you today?",
};

export const DEFAULT_RESPONSES: CustomResponses = {
  notAvailable:
    "I apologize, but that is not available at this time. Is there anything else I can help you with?",
  transferring:
    "I'll transfer you to someone who can better assist you. Please hold for just a moment.",
  bookingConfirmed:
    "Great! Your booking has been confirmed. You'll receive a confirmation shortly.",
  bookingFailed:
    "I apologize, but I was unable to complete that booking. Would you like to try a different option?",
  goodbye: "Thank you for calling {businessName}. Have a great day!",
  holdMessage: "Thank you for holding. I'm still working on your request.",
  fallback:
    "I want to make sure I understand you correctly. Could you please rephrase that?",
};

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createDefaultConfig(
  industry: IndustryType,
  userRole: "developer" | "admin" | "staff" = "developer",
): AppConfig {
  const preset = INDUSTRY_PRESETS[industry];
  const themeColor = getDefaultThemeForIndustry(industry);

  return {
    industry,
    businessName: "",
    agentName: "Soniq",
    agentVoice: { ...DEFAULT_VOICE_CONFIG },
    agentPersonality: { ...DEFAULT_PERSONALITY },
    themeColor,
    pricing: { ...preset.defaultPricing },
    operatingHours: { ...DEFAULT_OPERATING_HOURS },
    lateNightMode: {
      enabled: true,
      startTime: "22:00",
      endTime: "06:00",
      behavior: "full_service",
    },
    escalation: {
      enabled: true,
      triggers: [
        {
          id: "angry",
          condition: "sentiment < -0.5",
          action: "transfer",
          priority: "high",
        },
        {
          id: "emergency",
          condition: "intent === emergency",
          action: "transfer",
          priority: "critical",
        },
        {
          id: "complex",
          condition: "confidence < 0.6",
          action: "message",
          priority: "medium",
        },
      ],
      notifyOnEscalation: true,
      maxWaitTime: 60,
    },
    greetings: { ...DEFAULT_GREETINGS },
    responses: { ...DEFAULT_RESPONSES },
    faqs: preset.faqTemplates.map((faq, index) => ({
      id: `faq_${index}`,
      ...faq,
      enabled: true,
      priority: index,
    })),
    features: { ...DEFAULT_FEATURE_FLAGS },
    userRole,
    isConfigured: false,
  };
}

function getDefaultThemeForIndustry(
  industry: IndustryType,
): AppConfig["themeColor"] {
  const categoryThemes: Record<IndustryCategory, AppConfig["themeColor"]> = {
    hospitality: "indigo",
    healthcare: "blue",
    automotive: "zinc",
    personal_care: "rose",
  };

  const preset = INDUSTRY_PRESETS[industry];
  return categoryThemes[preset.category] || "indigo";
}

export function getPreset(industry: IndustryType): IndustryPreset {
  return INDUSTRY_PRESETS[industry];
}

export function getTerminology(industry: IndustryType) {
  return INDUSTRY_PRESETS[industry].terminology;
}

export function getIndustriesByCategory(
  category: IndustryCategory,
): IndustryPreset[] {
  return Object.values(INDUSTRY_PRESETS).filter(
    (preset) => preset.category === category,
  );
}

export function getPopularIndustries(): IndustryPreset[] {
  return Object.values(INDUSTRY_PRESETS).filter((preset) => preset.popular);
}

// ============================================================================
// UNIVERSAL CAPABILITIES
// These apply to all industries
// ============================================================================

export const UNIVERSAL_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "faq",
    label: "Answer FAQs",
    description: "Answer common questions",
    icon: "help-circle",
    category: "communication",
    questions: [
      {
        id: "common_questions",
        label: "What do callers ask most often?",
        type: "textarea",
        required: false,
        placeholder:
          "List common questions - we'll help your assistant answer them",
        helperText:
          "Examples: Do you accept walk-ins? What are your prices? Do you offer payment plans?",
      },
      {
        id: "pricing_info",
        label: "Should your assistant discuss pricing?",
        type: "select",
        required: false,
        options: [
          { value: "none", label: "No - direct to human for pricing" },
          { value: "general", label: "Yes - provide general pricing info" },
          { value: "detailed", label: "Yes - provide detailed pricing" },
        ],
      },
      {
        id: "pricing_details",
        label: "Pricing information",
        type: "textarea",
        required: false,
        placeholder: 'Enter pricing details or "Prices vary - call for quote"',
      },
      {
        id: "policies",
        label: "Important policies",
        type: "textarea",
        required: false,
        placeholder: "e.g., Cancellation policy, payment terms, refund policy",
      },
    ],
  },
  {
    id: "messages",
    label: "Take Messages",
    description: "Capture caller information for callback",
    icon: "message-square",
    category: "communication",
    questions: [
      {
        id: "message_fields",
        label: "Information to collect",
        type: "multiselect",
        required: true,
        options: [
          { value: "name", label: "Name" },
          { value: "phone", label: "Phone number" },
          { value: "email", label: "Email" },
          { value: "reason", label: "Reason for call" },
          { value: "best_time", label: "Best time to call back" },
        ],
      },
      {
        id: "callback_promise",
        label: "Callback timeframe",
        type: "select",
        required: false,
        options: [
          { value: "asap", label: "As soon as possible" },
          { value: "1hour", label: "Within 1 hour" },
          { value: "same_day", label: "Same business day" },
          { value: "24hours", label: "Within 24 hours" },
          { value: "none", label: "Don't promise specific timeframe" },
        ],
      },
    ],
  },
  {
    id: "hours_location",
    label: "Hours & Location",
    description: "Provide business hours and directions",
    icon: "map-pin",
    category: "communication",
    questions: [], // Uses data from Hours step and Business step
  },
];

// ============================================================================
// INDUSTRY-SPECIFIC CAPABILITIES
// ============================================================================

export const RESTAURANT_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "reservations",
    label: "Take Reservations",
    description: "Book tables for customers",
    icon: "calendar",
    category: "core",
    questions: [
      {
        id: "max_party_size",
        label: "Maximum party size",
        type: "number",
        required: true,
      },
      {
        id: "reservation_hours",
        label: "Reservation hours",
        type: "text",
        required: true,
        placeholder: "e.g., 11am-9pm",
      },
      {
        id: "deposit_required",
        label: "Require deposit for large parties?",
        type: "toggle",
        required: false,
      },
      {
        id: "deposit_amount",
        label: "Deposit amount",
        type: "number",
        required: false,
      },
      {
        id: "accommodations",
        label: "Special accommodations available",
        type: "multiselect",
        required: false,
        options: [
          { value: "outdoor", label: "Outdoor seating" },
          { value: "high_chair", label: "High chairs" },
          { value: "wheelchair", label: "Wheelchair accessible" },
          { value: "private_room", label: "Private dining room" },
        ],
      },
    ],
  },
  {
    id: "takeaway",
    label: "Takeaway Orders",
    description: "Handle pickup and delivery orders",
    icon: "package",
    category: "core",
    questions: [
      {
        id: "delivery_available",
        label: "Offer delivery?",
        type: "toggle",
        required: true,
      },
      {
        id: "delivery_radius",
        label: "Delivery radius (miles)",
        type: "number",
        required: false,
      },
      {
        id: "min_order",
        label: "Minimum order amount",
        type: "number",
        required: false,
      },
      {
        id: "avg_prep_time",
        label: "Average prep time (minutes)",
        type: "number",
        required: true,
      },
    ],
  },
  {
    id: "menu_questions",
    label: "Answer Menu Questions",
    description: "Handle dietary and menu inquiries",
    icon: "utensils",
    category: "communication",
    questions: [
      {
        id: "dietary_options",
        label: "Dietary options available",
        type: "multiselect",
        required: false,
        options: [
          { value: "vegetarian", label: "Vegetarian" },
          { value: "vegan", label: "Vegan" },
          { value: "gluten_free", label: "Gluten-free" },
          { value: "dairy_free", label: "Dairy-free" },
          { value: "nut_free", label: "Nut-free" },
          { value: "halal", label: "Halal" },
          { value: "kosher", label: "Kosher" },
        ],
      },
      {
        id: "specials_info",
        label: "How to handle specials inquiries?",
        type: "select",
        required: false,
        options: [
          { value: "describe", label: "Describe current specials" },
          { value: "website", label: "Direct to website/menu" },
          { value: "callback", label: "Have someone call back with details" },
        ],
      },
    ],
  },
];

export const HEALTHCARE_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "appointments",
    label: "Schedule Appointments",
    description: "Book patient appointments",
    icon: "calendar",
    category: "core",
    questions: [
      {
        id: "services",
        label: "Services offered",
        type: "textarea",
        required: true,
        placeholder: "e.g., Cleaning, Fillings, Root Canal, Whitening",
      },
      {
        id: "default_duration",
        label: "Default appointment duration",
        type: "select",
        required: true,
        options: [
          { value: "15", label: "15 minutes" },
          { value: "30", label: "30 minutes" },
          { value: "45", label: "45 minutes" },
          { value: "60", label: "1 hour" },
          { value: "90", label: "1.5 hours" },
        ],
      },
      {
        id: "ask_new_patient",
        label: "Ask if new or returning patient?",
        type: "toggle",
        required: false,
      },
    ],
  },
  {
    id: "patient_intake",
    label: "Collect Patient Information",
    description: "Gather required patient details",
    icon: "clipboard",
    category: "core",
    questions: [
      {
        id: "required_fields",
        label: "Required information",
        type: "multiselect",
        required: true,
        options: [
          { value: "name", label: "Full name" },
          { value: "dob", label: "Date of birth" },
          { value: "phone", label: "Phone number" },
          { value: "email", label: "Email address" },
          { value: "insurance", label: "Insurance provider" },
          { value: "reason", label: "Reason for visit" },
          { value: "medications", label: "Current medications" },
        ],
      },
      {
        id: "insurance_accepted",
        label: "Insurance providers accepted",
        type: "textarea",
        required: false,
        placeholder: 'List providers or type "Most major insurance accepted"',
      },
    ],
  },
  {
    id: "insurance_questions",
    label: "Answer Insurance Questions",
    description: "Handle insurance and billing inquiries",
    icon: "file-text",
    category: "communication",
    questions: [
      {
        id: "insurance_handling",
        label: "How should insurance questions be handled?",
        type: "select",
        required: false,
        options: [
          { value: "answer", label: "Answer general questions" },
          { value: "transfer", label: "Transfer to billing department" },
          { value: "callback", label: "Take message for billing callback" },
        ],
      },
    ],
  },
];

// ============================================================================
// CAPABILITY HELPER FUNCTIONS
// ============================================================================

/**
 * Get all capabilities available for an industry
 */
export function getCapabilitiesForIndustry(
  industry: IndustryType,
): CapabilityDefinition[] {
  const preset = INDUSTRY_PRESETS[industry];
  if (!preset) return UNIVERSAL_CAPABILITIES;

  // Get industry-specific capabilities based on category
  let industryCapabilities: CapabilityDefinition[] = [];

  switch (preset.category) {
    case "hospitality":
      if (industry === "restaurant") {
        industryCapabilities = RESTAURANT_CAPABILITIES;
      }
      break;
    case "healthcare":
      industryCapabilities = HEALTHCARE_CAPABILITIES;
      break;
  }

  // Combine industry-specific with universal capabilities
  return [...industryCapabilities, ...UNIVERSAL_CAPABILITIES];
}

/**
 * Get default capabilities for an industry
 */
export function getDefaultCapabilities(industry: IndustryType): string[] {
  const preset = INDUSTRY_PRESETS[industry];
  if (preset?.defaultCapabilities) {
    return preset.defaultCapabilities;
  }

  // Default to messages and hours_location if not specified
  return ["messages", "hours_location"];
}

/**
 * Get a specific capability definition by ID
 */
export function getCapabilityById(
  industry: IndustryType,
  capabilityId: string,
): CapabilityDefinition | undefined {
  const capabilities = getCapabilitiesForIndustry(industry);
  return capabilities.find((c) => c.id === capabilityId);
}
