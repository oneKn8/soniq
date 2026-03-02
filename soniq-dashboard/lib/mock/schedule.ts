// Mock schedule/booking data

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "no-show"
  | "cancelled";

export interface MockBooking {
  id: string;
  contactId?: string;
  contactName: string;
  contactPhone: string;
  date: Date;
  time: string;
  endTime?: string;
  type: string;
  status: BookingStatus;
  provider?: string;
  resource?: string;
  notes?: string;
  isVip?: boolean;
  createdAt: Date;
  createdBy: "ai" | "manual" | "online";
}

// Today's date at midnight
const today = new Date();
today.setHours(0, 0, 0, 0);

// Generate bookings for today
export const MOCK_SCHEDULE: MockBooking[] = [
  {
    id: "b1",
    contactId: "c1",
    contactName: "John Smith",
    contactPhone: "+1 555-123-4567",
    date: today,
    time: "9:00 AM",
    endTime: "9:30 AM",
    type: "Consultation",
    status: "completed",
    provider: "Dr. Williams",
    notes: "Follow-up from last visit",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    createdBy: "ai",
  },
  {
    id: "b2",
    contactId: "c2",
    contactName: "Sarah Johnson",
    contactPhone: "+1 555-234-5678",
    date: today,
    time: "10:30 AM",
    endTime: "11:00 AM",
    type: "Follow-up",
    status: "in-progress",
    provider: "Dr. Williams",
    isVip: true,
    notes: "VIP - extra time if needed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    createdBy: "online",
  },
  {
    id: "b3",
    contactId: "c3",
    contactName: "Michael Brown",
    contactPhone: "+1 555-345-6789",
    date: today,
    time: "11:00 AM",
    endTime: "11:45 AM",
    type: "New Patient",
    status: "confirmed",
    provider: "Dr. Chen",
    notes: "First visit - allow extra time for paperwork",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    createdBy: "ai",
  },
  {
    id: "b4",
    contactId: "c4",
    contactName: "Emily Davis",
    contactPhone: "+1 555-456-7890",
    date: today,
    time: "2:00 PM",
    endTime: "2:30 PM",
    type: "Check-up",
    status: "pending",
    provider: "Dr. Williams",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    createdBy: "manual",
  },
  {
    id: "b5",
    contactId: "c5",
    contactName: "Robert Wilson",
    contactPhone: "+1 555-567-8901",
    date: today,
    time: "3:30 PM",
    endTime: "4:00 PM",
    type: "Consultation",
    status: "pending",
    provider: "Dr. Chen",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    createdBy: "ai",
  },
  {
    id: "b6",
    contactId: "c6",
    contactName: "Jennifer Martinez",
    contactPhone: "+1 555-678-9012",
    date: today,
    time: "4:30 PM",
    endTime: "5:00 PM",
    type: "Follow-up",
    status: "confirmed",
    provider: "Dr. Williams",
    isVip: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    createdBy: "online",
  },
];

// Generate industry-specific bookings
export function getClinicSchedule(): MockBooking[] {
  return MOCK_SCHEDULE.map((b) => ({
    ...b,
    type: ["Check-up", "Consultation", "Follow-up", "Procedure", "New Patient"][
      Math.floor(Math.random() * 5)
    ],
    resource: `Room ${Math.floor(Math.random() * 5) + 1}`,
  }));
}

export function getHotelSchedule(): MockBooking[] {
  return MOCK_SCHEDULE.map((b, i) => ({
    ...b,
    type: i % 2 === 0 ? "Check-in" : "Check-out",
    resource: `Room ${100 + Math.floor(Math.random() * 50)}`,
  }));
}

export function getRestaurantSchedule(): MockBooking[] {
  return MOCK_SCHEDULE.map((b) => ({
    ...b,
    type: `Party of ${Math.floor(Math.random() * 6) + 2}`,
    resource: `Table ${Math.floor(Math.random() * 20) + 1}`,
    notes:
      [
        "Window seat requested",
        "Birthday celebration",
        "Anniversary dinner",
        null,
      ][Math.floor(Math.random() * 4)] || b.notes,
  }));
}

export function getSalonSchedule(): MockBooking[] {
  return MOCK_SCHEDULE.map((b) => ({
    ...b,
    type: [
      "Haircut",
      "Color",
      "Highlights",
      "Treatment",
      "Styling",
      "Manicure",
    ][Math.floor(Math.random() * 6)],
    provider: ["Alex", "Jordan", "Sam", "Taylor"][
      Math.floor(Math.random() * 4)
    ],
  }));
}

// Get schedule based on industry
export function getMockSchedule(industry: string): MockBooking[] {
  switch (industry) {
    case "clinic":
    case "medical_practice":
    case "dental_practice":
    case "medical":
    case "dental":
      return getClinicSchedule();
    case "hotel":
    case "boutique_hotel":
    case "resort":
    case "motel":
      return getHotelSchedule();
    case "restaurant":
      return getRestaurantSchedule();
    case "salon":
      return getSalonSchedule();
    default:
      return MOCK_SCHEDULE;
  }
}

// Get schedule stats
export function getScheduleStats(industry?: string) {
  const schedule = industry ? getMockSchedule(industry) : MOCK_SCHEDULE;

  return {
    total: schedule.length,
    pending: schedule.filter((b) => b.status === "pending").length,
    confirmed: schedule.filter((b) => b.status === "confirmed").length,
    inProgress: schedule.filter((b) => b.status === "in-progress").length,
    completed: schedule.filter((b) => b.status === "completed").length,
    noShow: schedule.filter((b) => b.status === "no-show").length,
    cancelled: schedule.filter((b) => b.status === "cancelled").length,
    vip: schedule.filter((b) => b.isVip).length,
  };
}

// Get upcoming bookings
export function getUpcomingBookings(limit?: number): MockBooking[] {
  const upcoming = MOCK_SCHEDULE.filter(
    (b) => b.status === "pending" || b.status === "confirmed",
  ).sort((a, b) => {
    // Simple time comparison (assumes same day)
    return a.time.localeCompare(b.time);
  });

  return limit ? upcoming.slice(0, limit) : upcoming;
}
