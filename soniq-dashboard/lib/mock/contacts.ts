// Mock contact data for different industries

export interface MockContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: "active" | "inactive" | "vip" | "blocked";
  source: "call" | "booking" | "web" | "referral" | "import";
  createdAt: Date;
  lastContactAt?: Date;
  totalBookings: number;
  totalCalls: number;
  notes?: string;
  tags?: string[];
  // Industry-specific fields
  metadata?: Record<string, unknown>;
}

// Generate random date within range
const randomDate = (start: Date, end: Date) => {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
};

// Base contacts that work across industries
export const MOCK_CONTACTS: MockContact[] = [
  {
    id: "c1",
    name: "John Smith",
    phone: "+1 555-123-4567",
    email: "john.smith@email.com",
    status: "active",
    source: "booking",
    createdAt: randomDate(new Date(2024, 0, 1), new Date()),
    lastContactAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    totalBookings: 5,
    totalCalls: 8,
    tags: ["returning"],
  },
  {
    id: "c2",
    name: "Sarah Johnson",
    phone: "+1 555-234-5678",
    email: "sarah.j@email.com",
    status: "vip",
    source: "referral",
    createdAt: randomDate(new Date(2024, 0, 1), new Date()),
    lastContactAt: new Date(Date.now() - 1000 * 60 * 30),
    totalBookings: 12,
    totalCalls: 15,
    tags: ["vip", "returning"],
    notes: "Prefers afternoon appointments",
  },
  {
    id: "c3",
    name: "Michael Brown",
    phone: "+1 555-345-6789",
    email: "m.brown@email.com",
    status: "active",
    source: "web",
    createdAt: randomDate(new Date(2024, 6, 1), new Date()),
    lastContactAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    totalBookings: 2,
    totalCalls: 3,
    tags: ["new"],
  },
  {
    id: "c4",
    name: "Emily Davis",
    phone: "+1 555-456-7890",
    email: "emily.davis@email.com",
    status: "active",
    source: "call",
    createdAt: randomDate(new Date(2024, 3, 1), new Date()),
    lastContactAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    totalBookings: 7,
    totalCalls: 10,
    tags: ["returning"],
  },
  {
    id: "c5",
    name: "Robert Wilson",
    phone: "+1 555-567-8901",
    email: "rwilson@email.com",
    status: "active",
    source: "booking",
    createdAt: randomDate(new Date(2024, 0, 1), new Date()),
    lastContactAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    totalBookings: 3,
    totalCalls: 5,
  },
  {
    id: "c6",
    name: "Jennifer Martinez",
    phone: "+1 555-678-9012",
    email: "j.martinez@email.com",
    status: "vip",
    source: "referral",
    createdAt: randomDate(new Date(2023, 6, 1), new Date()),
    lastContactAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    totalBookings: 20,
    totalCalls: 25,
    tags: ["vip", "returning", "loyalty"],
    notes: "Always books same time slot",
  },
  {
    id: "c7",
    name: "David Anderson",
    phone: "+1 555-789-0123",
    email: "d.anderson@email.com",
    status: "inactive",
    source: "import",
    createdAt: randomDate(new Date(2023, 0, 1), new Date()),
    lastContactAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90),
    totalBookings: 1,
    totalCalls: 2,
    tags: ["inactive"],
  },
  {
    id: "c8",
    name: "Lisa Thompson",
    phone: "+1 555-890-1234",
    email: "lisa.t@email.com",
    status: "active",
    source: "web",
    createdAt: randomDate(new Date(2024, 9, 1), new Date()),
    lastContactAt: new Date(Date.now() - 1000 * 60 * 15),
    totalBookings: 1,
    totalCalls: 2,
    tags: ["new"],
  },
];

// Industry-specific contact generators
export function getClinicContacts(): MockContact[] {
  return MOCK_CONTACTS.map((c) => ({
    ...c,
    metadata: {
      patientId: `P${c.id.slice(1).padStart(6, "0")}`,
      insurance: ["BlueCross", "Aetna", "United", "Cigna", "Medicare"][
        Math.floor(Math.random() * 5)
      ],
      lastVisitType: ["Checkup", "Follow-up", "Consultation", "Emergency"][
        Math.floor(Math.random() * 4)
      ],
    },
  }));
}

export function getHotelContacts(): MockContact[] {
  return MOCK_CONTACTS.map((c) => ({
    ...c,
    metadata: {
      loyaltyTier: ["Bronze", "Silver", "Gold", "Platinum"][
        Math.floor(Math.random() * 4)
      ],
      loyaltyPoints: Math.floor(Math.random() * 50000),
      preferredRoomType: ["Standard", "Deluxe", "Suite", "Executive"][
        Math.floor(Math.random() * 4)
      ],
    },
  }));
}

export function getRestaurantContacts(): MockContact[] {
  return MOCK_CONTACTS.map((c) => ({
    ...c,
    metadata: {
      preferredSeating: ["Booth", "Window", "Patio", "Bar"][
        Math.floor(Math.random() * 4)
      ],
      dietaryRestrictions: [
        null,
        "Vegetarian",
        "Vegan",
        "Gluten-Free",
        "Nut Allergy",
      ][Math.floor(Math.random() * 5)],
      avgPartySize: Math.floor(Math.random() * 6) + 1,
    },
  }));
}

export function getSalonContacts(): MockContact[] {
  return MOCK_CONTACTS.map((c) => ({
    ...c,
    metadata: {
      preferredStylist: ["Alex", "Jordan", "Sam", "Taylor", null][
        Math.floor(Math.random() * 5)
      ],
      usualServices: ["Haircut", "Color", "Highlights", "Treatment", "Styling"][
        Math.floor(Math.random() * 5)
      ],
    },
  }));
}

// Get contacts based on industry
export function getMockContacts(industry: string): MockContact[] {
  switch (industry) {
    case "clinic":
    case "medical_practice":
    case "dental_practice":
    case "medical":
    case "dental":
      return getClinicContacts();
    case "hotel":
    case "boutique_hotel":
    case "resort":
    case "motel":
      return getHotelContacts();
    case "restaurant":
      return getRestaurantContacts();
    case "salon":
      return getSalonContacts();
    default:
      return MOCK_CONTACTS;
  }
}
