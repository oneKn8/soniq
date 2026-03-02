// Mock data exports
export * from "./contacts";
export * from "./calls";
export * from "./escalations";
export * from "./schedule";

// Feature flag for using mock data
export const USE_MOCK_DATA =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || true;

// Import functions for getMockData helper
import { getMockContacts } from "./contacts";
import { getMockCalls, getCallStats } from "./calls";
import { getEscalationQueue, getEscalationStats } from "./escalations";
import { getMockSchedule, getScheduleStats } from "./schedule";

// Combined mock data helper
export function getMockData(industry: string) {
  return {
    contacts: getMockContacts(industry),
    calls: getMockCalls(),
    callStats: getCallStats(),
    escalations: getEscalationQueue({ status: "waiting" }),
    escalationStats: getEscalationStats(),
    schedule: getMockSchedule(industry),
    scheduleStats: getScheduleStats(industry),
  };
}
