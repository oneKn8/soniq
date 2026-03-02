"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface RetroTerminalProps {
  className?: string;
}

const WAVE_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

// Full conversation loop
const FULL_TRANSCRIPT = [
  {
    speaker: "AI",
    text: "Hello! Thank you for calling. How can I help you today?",
  },
  { speaker: "USER", text: "Hi, I need to book an appointment for tomorrow." },
  { speaker: "AI", text: "Of course! What time works best for you tomorrow?" },
  { speaker: "USER", text: "Anytime in the afternoon would be great." },
  {
    speaker: "AI",
    text: "I have 2:00 PM and 4:30 PM available. Which do you prefer?",
  },
  { speaker: "USER", text: "2:00 PM works perfectly." },
  {
    speaker: "AI",
    text: "Great! I've booked you for 2:00 PM tomorrow. May I have your name?",
  },
  { speaker: "USER", text: "It's Sarah Mitchell." },
  {
    speaker: "AI",
    text: "Thank you Sarah. I've confirmed your appointment. You'll receive a text reminder.",
  },
  { speaker: "USER", text: "Perfect, thanks so much!" },
  { speaker: "AI", text: "You're welcome! Have a wonderful day." },
  { speaker: "CALL", text: "ended — duration: 2m 34s" },
  {
    speaker: "AI",
    text: "Hello! Thank you for calling. How can I help you today?",
  },
  { speaker: "USER", text: "Hi there, I wanted to check on my order status." },
  {
    speaker: "AI",
    text: "I'd be happy to help. Could you provide your order number?",
  },
  { speaker: "USER", text: "It's #45892." },
  {
    speaker: "AI",
    text: "One moment... Your order shipped yesterday and will arrive Thursday.",
  },
  { speaker: "USER", text: "Oh that's great news, thank you!" },
  {
    speaker: "AI",
    text: "You're welcome! Is there anything else I can help with?",
  },
  { speaker: "USER", text: "No, that's all. Have a good one!" },
  { speaker: "AI", text: "You too! Take care." },
  { speaker: "CALL", text: "ended — duration: 1m 12s" },
];

export function RetroTerminal({ className }: RetroTerminalProps) {
  const [tick, setTick] = useState(0);
  const [activeCall, setActiveCall] = useState(0);
  const [transcriptIndex, setTranscriptIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animation tick
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => (t + 1) % 10000);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  // Cycle through calls
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCall((c) => (c + 1) % 4);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Advance transcript slowly
  useEffect(() => {
    const interval = setInterval(() => {
      setTranscriptIndex((idx) => (idx + 1) % FULL_TRANSCRIPT.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Canvas waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
    };
    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let animationId: number;

    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw waveform
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const points = 120;
      for (let i = 0; i < points; i++) {
        const x = (i / points) * canvas.width;
        const wave1 = Math.sin(i * 0.08 + frame * 0.03) * 25;
        const wave2 = Math.sin(i * 0.15 + frame * 0.05) * 15;
        const wave3 = Math.sin(i * 0.04 + frame * 0.02) * 10;
        const y = canvas.height / 2 + wave1 + wave2 + wave3;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Center line
      ctx.strokeStyle = "rgba(34, 211, 238, 0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const metrics = [
    { label: "CALLS", value: "1,247", change: "+12", positive: true },
    { label: "ACTIVE", value: "42", change: "+5", positive: true },
    { label: "QUEUE", value: "3", change: "-1", positive: false },
    { label: "AGENTS", value: "8", change: "0", neutral: true },
    { label: "SUCCESS", value: "98.4%", change: "+0.2%", positive: true },
    { label: "LATENCY", value: "45ms", change: "-2ms", positive: true },
    { label: "COST", value: "$0.02", change: "-10%", positive: true },
    { label: "UPTIME", value: "99.9%", change: "+0.01%", positive: true },
  ];

  // Show last 4 lines of transcript
  const visibleTranscript = FULL_TRANSCRIPT.slice(
    Math.max(0, transcriptIndex - 3),
    transcriptIndex + 1,
  );

  // ASCII waveform
  const waveBars = Array.from({ length: 24 }, (_, i) => {
    const height = Math.floor(
      (Math.sin(tick * 0.08 + i * 0.4) * 0.5 + 0.5) * 6,
    );
    return WAVE_CHARS[height];
  });

  // CPU bars
  const cpuBars = Array.from({ length: 16 }, (_, i) => {
    const baseHeight = 30 + Math.sin(tick * 0.05 + i * 0.5) * 20;
    return Math.max(10, Math.min(90, baseHeight));
  });

  return (
    <div
      className={cn(
        "relative w-full max-w-5xl mx-auto p-4 font-mono text-sm",
        className,
      )}
    >
      <div className="relative border border-zinc-800 bg-black/95 backdrop-blur-sm rounded-sm overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
          </div>
          <span className="text-zinc-500 text-xs tracking-[0.2em] uppercase">
            Soniq AI — Node 01
          </span>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 text-xs tracking-wider">
              ONLINE
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-12">
          {/* Left - Metrics */}
          <div className="col-span-3 border-r border-zinc-800 p-4">
            <div className="text-zinc-600 text-xs mb-4 tracking-wider uppercase">
              ◄ System Metrics
            </div>
            <div className="space-y-2.5">
              {metrics.map((m, i) => (
                <div key={i} className="flex justify-between items-baseline">
                  <span className="text-zinc-600 text-xs">{m.label}</span>
                  <div className="text-right">
                    <span className="text-zinc-300 text-sm">{m.value}</span>
                    <span
                      className={cn(
                        "text-[10px] ml-1.5",
                        m.neutral
                          ? "text-zinc-600"
                          : m.positive
                            ? "text-emerald-500"
                            : "text-rose-500",
                      )}
                    >
                      {m.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/50">
              <div className="text-zinc-600 text-xs mb-2 tracking-wider uppercase">
                Event Log
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="text-emerald-500/70">
                  [
                  {new Date().toLocaleTimeString([], {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                  ] Call connected
                </div>
                <div className="text-cyan-500/70">AI processing intent...</div>
                <div className="text-zinc-600">Type: appointment_booking</div>
                <div className="text-indigo-400/70">Calendar API call</div>
                <div className="text-emerald-500/70">Slot confirmed</div>
              </div>
            </div>
          </div>

          {/* Center - Waveform & Transcript */}
          <div className="col-span-6 p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 text-xs">STATUS</span>
                <span className="text-emerald-400 text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LISTENING
                </span>
              </div>
              <span className="text-zinc-600 text-xs">
                CALL_ID:{" "}
                <span className="text-zinc-400">#{1000 + activeCall}</span>
              </span>
            </div>

            {/* Waveform canvas */}
            <div className="relative h-28 border border-zinc-800 bg-zinc-950/80 mb-3">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {/* ASCII waveform */}
            <div className="flex justify-center gap-[2px] mb-4 text-cyan-500/50 text-lg leading-none">
              {waveBars.map((bar, i) => (
                <span
                  key={i}
                  className={cn(
                    "transition-all duration-75",
                    i % 4 === 0 ? "text-cyan-400/70" : "",
                  )}
                >
                  {bar}
                </span>
              ))}
            </div>

            {/* Transcript */}
            <div className="border border-zinc-800 bg-zinc-950/50 p-3 min-h-[140px]">
              <div className="text-zinc-600 text-xs mb-2 tracking-wider uppercase text-center">
                Transcript
              </div>
              <div className="space-y-1.5 text-xs">
                {visibleTranscript.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <span
                      className={cn(
                        "w-12 text-right font-bold shrink-0",
                        line.speaker === "AI"
                          ? "text-cyan-500"
                          : line.speaker === "CALL"
                            ? "text-zinc-500"
                            : "text-zinc-400",
                      )}
                    >
                      {line.speaker === "CALL" ? "——" : line.speaker}:
                    </span>
                    <span
                      className={cn(
                        "text-zinc-300",
                        line.speaker === "CALL" && "text-zinc-600 italic",
                      )}
                    >
                      {line.text}
                    </span>
                  </div>
                ))}
                <span className="inline-block w-2 h-4 bg-cyan-500/70 animate-pulse ml-14 mt-1" />
              </div>
            </div>
          </div>

          {/* Right - Calls */}
          <div className="col-span-3 border-l border-zinc-800 p-4">
            <div className="text-zinc-600 text-xs mb-4 tracking-wider uppercase">
              ► Active Calls
            </div>
            <div className="space-y-2.5">
              {[
                { id: "#1042", status: "ai_speaking", time: "2:34" },
                { id: "#1043", status: "hold", time: "0:45" },
                { id: "#1044", status: "processing", time: "1:12" },
                { id: "#1045", status: "connected", time: "0:08" },
              ].map((call, i) => (
                <div
                  key={i}
                  className={cn(
                    "border p-2.5 transition-colors duration-300",
                    i === activeCall
                      ? "border-cyan-500/30 bg-cyan-950/10"
                      : "border-zinc-800 bg-zinc-950/30",
                  )}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-zinc-500">{call.id}</span>
                    <span className="text-[10px] text-zinc-600">
                      {call.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {call.status === "ai_speaking" && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[11px] text-emerald-400/80">
                          AI Speaking
                        </span>
                      </>
                    )}
                    {call.status === "hold" && (
                      <>
                        <span className="text-amber-500 text-[10px]">⏸</span>
                        <span className="text-[11px] text-amber-400/80">
                          On Hold
                        </span>
                      </>
                    )}
                    {call.status === "processing" && (
                      <>
                        <span className="animate-spin text-cyan-500 text-xs">
                          ◐
                        </span>
                        <span className="text-[11px] text-cyan-400/80">
                          Processing
                        </span>
                      </>
                    )}
                    {call.status === "connected" && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span className="text-[11px] text-indigo-400/80">
                          Connected
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/50">
              <div className="text-zinc-600 text-xs mb-2 tracking-wider uppercase">
                CPU Load
              </div>
              <div className="flex gap-[2px] items-end h-12">
                {cpuBars.map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-emerald-500/40 transition-all duration-200"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 bg-zinc-950 text-[11px]">
          <div className="flex items-center gap-4 text-zinc-600">
            <span>MEM: 4.2GB</span>
            <span>CPU: 23%</span>
            <span>NET: 12ms</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-600">Last sync:</span>
            <span className="text-zinc-500">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute -inset-1 bg-gradient-to-t from-cyan-500/10 via-transparent to-emerald-500/10 blur-2xl -z-10 opacity-50" />
    </div>
  );
}
