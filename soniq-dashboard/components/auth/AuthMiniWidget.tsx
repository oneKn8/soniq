"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Sparkles } from "lucide-react";
import { CircularWaveform } from "@/components/demo/VoiceWaveform";
import { cn } from "@/lib/utils";

interface AuthMiniWidgetProps {
  className?: string;
}

export function AuthMiniWidget({ className }: AuthMiniWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDemo, setCurrentDemo] = useState(0);

  const demos = [
    {
      title: "Handle Bookings",
      description: "AI schedules appointments 24/7",
    },
    {
      title: "Answer Questions",
      description: "Instant responses to customer inquiries",
    },
    {
      title: "Take Messages",
      description: "Never miss an important call",
    },
  ];

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="open"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={cn(
              "w-72 rounded-2xl border border-border",
              "bg-card/95 backdrop-blur-md shadow-elevated",
              "overflow-hidden",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Soniq Demo</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Waveform Preview */}
              <div className="flex justify-center mb-4">
                <CircularWaveform isActive isSpeaking size={60} />
              </div>

              {/* Demo Carousel */}
              <div className="text-center space-y-2 mb-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentDemo}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h4 className="font-medium text-sm">
                      {demos[currentDemo].title}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {demos[currentDemo].description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Demo Indicators */}
              <div className="flex justify-center gap-1.5 mb-4">
                {demos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentDemo(index)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      currentDemo === index
                        ? "w-4 bg-primary"
                        : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50",
                    )}
                  />
                ))}
              </div>

              {/* CTA */}
              <p className="text-xs text-center text-muted-foreground">
                Sign up to see it in action
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="closed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className={cn(
              "flex items-center justify-center",
              "h-14 w-14 rounded-full",
              "bg-primary text-primary-foreground",
              "shadow-lg hover:shadow-xl transition-shadow",
            )}
          >
            <MessageSquare className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Auto-rotate demos */}
      {isOpen && (
        <AutoRotate
          interval={3000}
          count={demos.length}
          onNext={() => setCurrentDemo((prev) => (prev + 1) % demos.length)}
        />
      )}
    </div>
  );
}

function AutoRotate({
  interval,
  count,
  onNext,
}: {
  interval: number;
  count: number;
  onNext: () => void;
}) {
  useState(() => {
    const timer = setInterval(onNext, interval);
    return () => clearInterval(timer);
  });

  return null;
}
