"use client";

import React, { useRef, useEffect, useState } from "react";
import { useCallSimulation } from "@/context/ConfigContext";
import type { SpeakerState } from "@/types";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  User,
  UserPlus,
  MoreHorizontal,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// WAVEFORM COLORS BY STATE
// ============================================================================

const STATE_CONFIG: Record<
  SpeakerState,
  { color: string; label: string; icon: React.ElementType }
> = {
  idle: {
    color: "#71717a", // zinc-500
    label: "Awaiting Call",
    icon: PhoneOff,
  },
  user: {
    color: "#22c55e", // green-500
    label: "Caller Speaking",
    icon: Mic,
  },
  ai: {
    color: "#6366f1", // indigo-500
    label: "AI Responding",
    icon: Volume2,
  },
  processing: {
    color: "#f59e0b", // amber-500
    label: "Processing",
    icon: Loader2,
  },
  ringing: {
    color: "#8b5cf6", // violet-500
    label: "Incoming Call",
    icon: Phone,
  },
};

// ============================================================================
// WAVEFORM COMPONENT - Center Column
// ============================================================================

export default function Waveform() {
  const { speakerState, setSpeakerState, activeCalls } = useCallSimulation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const phaseRef = useRef(0);

  // Call control states
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);

  // Timer for call duration, reset when call ends
  useEffect(() => {
    if (speakerState === "idle") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCallDuration(0);
      return;
    }
    if (isOnHold) return;
    const interval = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [speakerState, isOnHold]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ============================================================================
  // CANVAS RENDERING
  // ============================================================================

  const speakerStateRef = useRef(speakerState);

  useEffect(() => {
    speakerStateRef.current = speakerState;
  }, [speakerState]);

  useEffect(() => {
    const drawWaveform = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { width, height } = canvas;
      const centerY = height / 2;
      const currentState = speakerStateRef.current;

      // Clear with background
      ctx.fillStyle =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--background")
          .trim() || "#09090b";
      ctx.fillRect(0, 0, width, height);

      // Get waveform parameters based on state
      const config = STATE_CONFIG[currentState];
      const isActive = currentState !== "idle";
      const amplitude = isActive
        ? currentState === "processing"
          ? 20
          : 45
        : 8;
      const frequency = currentState === "user" ? 0.025 : 0.018;

      // Draw main waveform
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = isActive ? config.color : "transparent";
      ctx.shadowBlur = isActive ? 15 : 0;

      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const noise = isActive ? (Math.random() - 0.5) * amplitude * 0.4 : 0;
        const wave1 = Math.sin(x * frequency + phaseRef.current) * amplitude;
        const wave2 =
          Math.sin(x * frequency * 2 + phaseRef.current * 1.5) *
          (amplitude * 0.4);
        const y = centerY + wave1 + wave2 + noise;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw secondary wave (echo effect)
      if (isActive) {
        ctx.strokeStyle = config.color;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const y =
            centerY +
            Math.sin(x * frequency * 0.6 + phaseRef.current * 0.7) *
              (amplitude * 0.5);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Update phase
      phaseRef.current += isActive ? 0.1 : 0.02;
      animationRef.current = requestAnimationFrame(drawWaveform);
    };

    animationRef.current = requestAnimationFrame(drawWaveform);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // ============================================================================
  // CANVAS RESIZE
  // ============================================================================

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const container = canvas.parentElement;
        if (container) {
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isCallActive = activeCalls.length > 0 || speakerState !== "idle";
  const currentConfig = STATE_CONFIG[speakerState];
  const StateIcon = currentConfig.icon;

  return (
    <div className="flex h-full flex-col">
      {/* Header with State Controls */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div
            className="h-3 w-3 rounded-full animate-pulse"
            style={{
              backgroundColor: currentConfig.color,
              boxShadow: `0 0 10px ${currentConfig.color}`,
            }}
          />
          <div>
            <span className="text-sm font-medium text-foreground">
              {currentConfig.label}
            </span>
            {isCallActive && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(callDuration)}
              </div>
            )}
          </div>
        </div>

        {/* State Toggle Buttons (for demo/testing) */}
        <div className="hidden sm:flex items-center gap-1 bg-muted rounded-lg p-1">
          <StateButton
            active={speakerState === "idle"}
            onClick={() => setSpeakerState("idle")}
            icon={PhoneOff}
            label="Idle"
          />
          <StateButton
            active={speakerState === "ringing"}
            onClick={() => setSpeakerState("ringing")}
            icon={Phone}
            label="Ring"
          />
          <StateButton
            active={speakerState === "user"}
            onClick={() => setSpeakerState("user")}
            icon={Mic}
            label="User"
          />
          <StateButton
            active={speakerState === "ai"}
            onClick={() => setSpeakerState("ai")}
            icon={Volume2}
            label="AI"
          />
        </div>

        {/* Call Status Badge */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full",
            isCallActive
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-muted text-muted-foreground",
          )}
        >
          {isCallActive ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium">LIVE</span>
            </>
          ) : (
            <>
              <PhoneOff className="h-3 w-3" />
              <span className="text-xs font-medium">STANDBY</span>
            </>
          )}
        </div>
      </div>

      {/* Waveform Canvas */}
      <div
        className="relative flex-1 cursor-pointer"
        onClick={() => setShowControls(!showControls)}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* Center Status Overlay */}
        {speakerState !== "idle" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border backdrop-blur-sm"
              style={{
                backgroundColor: `${currentConfig.color}15`,
                borderColor: `${currentConfig.color}30`,
              }}
            >
              <StateIcon
                className={cn(
                  "h-8 w-8",
                  speakerState === "processing" && "animate-spin",
                )}
                style={{ color: currentConfig.color }}
              />
              <span
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: currentConfig.color }}
              >
                {currentConfig.label}
              </span>
            </div>
          </div>
        )}

        {/* Click hint */}
        {!showControls && isCallActive && (
          <div className="absolute top-4 right-4 text-xs text-muted-foreground bg-card/80 px-2 py-1 rounded">
            Click for controls
          </div>
        )}
      </div>

      {/* Call Control Bar */}
      {isCallActive && (
        <div className="border-t border-border bg-card/50 backdrop-blur-sm">
          {/* Caller Info */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  John Smith
                </div>
                <div className="text-xs text-muted-foreground">
                  +1 (555) 0123-4567
                </div>
              </div>
            </div>
            <div className="text-sm font-mono text-muted-foreground">
              {formatDuration(callDuration)}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-2 px-4 py-3">
            <ControlButton
              icon={isMuted ? MicOff : Mic}
              active={isMuted}
              onClick={() => setIsMuted(!isMuted)}
              label={isMuted ? "Unmute" : "Mute"}
              variant="warning"
            />
            <ControlButton
              icon={isOnHold ? VolumeX : Volume2}
              active={isOnHold}
              onClick={() => setIsOnHold(!isOnHold)}
              label={isOnHold ? "Resume" : "Hold"}
              variant="warning"
            />
            <ControlButton
              icon={UserPlus}
              onClick={() => {}}
              label="Transfer"
              variant="primary"
            />
            <ControlButton
              icon={MoreHorizontal}
              onClick={() => {}}
              label="More"
              variant="secondary"
            />
            <div className="w-px h-8 bg-border mx-2" />
            <ControlButton
              icon={PhoneOff}
              onClick={() => setSpeakerState("idle")}
              label="End"
              variant="danger"
              size="large"
            />
          </div>
        </div>
      )}

      {/* Footer Info */}
      {!isCallActive && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span className="font-mono">CODEC: OPUS | 48kHz | 256ms</span>
          <span>Keyboard: U=User, S=AI, C=Call</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STATE BUTTON
// ============================================================================

function StateButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

// ============================================================================
// CONTROL BUTTON
// ============================================================================

interface ControlButtonProps {
  icon: React.ElementType;
  onClick: () => void;
  label: string;
  active?: boolean;
  variant?: "primary" | "secondary" | "warning" | "danger";
  size?: "normal" | "large";
}

function ControlButton({
  icon: Icon,
  onClick,
  label,
  active = false,
  variant = "secondary",
  size = "normal",
}: ControlButtonProps) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-muted text-foreground hover:bg-accent",
    warning: active
      ? "bg-amber-500 text-white"
      : "bg-muted text-foreground hover:bg-accent",
    danger: "bg-red-500 text-white hover:bg-red-600",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
        variants[variant],
        size === "large" && "px-4 py-3",
      )}
      title={label}
    >
      <Icon className={cn("h-5 w-5", size === "large" && "h-6 w-6")} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
