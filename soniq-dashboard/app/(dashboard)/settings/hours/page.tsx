"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { put } from "@/lib/api/client";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import Link from "next/link";

// Aceternity & MagicUI components
import { TextGenerateEffect } from "@/components/aceternity/text-generate-effect";
import { SpotlightNew } from "@/components/aceternity/spotlight";
import { ShimmerButton } from "@/components/magicui/shimmer-button";

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

interface DayScheduleData {
  status: string;
  open: string;
  close: string;
}

interface HoursSettings {
  timezone: string;
  sameEveryDay: boolean;
  schedule: Record<string, DayScheduleData>;
  afterHoursBehavior: string;
}

const DEFAULT_SCHEDULE: Record<string, DayScheduleData> = {
  monday: { status: "open", open: "09:00", close: "17:00" },
  tuesday: { status: "open", open: "09:00", close: "17:00" },
  wednesday: { status: "open", open: "09:00", close: "17:00" },
  thursday: { status: "open", open: "09:00", close: "17:00" },
  friday: { status: "open", open: "09:00", close: "17:00" },
  saturday: { status: "closed", open: "09:00", close: "17:00" },
  sunday: { status: "closed", open: "09:00", close: "17:00" },
};

export default function HoursSettingsPage() {
  const { currentTenant, refreshTenants } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<HoursSettings>({
    timezone: "",
    sameEveryDay: true,
    schedule: DEFAULT_SCHEDULE,
    afterHoursBehavior: "answer_closed",
  });

  useEffect(() => {
    if (currentTenant) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tenantData = currentTenant as Record<string, any>;
      const operatingHours = tenantData.operating_hours || {};

      // Convert schedule array to object if needed
      let scheduleObj = DEFAULT_SCHEDULE;
      if (operatingHours.schedule) {
        if (Array.isArray(operatingHours.schedule)) {
          // Convert array format to object format
          scheduleObj = { ...DEFAULT_SCHEDULE };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          operatingHours.schedule.forEach((day: Record<string, any>) => {
            const dayName = DAYS[day.day]?.key;
            if (dayName) {
              scheduleObj[dayName] = {
                status: day.enabled ? "open" : "closed",
                open: day.openTime || "09:00",
                close: day.closeTime || "17:00",
              };
            }
          });
        } else {
          scheduleObj = operatingHours.schedule;
        }
      }

      setFormData({
        timezone: tenantData.timezone || operatingHours.timezone || "",
        sameEveryDay: checkIfSameEveryDay(scheduleObj),
        schedule: scheduleObj,
        afterHoursBehavior: tenantData.after_hours_behavior || "answer_closed",
      });
      setIsLoading(false);
    }
  }, [currentTenant]);

  const checkIfSameEveryDay = (
    schedule: Record<string, DayScheduleData>,
  ): boolean => {
    const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const firstDay = schedule.monday;
    return weekdays.every(
      (day) =>
        schedule[day]?.status === firstDay?.status &&
        schedule[day]?.open === firstDay?.open &&
        schedule[day]?.close === firstDay?.close,
    );
  };

  const updateDaySchedule = (
    day: string,
    field: "status" | "open" | "close",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], [field]: value },
      },
    }));
    setSaveSuccess(false);
    setError(null);
  };

  const handleSameEveryDayChange = (checked: boolean) => {
    setFormData((prev) => {
      const newData = { ...prev, sameEveryDay: checked };

      if (checked) {
        // Apply Monday's schedule to all weekdays
        const mondaySchedule = prev.schedule.monday;
        const newSchedule = { ...prev.schedule };
        DAYS.slice(0, 5).forEach((day) => {
          newSchedule[day.key] = { ...mondaySchedule };
        });
        newData.schedule = newSchedule;
      }

      return newData;
    });
    setSaveSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!currentTenant) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Convert schedule object to array format for API
      const scheduleArray = DAYS.map((day, index) => ({
        day: index,
        enabled: formData.schedule[day.key]?.status === "open",
        openTime: formData.schedule[day.key]?.open || "09:00",
        closeTime: formData.schedule[day.key]?.close || "17:00",
      }));

      await put(`/api/tenants/${currentTenant.id}`, {
        timezone: formData.timezone,
        operating_hours: {
          timezone: formData.timezone,
          schedule: scheduleArray,
          holidays: [],
        },
        after_hours_behavior: formData.afterHoursBehavior,
      });
      await refreshTenants();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = formData.timezone !== "";

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        <SpotlightNew className="opacity-20" />

        {/* Header */}
        <div className="relative z-10">
          <Link
            href="/settings"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          <TextGenerateEffect
            words="Operating Hours"
            className="text-2xl font-semibold text-foreground md:text-3xl"
            duration={0.3}
          />
          <p className="mt-2 text-muted-foreground">
            Set your business hours and after-hours behavior
          </p>
        </div>

        {/* Timezone */}
        <div className="relative z-10 space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            value={formData.timezone}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, timezone: e.target.value }));
              setSaveSuccess(false);
              setError(null);
            }}
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
        <div className="relative z-10 flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Same hours every weekday</Label>
            <p className="text-sm text-muted-foreground">
              Monday through Friday have the same hours
            </p>
          </div>
          <Switch
            checked={formData.sameEveryDay}
            onCheckedChange={handleSameEveryDayChange}
          />
        </div>

        {/* Hours schedule */}
        <div className="relative z-10 space-y-4">
          <Label>Operating hours</Label>

          {formData.sameEveryDay ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Monday - Friday</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={formData.schedule.monday?.status || "open"}
                      onChange={(e) => {
                        const status = e.target.value;
                        setFormData((prev) => {
                          const newSchedule = { ...prev.schedule };
                          DAYS.slice(0, 5).forEach((day) => {
                            newSchedule[day.key] = {
                              ...newSchedule[day.key],
                              status,
                            };
                          });
                          return { ...prev, schedule: newSchedule };
                        });
                        setSaveSuccess(false);
                        setError(null);
                      }}
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="24hours">24 Hours</option>
                    </select>
                    {formData.schedule.monday?.status === "open" && (
                      <>
                        <select
                          value={formData.schedule.monday?.open || "09:00"}
                          onChange={(e) => {
                            const open = e.target.value;
                            setFormData((prev) => {
                              const newSchedule = { ...prev.schedule };
                              DAYS.slice(0, 5).forEach((day) => {
                                newSchedule[day.key] = {
                                  ...newSchedule[day.key],
                                  open,
                                };
                              });
                              return { ...prev, schedule: newSchedule };
                            });
                            setSaveSuccess(false);
                            setError(null);
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
                          value={formData.schedule.monday?.close || "17:00"}
                          onChange={(e) => {
                            const close = e.target.value;
                            setFormData((prev) => {
                              const newSchedule = { ...prev.schedule };
                              DAYS.slice(0, 5).forEach((day) => {
                                newSchedule[day.key] = {
                                  ...newSchedule[day.key],
                                  close,
                                };
                              });
                              return { ...prev, schedule: newSchedule };
                            });
                            setSaveSuccess(false);
                            setError(null);
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
                        value={formData.schedule[day.key]?.status || "closed"}
                        onChange={(e) =>
                          updateDaySchedule(day.key, "status", e.target.value)
                        }
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                      >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="24hours">24 Hours</option>
                      </select>
                      {formData.schedule[day.key]?.status === "open" && (
                        <>
                          <select
                            value={formData.schedule[day.key]?.open || "09:00"}
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
                            value={formData.schedule[day.key]?.close || "17:00"}
                            onChange={(e) =>
                              updateDaySchedule(
                                day.key,
                                "close",
                                e.target.value,
                              )
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
            <div className="space-y-2">
              {DAYS.map((day) => (
                <div
                  key={day.key}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="w-24 font-medium">{day.label}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={formData.schedule[day.key]?.status || "open"}
                      onChange={(e) =>
                        updateDaySchedule(day.key, "status", e.target.value)
                      }
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="24hours">24 Hours</option>
                    </select>
                    {formData.schedule[day.key]?.status === "open" && (
                      <>
                        <select
                          value={formData.schedule[day.key]?.open || "09:00"}
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
                        <span className="text-xs text-muted-foreground">
                          to
                        </span>
                        <select
                          value={formData.schedule[day.key]?.close || "17:00"}
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
        <div className="relative z-10 space-y-3">
          <Label>After-hours behavior</Label>
          <div className="space-y-2">
            {AFTER_HOURS_OPTIONS.map((option) => {
              const isSelected = formData.afterHoursBehavior === option.value;
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
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        afterHoursBehavior: e.target.value,
                      }));
                      setSaveSuccess(false);
                      setError(null);
                    }}
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

        {/* Error/Success messages */}
        {error && (
          <div className="relative z-10 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="relative z-10 rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-sm text-green-600">
            Settings saved successfully
          </div>
        )}

        {/* Save button */}
        <div className="relative z-10 flex justify-end pt-4">
          <ShimmerButton
            onClick={handleSave}
            disabled={!canSave || isSaving}
            shimmerColor="#ffffff"
            shimmerSize="0.05em"
            borderRadius="8px"
            background={canSave ? "hsl(var(--primary))" : "hsl(var(--muted))"}
            className={cn(
              "px-8 py-3 text-sm font-medium",
              !canSave && "cursor-not-allowed opacity-50",
            )}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </ShimmerButton>
        </div>
      </div>
    </div>
  );
}
