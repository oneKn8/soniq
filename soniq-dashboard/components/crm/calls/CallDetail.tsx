"use client";

import * as React from "react";
import {
  X,
  Phone,
  Clock,
  Calendar,
  User,
  FileText,
  Play,
  Pause,
  Volume2,
  ExternalLink,
  Copy,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Call } from "@/hooks/useCalls";
import { cn } from "@/lib/utils";

interface CallDetailProps {
  call: Call | null;
  loading: boolean;
  onClose: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDuration(seconds?: number): string {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ============================================================================
// TRANSCRIPT DISPLAY
// ============================================================================

interface TranscriptMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

function TranscriptView({
  transcript,
}: {
  transcript: string | object | null;
}) {
  if (!transcript) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No transcript available
      </div>
    );
  }

  // Handle different transcript formats
  let messages: TranscriptMessage[] = [];

  if (typeof transcript === "string") {
    // Simple string transcript - split by newlines
    messages = transcript
      .split("\n")
      .filter(Boolean)
      .map((line) => ({
        role:
          line.startsWith("AI:") || line.startsWith("Assistant:")
            ? "assistant"
            : "user",
        content: line.replace(/^(AI:|Assistant:|User:|Customer:)\s*/i, ""),
      }));
  } else if (Array.isArray(transcript)) {
    messages = transcript;
  } else if (typeof transcript === "object") {
    // Might be wrapped in a messages key
    const obj = transcript as Record<string, unknown>;
    if (Array.isArray(obj.messages)) {
      messages = obj.messages;
    } else if (Array.isArray(obj.transcript)) {
      messages = obj.transcript;
    }
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        Transcript format not recognized
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            msg.role === "assistant"
              ? "bg-primary/10 text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider opacity-60">
            {msg.role === "assistant" ? "AI Agent" : "Caller"}
          </div>
          <div>{msg.content}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// CALL DETAIL COMPONENT
// ============================================================================

export function CallDetail({ call, loading, onClose }: CallDetailProps) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select a call to view details
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-semibold text-foreground">Call Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Caller Info */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-foreground">
                {call.caller_name || "Unknown Caller"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{call.caller_phone}</span>
                <button
                  onClick={() => copyToClipboard(call.caller_phone)}
                  className="hover:text-foreground"
                >
                  {copied ? (
                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Meta Info */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Duration
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {formatDuration(call.duration_seconds)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Date
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {formatDateTime(call.created_at)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Outcome
            </div>
            <Badge variant="outline" className="capitalize">
              {call.outcome_type || "Unknown"}
            </Badge>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Direction
            </div>
            <Badge variant="outline" className="capitalize">
              {call.direction}
            </Badge>
          </div>
        </div>

        {/* Summary */}
        {call.summary && (
          <div className="mb-6">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Summary
            </div>
            <p className="text-sm text-muted-foreground">{call.summary}</p>
          </div>
        )}

        {/* Intents */}
        {call.intents_detected && call.intents_detected.length > 0 && (
          <div className="mb-6">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Detected Intents
            </div>
            <div className="flex flex-wrap gap-1">
              {call.intents_detected.map((intent, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {intent}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Linked Contact */}
        {call.contact && (
          <div className="mb-6">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Linked Contact
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="font-medium text-sm">
                {call.contact.first_name} {call.contact.last_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {call.contact.email || call.contact.phone}
              </div>
            </div>
          </div>
        )}

        {/* Linked Booking */}
        {call.booking && (
          <div className="mb-6">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Booking Created
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm capitalize">
                  {call.booking.booking_type}
                </div>
                <Badge variant="outline" className="text-xs">
                  {call.booking.status}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {call.booking.booking_date} at {call.booking.booking_time}
              </div>
              <div className="mt-1 font-mono text-xs text-primary">
                {call.booking.confirmation_code}
              </div>
            </div>
          </div>
        )}

        {/* Recording */}
        {call.recording_url && (
          <div className="mb-6">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Recording
            </div>
            <div className="rounded-lg border border-border p-3">
              <audio controls className="w-full" src={call.recording_url}>
                Your browser does not support audio playback.
              </audio>
            </div>
          </div>
        )}

        {/* Transcript */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <FileText className="h-3 w-3" />
            Transcript
          </div>
          <div className="rounded-lg border border-border p-3">
            <TranscriptView transcript={call.transcript || null} />
          </div>
        </div>
      </div>
    </div>
  );
}
