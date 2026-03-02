"use client";

import {
  useState,
  useCallback,
  createContext,
  useContext,
  useEffect,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneIncoming,
  Calendar,
  CalendarCheck,
  User,
  UserPlus,
  LayoutDashboard,
  X,
  CheckCircle,
  Clock,
  MapPin,
  Volume2,
  VolumeX,
} from "lucide-react";

// Demo types
type DemoType =
  | "incoming-call"
  | "booking"
  | "contact"
  | "dashboard"
  | "check-in"
  | null;

interface DemoContextType {
  activeDemo: DemoType;
  triggerDemo: (type: DemoType) => void;
  dismissDemo: () => void;
}

const DemoContext = createContext<DemoContextType>({
  activeDemo: null,
  triggerDemo: () => {},
  dismissDemo: () => {},
});

export const useDemoOrchestrator = () => useContext(DemoContext);

// Demo conversation script for incoming call
const DEMO_SCRIPT = [
  {
    speaker: "ai",
    text: "Hello! Thank you for calling Wellness Clinic. How can I help you today?",
  },
  {
    speaker: "customer",
    text: "Hi, I need to schedule an appointment. I've been having terrible back pain for the past week.",
  },
  {
    speaker: "ai",
    text: "I'm sorry to hear that. Let me check our availability. I see we have an opening tomorrow at 10:30 AM with Dr. Williams. Would that work for you?",
  },
  {
    speaker: "customer",
    text: "Yes, that would be perfect. My name is Sarah Johnson.",
  },
  {
    speaker: "ai",
    text: "I've booked your appointment for tomorrow at 10:30 AM with Dr. Williams for back pain. You'll receive a confirmation shortly. Is there anything else I can help you with?",
  },
  { speaker: "customer", text: "No, that's all. Thank you so much!" },
  {
    speaker: "ai",
    text: "You're welcome, Sarah. Take care and we'll see you tomorrow. Goodbye!",
  },
];

// Helper to play a line of demo dialogue
function playDemoLine(
  lineIndex: number,
  isPlayingRef: React.MutableRefObject<boolean>,
  onStepChange: (step: number) => void,
  setCurrentLine: (line: number) => void,
  scheduleNext: (nextIndex: number) => void,
) {
  if (
    lineIndex >= DEMO_SCRIPT.length ||
    typeof window === "undefined" ||
    !window.speechSynthesis
  ) {
    return;
  }

  const line = DEMO_SCRIPT[lineIndex];
  const utterance = new SpeechSynthesisUtterance(line.text);

  // Different voice settings for AI vs customer
  const voices = window.speechSynthesis.getVoices();
  if (line.speaker === "ai") {
    const femaleVoice = voices.find(
      (v) =>
        v.name.includes("Samantha") ||
        v.name.includes("Google US English") ||
        v.lang === "en-US",
    );
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
  } else {
    const maleVoice = voices.find(
      (v) =>
        v.name.includes("Daniel") ||
        v.name.includes("Alex") ||
        (v.lang === "en-US" && v.name.toLowerCase().includes("male")),
    );
    if (maleVoice) utterance.voice = maleVoice;
    utterance.rate = 0.95;
    utterance.pitch = 0.9;
  }

  // Map script lines to demo steps
  if (lineIndex === 0) onStepChange(0);
  else if (lineIndex === 1 || lineIndex === 2) onStepChange(1);
  else if (lineIndex === 3 || lineIndex === 4) onStepChange(2);
  else onStepChange(3);

  utterance.onend = () => {
    if (isPlayingRef.current && lineIndex < DEMO_SCRIPT.length - 1) {
      scheduleNext(lineIndex + 1);
    }
    setCurrentLine(lineIndex + 1);
  };

  utterance.onerror = () => {
    if (isPlayingRef.current && lineIndex < DEMO_SCRIPT.length - 1) {
      scheduleNext(lineIndex + 1);
    }
  };

  window.speechSynthesis.speak(utterance);
}

// Hook for demo audio playback
function useDemoAudio(isActive: boolean, onStepChange: (step: number) => void) {
  const [isMuted, setIsMuted] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const isPlayingRef = useRef(false);
  const onStepChangeRef = useRef(onStepChange);

  // Keep refs up to date
  useEffect(() => {
    onStepChangeRef.current = onStepChange;
  }, [onStepChange]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      if (newMuted && typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return newMuted;
    });
  }, []);

  useEffect(() => {
    if (!isActive || isMuted) {
      return;
    }

    const scheduleNext = (nextIndex: number) => {
      setTimeout(() => {
        playDemoLine(
          nextIndex,
          isPlayingRef,
          onStepChangeRef.current,
          setCurrentLine,
          scheduleNext,
        );
      }, 500);
    };

    const startDemo = () => {
      isPlayingRef.current = true;
      setCurrentLine(0);
      setTimeout(() => {
        playDemoLine(
          0,
          isPlayingRef,
          onStepChangeRef.current,
          setCurrentLine,
          scheduleNext,
        );
      }, 1000);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      startDemo();
    } else {
      window.speechSynthesis.onvoiceschanged = startDemo;
    }

    return () => {
      stop();
    };
  }, [isActive, isMuted, stop]);

  return {
    isMuted,
    toggleMute,
    currentLine,
    currentSpeaker:
      currentLine < DEMO_SCRIPT.length
        ? DEMO_SCRIPT[currentLine]?.speaker
        : null,
    currentText:
      currentLine < DEMO_SCRIPT.length ? DEMO_SCRIPT[currentLine]?.text : null,
  };
}

interface DemoOrchestratorProps {
  children: React.ReactNode;
}

export function DemoOrchestrator({ children }: DemoOrchestratorProps) {
  const [activeDemo, setActiveDemo] = useState<DemoType>(null);
  const [demoStep, setDemoStep] = useState(0);

  const triggerDemo = useCallback((type: DemoType) => {
    setActiveDemo(type);
    setDemoStep(0);

    // Auto-progress demo with slower timing, no auto-close
    if (type) {
      const progressDemo = () => {
        setDemoStep((prev) => {
          if (prev >= 3) {
            // Stay on final step - user clicks to dismiss
            return prev;
          }
          setTimeout(progressDemo, 3000);
          return prev + 1;
        });
      };
      setTimeout(progressDemo, 3000);
    }
  }, []);

  const dismissDemo = useCallback(() => {
    setActiveDemo(null);
    setDemoStep(0);
  }, []);

  const handleStepChange = useCallback((step: number) => {
    setDemoStep(step);
  }, []);

  return (
    <DemoContext.Provider value={{ activeDemo, triggerDemo, dismissDemo }}>
      {children}
      <AnimatePresence>
        {activeDemo && (
          <DemoOverlay
            type={activeDemo}
            step={demoStep}
            onStepChange={handleStepChange}
            onDismiss={dismissDemo}
          />
        )}
      </AnimatePresence>
    </DemoContext.Provider>
  );
}

// Demo overlay component
interface DemoOverlayProps {
  type: DemoType;
  step: number;
  onStepChange: (step: number) => void;
  onDismiss: () => void;
}

function DemoOverlay({
  type,
  step,
  onStepChange,
  onDismiss,
}: DemoOverlayProps) {
  const isIncomingCall = type === "incoming-call";
  const { isMuted, toggleMute, currentSpeaker, currentText } = useDemoAudio(
    isIncomingCall,
    onStepChange,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onDismiss}
    >
      {/* Close hint */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute top-6 right-6 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <span>Click anywhere to close</span>
        <X className="h-4 w-4" />
      </motion.div>

      {/* Mute button for call demos */}
      {isIncomingCall && (
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          className="absolute top-6 left-6 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          {isMuted ? (
            <>
              <VolumeX className="h-4 w-4" />
              <span>Unmute</span>
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4" />
              <span>Mute</span>
            </>
          )}
        </motion.button>
      )}

      {/* Demo content */}
      <div onClick={(e) => e.stopPropagation()}>
        {type === "incoming-call" && (
          <IncomingCallDemo
            step={step}
            currentSpeaker={currentSpeaker}
            currentText={currentText}
          />
        )}
        {type === "booking" && <BookingDemo step={step} />}
        {type === "contact" && <ContactDemo step={step} />}
        {type === "dashboard" && <DashboardDemo step={step} />}
        {type === "check-in" && <CheckInDemo step={step} />}
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8 }}
            animate={{
              scale: i === step ? 1.2 : 1,
              backgroundColor:
                i <= step
                  ? "var(--industry-accent)"
                  : "var(--muted-foreground)",
            }}
            className="h-2 w-2 rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
}

// Individual demo animations
interface IncomingCallDemoProps {
  step: number;
  currentSpeaker: string | null;
  currentText: string | null;
}

function IncomingCallDemo({
  step,
  currentSpeaker,
  currentText,
}: IncomingCallDemoProps) {
  return (
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      className="w-[420px] rounded-2xl bg-background border border-border shadow-elevated overflow-hidden"
    >
      {/* Phone ringing animation */}
      <div className="bg-gradient-to-br from-industry/20 to-industry/5 px-6 py-6 text-center">
        <motion.div
          animate={{
            scale: step === 0 && !currentSpeaker ? [1, 1.1, 1] : 1,
            rotate: step === 0 && !currentSpeaker ? [0, -5, 5, 0] : 0,
          }}
          transition={{
            duration: 0.5,
            repeat: step === 0 && !currentSpeaker ? Infinity : 0,
          }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-industry"
        >
          <PhoneIncoming className="h-8 w-8 text-white" />
        </motion.div>
        <h3 className="text-lg font-semibold text-foreground">
          {step >= 3 ? "Call Complete" : "Live Call"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 0 && !currentSpeaker
            ? "+1 555-123-4567"
            : step >= 3
              ? "Appointment booked successfully"
              : "AI handling call..."}
        </p>
      </div>

      {/* Live transcript */}
      {currentText && (
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-start gap-3">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                currentSpeaker === "ai"
                  ? "bg-industry text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {currentSpeaker === "ai" ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {currentSpeaker === "ai" ? "AI Agent" : "Customer"}
              </p>
              <motion.p
                key={currentText}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-foreground leading-relaxed"
              >
                &quot;{currentText}&quot;
              </motion.p>
            </div>
          </div>
        </div>
      )}

      {/* Call info */}
      <div className="px-6 py-4 space-y-3">
        <AnimatePresence mode="wait">
          {step >= 1 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
            >
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Sarah Johnson
                </p>
                <p className="text-xs text-muted-foreground">
                  New patient - back pain
                </p>
              </div>
            </motion.div>
          )}

          {step >= 2 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
            >
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Tomorrow, 10:30 AM
                </p>
                <p className="text-xs text-muted-foreground">
                  Dr. Williams - Back pain consultation
                </p>
              </div>
            </motion.div>
          )}

          {step >= 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 rounded-lg bg-green-500/10 p-3"
            >
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="text-sm font-medium text-green-600">
                Appointment booked - confirmation sent
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function BookingDemo({ step }: { step: number }) {
  return (
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      className="w-96 rounded-2xl bg-background border border-border shadow-elevated overflow-hidden"
    >
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-industry/10">
            <CalendarCheck className="h-5 w-5 text-industry" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">New Appointment</h3>
            <p className="text-sm text-muted-foreground">
              AI is booking for you
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Patient info */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Patient
          </label>
          <motion.div
            animate={{ opacity: step >= 0 ? 1 : 0.3 }}
            className="rounded-lg border border-border p-3"
          >
            <p className="font-medium text-foreground">Sarah Johnson</p>
            <p className="text-sm text-muted-foreground">+1 555-234-5678</p>
          </motion.div>
        </div>

        {/* Date/Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Date
            </label>
            <motion.div
              animate={{ opacity: step >= 1 ? 1 : 0.3 }}
              className="rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Jan 28, 2026</span>
              </div>
            </motion.div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Time
            </label>
            <motion.div
              animate={{ opacity: step >= 1 ? 1 : 0.3 }}
              className="rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">2:30 PM</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Service */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Service
          </label>
          <motion.div
            animate={{ opacity: step >= 2 ? 1 : 0.3 }}
            className="rounded-lg border border-border p-3"
          >
            <p className="font-medium text-foreground">Consultation</p>
            <p className="text-sm text-muted-foreground">45 minutes</p>
          </motion.div>
        </div>

        {/* Confirm button */}
        <motion.button
          animate={{
            opacity: step >= 3 ? 1 : 0.5,
            scale: step >= 3 ? [1, 1.02, 1] : 1,
          }}
          className="w-full rounded-lg bg-industry py-3 text-sm font-medium text-white"
        >
          {step >= 3 ? "Confirmed!" : "Confirming..."}
        </motion.button>
      </div>
    </motion.div>
  );
}

function ContactDemo({ step }: { step: number }) {
  return (
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      className="w-80 rounded-2xl bg-background border border-border shadow-elevated overflow-hidden"
    >
      <div className="bg-gradient-to-br from-industry/20 to-industry/5 px-6 py-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-industry"
        >
          <UserPlus className="h-8 w-8 text-white" />
        </motion.div>
        <h3 className="font-semibold text-foreground">New Contact Created</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          AI captured caller info
        </p>
      </div>

      <div className="px-6 py-4 space-y-3">
        <motion.div
          animate={{ opacity: step >= 0 ? 1 : 0.3 }}
          className="flex items-center gap-3"
        >
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">Emily Davis</span>
        </motion.div>

        <motion.div
          animate={{ opacity: step >= 1 ? 1 : 0.3 }}
          className="flex items-center gap-3"
        >
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">+1 555-345-6789</span>
        </motion.div>

        <motion.div
          animate={{ opacity: step >= 2 ? 1 : 0.3 }}
          className="flex items-center gap-3"
        >
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">New York, NY</span>
        </motion.div>

        {step >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-lg bg-industry/10 p-3 text-center"
          >
            <p className="text-sm font-medium text-industry">
              Contact saved to CRM
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function DashboardDemo({ step }: { step: number }) {
  return (
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      className="w-[500px] rounded-2xl bg-background border border-border shadow-elevated overflow-hidden"
    >
      <div className="border-b border-border px-6 py-4 flex items-center gap-3">
        <LayoutDashboard className="h-5 w-5 text-industry" />
        <h3 className="font-semibold text-foreground">Your Workstation</h3>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {/* Today's Schedule */}
        <motion.div
          animate={{ opacity: step >= 0 ? 1 : 0.3 }}
          className="col-span-2 rounded-lg border border-border p-4"
        >
          <h4 className="text-sm font-medium text-foreground mb-3">
            Today&apos;s Schedule
          </h4>
          <div className="space-y-2">
            {[
              "9:00 AM - John Smith",
              "10:30 AM - Sarah J.",
              "2:00 PM - New",
            ].map((item, i) => (
              <motion.div
                key={item}
                animate={{ opacity: step >= i ? 1 : 0.3 }}
                className="flex items-center gap-2 text-sm"
              >
                <div className="h-2 w-2 rounded-full bg-industry" />
                <span className="text-muted-foreground">{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          animate={{ opacity: step >= 2 ? 1 : 0.3 }}
          className="rounded-lg border border-border p-4"
        >
          <p className="text-2xl font-bold text-foreground">12</p>
          <p className="text-xs text-muted-foreground">Appointments today</p>
        </motion.div>

        <motion.div
          animate={{ opacity: step >= 3 ? 1 : 0.3 }}
          className="rounded-lg border border-border p-4"
        >
          <p className="text-2xl font-bold text-foreground">28</p>
          <p className="text-xs text-muted-foreground">Calls handled</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

function CheckInDemo({ step }: { step: number }) {
  return (
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      className="w-80 rounded-2xl bg-background border border-border shadow-elevated overflow-hidden"
    >
      <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 px-6 py-6 text-center">
        <motion.div
          animate={{ scale: step >= 3 ? [1, 1.1, 1] : 1 }}
          transition={{ duration: 0.3 }}
          className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-500"
        >
          <CheckCircle className="h-8 w-8 text-white" />
        </motion.div>
        <h3 className="font-semibold text-foreground">Check-In Complete</h3>
      </div>

      <div className="px-6 py-4">
        <div className="space-y-3">
          <motion.div
            animate={{ opacity: step >= 0 ? 1 : 0.3 }}
            className="flex justify-between text-sm"
          >
            <span className="text-muted-foreground">Patient</span>
            <span className="font-medium text-foreground">John Smith</span>
          </motion.div>
          <motion.div
            animate={{ opacity: step >= 1 ? 1 : 0.3 }}
            className="flex justify-between text-sm"
          >
            <span className="text-muted-foreground">Time</span>
            <span className="font-medium text-foreground">10:30 AM</span>
          </motion.div>
          <motion.div
            animate={{ opacity: step >= 2 ? 1 : 0.3 }}
            className="flex justify-between text-sm"
          >
            <span className="text-muted-foreground">Provider</span>
            <span className="font-medium text-foreground">Dr. Williams</span>
          </motion.div>
          <motion.div
            animate={{ opacity: step >= 3 ? 1 : 0.3 }}
            className="flex justify-between text-sm"
          >
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium text-green-500">Checked In</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
