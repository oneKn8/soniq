"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIndustry } from "@/context/IndustryContext";
import {
  getCalendarEvents,
  getDateRangeForView,
  navigateCalendar,
  getDaySummary,
} from "@/lib/api";
import { BookingForm } from "./BookingForm";
import type { CalendarEvent, CalendarView, DaySummary } from "@/types/crm";
import { cn } from "@/lib/utils";

// Auto-refresh interval in milliseconds (5 seconds for real-time feel)
const REFRESH_INTERVAL = 5000;

// ============================================================================
// CONSTANTS
// ============================================================================

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function getStatusColor(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
    case "pending":
      return "bg-amber-500/20 border-amber-500/30 text-amber-400";
    case "cancelled":
      return "bg-red-500/20 border-red-500/30 text-red-400";
    case "completed":
      return "bg-zinc-500/20 border-zinc-500/30 text-zinc-400";
    default:
      return "bg-indigo-500/20 border-indigo-500/30 text-indigo-400";
  }
}

// ============================================================================
// EVENT CARD
// ============================================================================

function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <div
      className={cn(
        "mb-1 rounded border px-2 py-1 text-xs truncate cursor-pointer hover:opacity-80",
        getStatusColor(event.status),
      )}
      title={`${event.title} - ${event.contact_name || "Unknown"}`}
    >
      <div className="font-medium truncate">{event.title}</div>
      {event.contact_name && (
        <div className="truncate opacity-75">{event.contact_name}</div>
      )}
    </div>
  );
}

// ============================================================================
// CALENDAR GRID
// ============================================================================

function MonthGrid({
  currentDate,
  events,
  onDayClick,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
}) {
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  );

  // Build calendar grid
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = [];

  // Add empty cells for days before the first
  for (let i = 0; i < startDay; i++) {
    week.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  // Add remaining days
  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push(week);
  }

  // Group events by date
  const eventsByDate = new Map<string, CalendarEvent[]>();
  events.forEach((event) => {
    const dateKey = event.start.split("T")[0];
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, []);
    }
    eventsByDate.get(dateKey)!.push(event);
  });

  return (
    <div className="flex-1 overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-zinc-800">
        {DAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-xs font-medium text-zinc-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid flex-1 grid-cols-7 auto-rows-fr">
        {weeks.map((weekDays, weekIndex) =>
          weekDays.map((date, dayIndex) => {
            if (!date) {
              return (
                <div
                  key={`empty-${weekIndex}-${dayIndex}`}
                  className="border-b border-r border-zinc-800/50 bg-zinc-900/30"
                />
              );
            }

            const dateKey = date.toISOString().split("T")[0];
            const dayEvents = eventsByDate.get(dateKey) || [];
            const today = isToday(date);

            return (
              <div
                key={dateKey}
                className={cn(
                  "min-h-[120px] border-b border-r border-zinc-800/50 p-1 cursor-pointer hover:bg-zinc-900/50",
                  today && "bg-indigo-500/5",
                )}
                onClick={() => onDayClick(date)}
              >
                <div
                  className={cn(
                    "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    today && "bg-indigo-500 text-white",
                    !today && "text-zinc-400",
                  )}
                >
                  {date.getDate()}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {dayEvents.slice(0, 3).map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="px-2 text-xs text-zinc-500">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DAY SUMMARY PANEL
// ============================================================================

function DaySummaryPanel({
  date,
  summary,
  events,
  onClose,
  onAddBooking,
}: {
  date: Date;
  summary: DaySummary | null;
  events: CalendarEvent[];
  onClose: () => void;
  onAddBooking: () => void;
}) {
  const { transactionLabel, transactionPluralLabel } = useIndustry();
  return (
    <div className="w-80 border-l border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <div>
          <div className="text-lg font-semibold text-white">
            {MONTHS[date.getMonth()]} {date.getDate()}
          </div>
          <div className="text-sm text-zinc-500">{DAYS[date.getDay()]}</div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="border-b border-zinc-800 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 text-center">
              <div className="text-lg font-semibold text-zinc-100">
                {summary.total_bookings}
              </div>
              <div className="text-xs text-zinc-500">
                {transactionPluralLabel}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 text-center">
              <div className="text-lg font-semibold text-emerald-400">
                {summary.available_slots}
              </div>
              <div className="text-xs text-zinc-500">Available</div>
            </div>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-4">
        {events.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">
            No {transactionPluralLabel.toLowerCase()} for this day
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-100">
                    {event.title}
                  </span>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs",
                      getStatusColor(event.status),
                    )}
                  >
                    {event.status}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {new Date(event.start).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {event.contact_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {event.contact_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Button */}
      <div className="border-t border-zinc-800 p-4">
        <Button className="w-full" onClick={onAddBooking}>
          <Plus className="mr-2 h-4 w-4" />
          Add {transactionLabel}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// CALENDAR PAGE
// ============================================================================

export default function CalendarPage() {
  const { transactionLabel } = useIndustry();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [view, setView] = React.useState<CalendarView>("month");
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [daySummary, setDaySummary] = React.useState<DaySummary | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [lastRefresh, setLastRefresh] = React.useState<Date>(new Date());

  // Load events function (reusable for initial load and refresh)
  const loadEvents = React.useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const { startDate, endDate } = getDateRangeForView(currentDate, view);
        const result = await getCalendarEvents(startDate, endDate);
        setEvents(result.events);
        setLastRefresh(new Date());
      } catch (err) {
        console.error("Failed to load events:", err);
        if (showLoading) setEvents([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentDate, view],
  );

  // Initial load and when date/view changes
  React.useEffect(() => {
    loadEvents(true);
  }, [loadEvents]);

  // Auto-refresh every 15 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      loadEvents(false);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [loadEvents]);

  // Load day summary when a date is selected
  React.useEffect(() => {
    if (!selectedDate) {
      setDaySummary(null);
      return;
    }

    const loadSummary = async () => {
      try {
        const dateStr = selectedDate.toISOString().split("T")[0];
        const summary = await getDaySummary(dateStr);
        setDaySummary(summary);
      } catch (err) {
        console.error("Failed to load day summary:", err);
        setDaySummary(null);
      }
    };

    loadSummary();
  }, [selectedDate]);

  const handleNavigate = (direction: "prev" | "next") => {
    setCurrentDate(navigateCalendar(currentDate, view, direction));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleManualRefresh = () => {
    loadEvents(false);
  };

  const handleBookingSuccess = () => {
    loadEvents(false);
    // If we have a selected date, reload summary too
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split("T")[0];
      getDaySummary(dateStr).then(setDaySummary).catch(console.error);
    }
  };

  const selectedDateEvents = selectedDate
    ? events.filter((e) => {
        const eventDate = new Date(e.start);
        return isSameDay(eventDate, selectedDate);
      })
    : [];

  return (
    <div className="flex h-full">
      {/* Main Calendar Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-white">Calendar</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => handleNavigate("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[160px] text-center font-medium text-zinc-100">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => handleNavigate("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title={`Last updated: ${lastRefresh.toLocaleTimeString()}`}
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              />
            </Button>
            <div className="flex rounded-md border border-zinc-800">
              {(["month", "week", "day"] as CalendarView[]).map((v) => (
                <Button
                  key={v}
                  variant={view === v ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "rounded-none capitalize",
                    v === "month" && "rounded-l-md",
                    v === "day" && "rounded-r-md",
                  )}
                  onClick={() => setView(v)}
                >
                  {v}
                </Button>
              ))}
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New {transactionLabel}
            </Button>
          </div>
        </div>

        {/* Calendar Content */}
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-zinc-500">Loading calendar...</div>
          </div>
        ) : (
          <MonthGrid
            currentDate={currentDate}
            events={events}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      {/* Day Summary Panel */}
      {selectedDate && (
        <DaySummaryPanel
          date={selectedDate}
          summary={daySummary}
          events={selectedDateEvents}
          onClose={() => setSelectedDate(null)}
          onAddBooking={() => setIsFormOpen(true)}
        />
      )}

      {/* Booking Form Modal */}
      <BookingForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialDate={selectedDate?.toISOString().split("T")[0]}
        onSuccess={handleBookingSuccess}
      />
    </div>
  );
}
