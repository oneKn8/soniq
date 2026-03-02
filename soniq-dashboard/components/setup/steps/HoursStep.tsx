"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useSetup } from "../SetupContext";

const DAYS = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

const TIME_OPTIONS = [
  "00:00",
  "00:30",
  "01:00",
  "01:30",
  "02:00",
  "02:30",
  "03:00",
  "03:30",
  "04:00",
  "04:30",
  "05:00",
  "05:30",
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
];

const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

const AFTER_HOURS_OPTIONS = [
  {
    value: "answer_closed",
    label: "Still answer and let callers know we're closed",
    description: "Your assistant will answer and offer to take a message",
  },
  {
    value: "message_only",
    label: "Take messages only",
    description: "Skip the conversation, just collect contact info",
  },
  {
    value: "voicemail",
    label: "Send to voicemail",
    description: "Play a message and record their voicemail",
  },
  {
    value: "forward_emergency",
    label: "Forward to emergency contact",
    description: "Connect urgent calls to your escalation contact",
  },
];

function formatTime(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function HoursStep() {
  const router = useRouter();
  const { state, dispatch, saveStep, goToNextStep, goToPreviousStep } =
    useSetup();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { timezone, sameEveryDay, schedule, afterHoursBehavior } =
    state.hoursData;

  // Auto-detect timezone on mount
  useEffect(() => {
    if (!timezone) {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      dispatch({
        type: "SET_HOURS_DATA",
        payload: { timezone: detected },
      });
    }
  }, [timezone, dispatch]);

  const canContinue = timezone !== "";

  const updateDaySchedule = (
    day: string,
    field: "status" | "open" | "close",
    value: string,
  ) => {
    const newSchedule = { ...schedule };
    newSchedule[day] = { ...newSchedule[day], [field]: value };
    dispatch({
      type: "SET_HOURS_DATA",
      payload: { schedule: newSchedule },
    });
  };

  const handleSameEveryDayChange = (checked: boolean) => {
    dispatch({
      type: "SET_HOURS_DATA",
      payload: { sameEveryDay: checked },
    });

    if (checked) {
      // Apply Monday's schedule to all days
      const mondaySchedule = schedule.monday;
      const newSchedule = { ...schedule };
      DAYS.forEach((day) => {
        if (day.key !== "saturday" && day.key !== "sunday") {
          newSchedule[day.key] = { ...mondaySchedule };
        }
      });
      dispatch({
        type: "SET_HOURS_DATA",
        payload: { schedule: newSchedule },
      });
    }
  };

  const handleContinue = async () => {
    if (!canContinue) return;

    setIsSubmitting(true);
    const success = await saveStep("hours");
    if (success) {
      goToNextStep();
      router.push("/setup/escalation");
    }
    setIsSubmitting(false);
  };

  const handleBack = () => {
    goToPreviousStep();
    router.push("/setup/phone");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          When are you open?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Set your operating hours so your assistant knows when to take calls
        </p>
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) =>
            dispatch({
              type: "SET_HOURS_DATA",
              payload: { timezone: e.target.value },
            })
          }
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Select timezone</option>
          {US_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Same hours toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>Same hours every weekday</Label>
          <p className="text-sm text-muted-foreground">
            Monday through Friday have the same hours
          </p>
        </div>
        <Switch
          checked={sameEveryDay}
          onCheckedChange={handleSameEveryDayChange}
        />
      </div>

      {/* Hours schedule */}
      <div className="space-y-4">
        <Label>Operating hours</Label>

        {sameEveryDay ? (
          /* Same every day - single row for weekdays */
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Monday - Friday</span>
                <div className="flex items-center gap-2">
                  <select
                    value={schedule.monday?.status || "open"}
                    onChange={(e) => {
                      const status = e.target.value;
                      const newSchedule = { ...schedule };
                      DAYS.slice(0, 5).forEach((day) => {
                        newSchedule[day.key] = {
                          ...newSchedule[day.key],
                          status,
                        };
                      });
                      dispatch({
                        type: "SET_HOURS_DATA",
                        payload: { schedule: newSchedule },
                      });
                    }}
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="24hours">24 Hours</option>
                  </select>
                  {schedule.monday?.status === "open" && (
                    <>
                      <select
                        value={schedule.monday?.open || "09:00"}
                        onChange={(e) => {
                          const open = e.target.value;
                          const newSchedule = { ...schedule };
                          DAYS.slice(0, 5).forEach((day) => {
                            newSchedule[day.key] = {
                              ...newSchedule[day.key],
                              open,
                            };
                          });
                          dispatch({
                            type: "SET_HOURS_DATA",
                            payload: { schedule: newSchedule },
                          });
                        }}
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>
                            {formatTime(time)}
                          </option>
                        ))}
                      </select>
                      <span className="text-muted-foreground">to</span>
                      <select
                        value={schedule.monday?.close || "17:00"}
                        onChange={(e) => {
                          const close = e.target.value;
                          const newSchedule = { ...schedule };
                          DAYS.slice(0, 5).forEach((day) => {
                            newSchedule[day.key] = {
                              ...newSchedule[day.key],
                              close,
                            };
                          });
                          dispatch({
                            type: "SET_HOURS_DATA",
                            payload: { schedule: newSchedule },
                          });
                        }}
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>
                            {formatTime(time)}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Weekend rows */}
            {DAYS.slice(5).map((day) => (
              <div key={day.key} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{day.label}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={schedule[day.key]?.status || "closed"}
                      onChange={(e) =>
                        updateDaySchedule(day.key, "status", e.target.value)
                      }
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="24hours">24 Hours</option>
                    </select>
                    {schedule[day.key]?.status === "open" && (
                      <>
                        <select
                          value={schedule[day.key]?.open || "09:00"}
                          onChange={(e) =>
                            updateDaySchedule(day.key, "open", e.target.value)
                          }
                          className="h-8 rounded-md border bg-background px-2 text-sm"
                        >
                          {TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {formatTime(time)}
                            </option>
                          ))}
                        </select>
                        <span className="text-muted-foreground">to</span>
                        <select
                          value={schedule[day.key]?.close || "17:00"}
                          onChange={(e) =>
                            updateDaySchedule(day.key, "close", e.target.value)
                          }
                          className="h-8 rounded-md border bg-background px-2 text-sm"
                        >
                          {TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {formatTime(time)}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Different hours per day */
          <div className="space-y-2">
            {DAYS.map((day) => (
              <div
                key={day.key}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span className="w-24 font-medium">{day.label}</span>
                <div className="flex items-center gap-2">
                  <select
                    value={schedule[day.key]?.status || "open"}
                    onChange={(e) =>
                      updateDaySchedule(day.key, "status", e.target.value)
                    }
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="24hours">24 Hours</option>
                  </select>
                  {schedule[day.key]?.status === "open" && (
                    <>
                      <select
                        value={schedule[day.key]?.open || "09:00"}
                        onChange={(e) =>
                          updateDaySchedule(day.key, "open", e.target.value)
                        }
                        className="h-8 w-24 rounded-md border bg-background px-2 text-sm"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>
                            {formatTime(time)}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-muted-foreground">to</span>
                      <select
                        value={schedule[day.key]?.close || "17:00"}
                        onChange={(e) =>
                          updateDaySchedule(day.key, "close", e.target.value)
                        }
                        className="h-8 w-24 rounded-md border bg-background px-2 text-sm"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>
                            {formatTime(time)}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* After hours behavior */}
      <div className="space-y-3">
        <Label>After-hours behavior</Label>
        <div className="space-y-2">
          {AFTER_HOURS_OPTIONS.map((option) => {
            const isSelected = afterHoursBehavior === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 hover:bg-muted/50",
                  isSelected && "border-primary bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  name="afterHours"
                  value={option.value}
                  checked={isSelected}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_HOURS_DATA",
                      payload: { afterHoursBehavior: e.target.value },
                    })
                  }
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <span className="font-medium">{option.label}</span>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!canContinue || isSubmitting}
          size="lg"
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
