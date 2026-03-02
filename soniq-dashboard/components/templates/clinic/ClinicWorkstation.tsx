"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useIndustry } from "@/context/IndustryContext";
import {
  TodayPanel,
  type ScheduleItem,
} from "@/components/workstation/TodayPanel";
import { QuickActions } from "@/components/workstation/QuickActions";
import {
  ActivityFeed,
  type Activity,
} from "@/components/workstation/ActivityFeed";
import {
  ContextPanel,
  InfoRow,
  Section,
} from "@/components/workstation/ContextPanel";
import {
  WaitingRoom,
  type WaitingPatient,
} from "@/components/workstation/WaitingRoom";
import {
  ProviderAvailability,
  type Provider,
} from "@/components/workstation/ProviderAvailability";
import {
  Phone,
  Calendar,
  FileText,
  Edit,
  ClipboardCheck,
  CalendarPlus,
  UserPlus,
  Stethoscope,
} from "lucide-react";

interface ClinicWorkstationProps {
  className?: string;
}

// Clinic-specific mock data for today's appointments
const CLINIC_SCHEDULE: ScheduleItem[] = [
  {
    id: "1",
    time: "09:00 AM",
    entityName: "John Smith",
    entityPhone: "+1 555-0123",
    type: "Check-up",
    status: "completed",
    notes: "Annual physical",
  },
  {
    id: "2",
    time: "10:30 AM",
    entityName: "Sarah Johnson",
    entityPhone: "+1 555-0124",
    type: "Follow-up",
    status: "in-progress",
    isVip: true,
    notes: "Post-surgery follow-up",
  },
  {
    id: "3",
    time: "11:00 AM",
    entityName: "Michael Brown",
    entityPhone: "+1 555-0125",
    type: "New Patient",
    status: "confirmed",
    notes: "Referral from Dr. Smith",
  },
  {
    id: "4",
    time: "02:00 PM",
    entityName: "Emily Davis",
    entityPhone: "+1 555-0126",
    type: "Consultation",
    status: "pending",
  },
  {
    id: "5",
    time: "03:30 PM",
    entityName: "Robert Wilson",
    entityPhone: "+1 555-0127",
    type: "Lab Results",
    status: "pending",
  },
];

// Clinic quick actions
const CLINIC_ACTIONS = [
  {
    id: "check-in",
    label: "Check In Patient",
    icon: "ClipboardCheck",
    action: "check-in",
    variant: "primary" as const,
  },
  {
    id: "new-appointment",
    label: "New Appointment",
    icon: "CalendarPlus",
    action: "/calendar?new=true",
  },
  {
    id: "new-patient",
    label: "New Patient",
    icon: "UserPlus",
    action: "/contacts?new=true",
  },
  {
    id: "call-patient",
    label: "Call Patient",
    icon: "Phone",
    action: "call",
  },
];

// Union type for context panel items
type ContextItem = ScheduleItem | Activity | WaitingPatient | Provider;

function isScheduleItem(item: ContextItem): item is ScheduleItem {
  return "entityPhone" in item && "time" in item;
}

function isWaitingPatient(item: ContextItem): item is WaitingPatient {
  return "checkedInAt" in item && "provider" in item;
}

function isProvider(item: ContextItem): item is Provider {
  return "specialty" in item || "appointmentsToday" in item;
}

export function ClinicWorkstation({ className }: ClinicWorkstationProps) {
  const { tenant } = useIndustry();
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContextItem | null>(null);

  // Handle schedule item click
  const handleScheduleItemClick = useCallback((item: ScheduleItem) => {
    setSelectedItem(item);
    setContextPanelOpen(true);
  }, []);

  // Handle waiting patient click
  const handleWaitingPatientClick = useCallback((patient: WaitingPatient) => {
    setSelectedItem(patient);
    setContextPanelOpen(true);
  }, []);

  // Handle provider click
  const handleProviderClick = useCallback((provider: Provider) => {
    setSelectedItem(provider);
    setContextPanelOpen(true);
  }, []);

  // Handle activity click
  const handleActivityClick = useCallback((activity: Activity) => {
    setSelectedItem(activity);
    setContextPanelOpen(true);
  }, []);

  // Handle ready click for waiting patients
  const handleReadyClick = useCallback((patient: WaitingPatient) => {
    console.log("Mark ready:", patient);
  }, []);

  // Handle book appointment for provider
  const handleBookClick = useCallback((provider: Provider) => {
    console.log("Book with:", provider);
  }, []);

  // Handle call action
  const handleCallClick = useCallback((item: ScheduleItem) => {
    if (item.entityPhone) {
      window.open(`tel:${item.entityPhone}`);
    }
  }, []);

  // Close context panel
  const closeContextPanel = useCallback(() => {
    setContextPanelOpen(false);
    setSelectedItem(null);
  }, []);

  // Get context panel title
  const getContextPanelTitle = () => {
    if (!selectedItem) return "Details";
    if (isScheduleItem(selectedItem)) return selectedItem.entityName;
    if (isWaitingPatient(selectedItem)) return selectedItem.name;
    if (isProvider(selectedItem)) return selectedItem.name;
    return (selectedItem as Activity).title;
  };

  // Context panel actions
  const contextPanelActions = selectedItem
    ? [
        ...(isScheduleItem(selectedItem) && selectedItem.entityPhone
          ? [
              {
                id: "call",
                label: "Call",
                icon: Phone,
                onClick: () => handleCallClick(selectedItem),
                variant: "primary" as const,
              },
            ]
          : []),
        {
          id: "edit",
          label: "Edit",
          icon: Edit,
          onClick: () => console.log("Edit", selectedItem),
        },
      ]
    : [];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-industry" />
            Patient Schedule
          </h1>
          <p className="text-sm text-muted-foreground">
            {tenant?.business_name || "Medical Practice"} -{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Primary metric */}
        <div className="hidden sm:block text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Patients Today
          </p>
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {CLINIC_SCHEDULE.length}
          </p>
        </div>
      </div>

      {/* Main Grid - Clinic Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Schedule (main focus) */}
        <div className="lg:col-span-2 space-y-4">
          <TodayPanel
            title="Today's Appointments"
            items={CLINIC_SCHEDULE}
            onItemClick={handleScheduleItemClick}
            onCallClick={handleCallClick}
          />
        </div>

        {/* Right Column - Sidebar widgets */}
        <div className="space-y-4">
          {/* Waiting Room */}
          <WaitingRoom
            onPatientClick={handleWaitingPatientClick}
            onReadyClick={handleReadyClick}
          />

          {/* Quick Actions */}
          <QuickActions title="Quick Actions" actions={CLINIC_ACTIONS} />
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Provider Availability */}
        <ProviderAvailability
          onProviderClick={handleProviderClick}
          onBookClick={handleBookClick}
        />

        {/* Activity Feed */}
        <ActivityFeed
          title="Recent Activity"
          onActivityClick={handleActivityClick}
          maxItems={5}
        />
      </div>

      {/* Context Panel */}
      <ContextPanel
        open={contextPanelOpen}
        onClose={closeContextPanel}
        title={getContextPanelTitle()}
        subtitle={
          selectedItem
            ? isScheduleItem(selectedItem)
              ? selectedItem.type || "Appointment"
              : isWaitingPatient(selectedItem)
                ? "Waiting Patient"
                : isProvider(selectedItem)
                  ? selectedItem.title
                  : "Activity"
            : ""
        }
        actions={contextPanelActions}
      >
        {selectedItem && isScheduleItem(selectedItem) && (
          <div className="space-y-0">
            <Section title="Contact Information">
              {selectedItem.entityPhone && (
                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={selectedItem.entityPhone}
                  onClick={() => handleCallClick(selectedItem)}
                />
              )}
              <InfoRow
                icon={Calendar}
                label="Scheduled"
                value={`${selectedItem.time} - ${selectedItem.type || "Appointment"}`}
              />
              <InfoRow
                icon={FileText}
                label="Status"
                value={
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      selectedItem.status === "completed" &&
                        "bg-green-500/10 text-green-500",
                      selectedItem.status === "in-progress" &&
                        "bg-amber-500/10 text-amber-500",
                      selectedItem.status === "confirmed" &&
                        "bg-blue-500/10 text-blue-500",
                      selectedItem.status === "pending" &&
                        "bg-muted text-muted-foreground",
                    )}
                  >
                    {selectedItem.status
                      .replace("-", " ")
                      .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </span>
                }
              />
            </Section>

            {selectedItem.notes && (
              <Section title="Notes">
                <p className="text-sm text-foreground">{selectedItem.notes}</p>
              </Section>
            )}

            <Section
              title="Patient History"
              action={{
                label: "View all",
                onClick: () => console.log("View history"),
              }}
            >
              <p className="text-sm text-muted-foreground">
                Previous visits and medical history will appear here.
              </p>
            </Section>
          </div>
        )}

        {selectedItem && isWaitingPatient(selectedItem) && (
          <div className="space-y-0">
            <Section title="Appointment Details">
              <InfoRow
                icon={Calendar}
                label="Appointment"
                value={selectedItem.appointmentTime}
              />
              <InfoRow icon={FileText} label="Type" value={selectedItem.type} />
              <InfoRow
                icon={Stethoscope}
                label="Provider"
                value={selectedItem.provider}
              />
            </Section>

            <Section title="Wait Status">
              <p className="text-sm text-foreground">
                Checked in and waiting in the reception area.
              </p>
            </Section>
          </div>
        )}

        {selectedItem && isProvider(selectedItem) && (
          <div className="space-y-0">
            <Section title="Provider Information">
              <InfoRow
                icon={FileText}
                label="Title"
                value={selectedItem.title}
              />
              {selectedItem.specialty && (
                <InfoRow
                  icon={Stethoscope}
                  label="Specialty"
                  value={selectedItem.specialty}
                />
              )}
            </Section>

            <Section title="Today's Schedule">
              <p className="text-sm text-foreground">
                {selectedItem.appointmentsCompleted} of{" "}
                {selectedItem.appointmentsToday} appointments completed.
              </p>
            </Section>
          </div>
        )}
      </ContextPanel>
    </div>
  );
}
