"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { RoomGrid, type HotelRoom } from "@/components/workstation/RoomGrid";
import { VIPAlerts, type VIPAlert } from "@/components/workstation/VIPAlerts";
import {
  Phone,
  Calendar,
  FileText,
  Edit,
  LogIn,
  LogOut,
  CalendarPlus,
  BedDouble,
  Building,
  Star,
} from "lucide-react";

interface HotelWorkstationProps {
  className?: string;
}

// Hotel-specific mock data for arrivals/departures
const HOTEL_ARRIVALS: ScheduleItem[] = [
  {
    id: "a1",
    time: "02:00 PM",
    entityName: "Mr. Robert Chen",
    entityPhone: "+1 555-0201",
    type: "Check-in",
    status: "pending",
    isVip: true,
    notes: "Penthouse Suite - VIP Executive",
  },
  {
    id: "a2",
    time: "03:00 PM",
    entityName: "The Martinez Family",
    entityPhone: "+1 555-0202",
    type: "Check-in",
    status: "confirmed",
    notes: "Suite 301 - Anniversary celebration",
  },
  {
    id: "a3",
    time: "04:00 PM",
    entityName: "Dr. Sarah Thompson",
    entityPhone: "+1 555-0203",
    type: "Check-in",
    status: "pending",
    notes: "Deluxe Room 201",
  },
  {
    id: "a4",
    time: "05:30 PM",
    entityName: "James Wilson",
    entityPhone: "+1 555-0204",
    type: "Check-in",
    status: "pending",
    notes: "Standard Room 104",
  },
];

const HOTEL_DEPARTURES: ScheduleItem[] = [
  {
    id: "d1",
    time: "11:00 AM",
    entityName: "Emily Davis",
    entityPhone: "+1 555-0301",
    type: "Check-out",
    status: "completed",
    notes: "Room 203 - Express checkout",
  },
  {
    id: "d2",
    time: "11:00 AM",
    entityName: "Jennifer Martinez",
    entityPhone: "+1 555-0302",
    type: "Check-out",
    status: "in-progress",
    notes: "Suite 303 - Reviewing bill",
  },
  {
    id: "d3",
    time: "12:00 PM",
    entityName: "Michael Brown",
    entityPhone: "+1 555-0303",
    type: "Check-out",
    status: "confirmed",
    isVip: true,
    notes: "Suite 206 - Late checkout approved",
  },
];

// Hotel quick actions
const HOTEL_ACTIONS = [
  {
    id: "check-in",
    label: "Check In Guest",
    icon: "LogIn",
    action: "check-in",
    variant: "primary" as const,
  },
  {
    id: "check-out",
    label: "Check Out",
    icon: "LogOut",
    action: "check-out",
  },
  {
    id: "new-reservation",
    label: "New Reservation",
    icon: "CalendarPlus",
    action: "/calendar?new=true",
  },
  {
    id: "room-status",
    label: "Room Status",
    icon: "BedDouble",
    action: "/resources",
  },
];

// Union type for context panel items
type ContextItem = ScheduleItem | Activity | HotelRoom | VIPAlert;

function isScheduleItem(item: ContextItem): item is ScheduleItem {
  return "entityPhone" in item && "time" in item;
}

function isHotelRoom(item: ContextItem): item is HotelRoom {
  return "floor" in item && "number" in item;
}

function isVIPAlert(item: ContextItem): item is VIPAlert {
  return "guestName" in item && "priority" in item && "message" in item;
}

export function HotelWorkstation({ className }: HotelWorkstationProps) {
  const { tenant } = useIndustry();
  const router = useRouter();
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContextItem | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(
    new Set(),
  );

  // Handle arrival/departure click
  const handleScheduleItemClick = useCallback((item: ScheduleItem) => {
    setSelectedItem(item);
    setContextPanelOpen(true);
  }, []);

  // Handle room click
  const handleRoomClick = useCallback((room: HotelRoom) => {
    setSelectedItem(room);
    setContextPanelOpen(true);
  }, []);

  // Handle VIP alert click
  const handleAlertClick = useCallback((alert: VIPAlert) => {
    setSelectedItem(alert);
    setContextPanelOpen(true);
  }, []);

  // Handle activity click
  const handleActivityClick = useCallback((activity: Activity) => {
    setSelectedItem(activity);
    setContextPanelOpen(true);
  }, []);

  // Handle call action
  const handleCallClick = useCallback((item: ScheduleItem) => {
    if (item.entityPhone) {
      window.open(`tel:${item.entityPhone}`);
    }
  }, []);

  // Handle dismiss VIP alert
  const handleDismissAlert = useCallback((alert: VIPAlert) => {
    setDismissedAlertIds((prev) => new Set([...prev, alert.id]));
  }, []);

  // Handle view all alerts
  const handleViewAllAlerts = useCallback(() => {
    router.push("/notifications");
  }, [router]);

  // Close context panel
  const closeContextPanel = useCallback(() => {
    setContextPanelOpen(false);
    setSelectedItem(null);
  }, []);

  // Handle edit from context panel
  const handleEditItem = useCallback(() => {
    if (!selectedItem) return;
    if (isScheduleItem(selectedItem)) {
      router.push("/contacts");
    } else if (isHotelRoom(selectedItem)) {
      router.push("/resources");
    } else if (isVIPAlert(selectedItem)) {
      router.push("/notifications");
    }
    closeContextPanel();
  }, [selectedItem, router, closeContextPanel]);

  // Get context panel title
  const getContextPanelTitle = () => {
    if (!selectedItem) return "Details";
    if (isScheduleItem(selectedItem)) return selectedItem.entityName;
    if (isHotelRoom(selectedItem)) return `Room ${selectedItem.number}`;
    if (isVIPAlert(selectedItem)) return selectedItem.guestName;
    return (selectedItem as Activity).title;
  };

  // Count arrivals and departures
  const arrivalsToday = HOTEL_ARRIVALS.filter(
    (a) => a.status !== "completed",
  ).length;
  const departuresToday = HOTEL_DEPARTURES.filter(
    (d) => d.status !== "completed",
  ).length;

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
          onClick: handleEditItem,
        },
      ]
    : [];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building className="h-6 w-6 text-industry" />
            Front Desk
          </h1>
          <p className="text-sm text-muted-foreground">
            {tenant?.business_name || "Hotel"} -{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Primary metrics */}
        <div className="hidden sm:flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Arrivals
            </p>
            <p className="text-3xl font-bold text-green-500 tabular-nums">
              {arrivalsToday}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Departures
            </p>
            <p className="text-3xl font-bold text-orange-500 tabular-nums">
              {departuresToday}
            </p>
          </div>
        </div>
      </div>

      {/* Room Grid - Full Width */}
      <RoomGrid
        title="Room Status"
        onRoomClick={handleRoomClick}
        viewMode="floor"
      />

      {/* Main Grid - Arrivals, Departures, and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Arrivals */}
        <TodayPanel
          title="Today's Arrivals"
          items={HOTEL_ARRIVALS}
          onItemClick={handleScheduleItemClick}
          onCallClick={handleCallClick}
          emptyMessage="No arrivals scheduled for today"
        />

        {/* Middle Column - Departures */}
        <TodayPanel
          title="Today's Departures"
          items={HOTEL_DEPARTURES}
          onItemClick={handleScheduleItemClick}
          onCallClick={handleCallClick}
          emptyMessage="No departures scheduled for today"
        />

        {/* Right Column - VIP Alerts & Quick Actions */}
        <div className="space-y-4">
          <VIPAlerts
            title="VIP Alerts"
            onAlertClick={handleAlertClick}
            onDismiss={handleDismissAlert}
            onViewAll={handleViewAllAlerts}
            maxAlerts={4}
          />

          <QuickActions title="Quick Actions" actions={HOTEL_ACTIONS} />
        </div>
      </div>

      {/* Activity Feed */}
      <ActivityFeed
        title="Recent Activity"
        onActivityClick={handleActivityClick}
        maxItems={5}
      />

      {/* Context Panel */}
      <ContextPanel
        open={contextPanelOpen}
        onClose={closeContextPanel}
        title={getContextPanelTitle()}
        subtitle={
          selectedItem
            ? isScheduleItem(selectedItem)
              ? selectedItem.type || "Guest"
              : isHotelRoom(selectedItem)
                ? selectedItem.type
                : isVIPAlert(selectedItem)
                  ? "VIP Alert"
                  : "Activity"
            : ""
        }
        actions={contextPanelActions}
      >
        {selectedItem && isScheduleItem(selectedItem) && (
          <div className="space-y-0">
            <Section title="Guest Information">
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
                label={
                  selectedItem.type === "Check-in" ? "Arrival" : "Departure"
                }
                value={selectedItem.time}
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
              <Section title="Reservation Notes">
                <p className="text-sm text-foreground">{selectedItem.notes}</p>
              </Section>
            )}

            {selectedItem.isVip && (
              <Section title="VIP Status">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <p className="text-sm text-foreground">
                    VIP Guest - Special attention required
                  </p>
                </div>
              </Section>
            )}

            <Section
              title="Stay History"
              action={{
                label: "View all",
                onClick: () => router.push("/calls"),
              }}
            >
              <p className="text-sm text-muted-foreground">
                Previous stays and preferences will appear here.
              </p>
            </Section>
          </div>
        )}

        {selectedItem && isHotelRoom(selectedItem) && (
          <div className="space-y-0">
            <Section title="Room Information">
              <InfoRow
                icon={BedDouble}
                label="Room Type"
                value={selectedItem.type}
              />
              <InfoRow
                icon={Building}
                label="Floor"
                value={`Floor ${selectedItem.floor}`}
              />
              <InfoRow
                icon={FileText}
                label="Status"
                value={selectedItem.status.replace("-", " ")}
              />
            </Section>

            {selectedItem.guestName && (
              <Section title="Current Guest">
                <div className="flex items-center gap-2">
                  {selectedItem.isVip && (
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  )}
                  <p className="text-sm text-foreground">
                    {selectedItem.guestName}
                  </p>
                </div>
                {selectedItem.checkoutTime && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Checkout: {selectedItem.checkoutTime}
                  </p>
                )}
              </Section>
            )}

            {selectedItem.notes && (
              <Section title="Notes">
                <p className="text-sm text-foreground">{selectedItem.notes}</p>
              </Section>
            )}
          </div>
        )}

        {selectedItem && isVIPAlert(selectedItem) && (
          <div className="space-y-0">
            <Section title="Alert Details">
              <InfoRow
                icon={Star}
                label="Guest"
                value={selectedItem.guestName}
              />
              {selectedItem.roomNumber && (
                <InfoRow
                  icon={BedDouble}
                  label="Room"
                  value={selectedItem.roomNumber}
                />
              )}
            </Section>

            <Section title="Message">
              <p className="text-sm text-foreground">{selectedItem.message}</p>
            </Section>
          </div>
        )}
      </ContextPanel>
    </div>
  );
}
