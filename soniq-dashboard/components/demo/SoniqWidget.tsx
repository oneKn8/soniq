"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Phone,
  PhoneOff,
  Send,
  Mic,
  MicOff,
  X,
  Minimize2,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceWaveform, CircularWaveform } from "./VoiceWaveform";

type WidgetMode = "chat" | "call";
type WidgetState = "minimized" | "open" | "expanded";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface SoniqWidgetProps {
  onDemoTrigger?: (demoType: string) => void;
  className?: string;
}

// Session management
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = sessionStorage.getItem("soniq_session_id");
  if (!sessionId) {
    sessionId = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem("soniq_session_id", sessionId);
  }
  return sessionId;
}

// API configuration - production URL as fallback
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.soniqai.com";
const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID || "deadbeef-cafe-4000-a000-000000000002";

interface ChatApiResponse {
  response: string;
  session_id: string;
  tool_calls?: Array<{ name: string; result: unknown }>;
}

export function SoniqWidget({
  onDemoTrigger,
  className,
}: SoniqWidgetProps) {
  const [state, setState] = useState<WidgetState>("minimized");
  const [mode, setMode] = useState<WidgetMode>("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm Soniq, your AI assistant. I can help you understand how our voice agents work for your business. Ask me anything or try a demo!",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (state === "open" && mode === "chat") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [state, mode]);

  // Call real chat API
  const sendToApi = useCallback(
    async (userMessage: string) => {
      setIsTyping(true);

      // Check for demo triggers based on keywords
      const lowerMessage = userMessage.toLowerCase();
      if (
        lowerMessage.includes("demo") ||
        lowerMessage.includes("show me") ||
        lowerMessage.includes("how does")
      ) {
        if (lowerMessage.includes("call") || lowerMessage.includes("phone")) {
          onDemoTrigger?.("incoming-call");
        } else if (
          lowerMessage.includes("book") ||
          lowerMessage.includes("appointment")
        ) {
          onDemoTrigger?.("booking");
        } else if (
          lowerMessage.includes("contact") ||
          lowerMessage.includes("customer")
        ) {
          onDemoTrigger?.("contact");
        } else if (
          lowerMessage.includes("dashboard") ||
          lowerMessage.includes("workstation")
        ) {
          onDemoTrigger?.("dashboard");
        }
      }

      try {
        const sessionId = getSessionId();
        const response = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tenant_id: TENANT_ID,
            session_id: sessionId,
            message: userMessage,
            marketing_mode: true, // Use Soniq marketing context
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data: ChatApiResponse = await response.json();

        setIsTyping(false);
        setIsSpeaking(true);

        const responseMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, responseMessage]);

        // Simulate speaking duration based on response length
        const speakingDuration = Math.min(
          Math.max(data.response.length * 30, 1000),
          4000,
        );
        setTimeout(() => {
          setIsSpeaking(false);
        }, speakingDuration);
      } catch (error) {
        console.error("[SoniqWidget] Chat API error:", error);
        setIsTyping(false);

        // Fallback response on error
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Please try again in a moment, or contact us directly to learn more about Soniq.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    },
    [onDemoTrigger],
  );

  // Handle message send
  const handleSend = useCallback(() => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    sendToApi(inputValue.trim());
  }, [inputValue, isTyping, sendToApi]);

  // Handle key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Toggle call mode
  const toggleCall = useCallback(() => {
    if (isCallActive) {
      setIsCallActive(false);
      setIsListening(false);
      setIsSpeaking(false);
    } else {
      setIsCallActive(true);
      // Simulate AI greeting
      setTimeout(() => {
        setIsSpeaking(true);
        setTimeout(() => {
          setIsSpeaking(false);
          setIsListening(true);
        }, 2000);
      }, 500);
    }
  }, [isCallActive]);

  // Render minimized state
  if (state === "minimized") {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setState("open")}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-industry shadow-elevated transition-shadow hover:shadow-xl",
          className,
        )}
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <MessageSquare className="h-6 w-6 text-white" />
        </motion.div>
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
          <Sparkles className="h-2.5 w-2.5" />
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl bg-background border border-border shadow-elevated",
        state === "expanded" ? "w-96 h-[600px]" : "w-80 h-[480px]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-industry">
              {mode === "chat" ? (
                <MessageSquare className="h-5 w-5 text-white" />
              ) : (
                <Phone className="h-5 w-5 text-white" />
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Soniq</h3>
            <p className="text-xs text-muted-foreground">
              {isTyping
                ? "Typing..."
                : isSpeaking
                  ? "Speaking..."
                  : isListening
                    ? "Listening..."
                    : "Online"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Mode Toggle */}
          <div className="flex rounded-lg bg-muted p-0.5">
            <button
              onClick={() => setMode("chat")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                mode === "chat"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMode("call")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                mode === "call"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Phone className="h-4 w-4" />
            </button>
          </div>

          {/* Minimize */}
          <button
            onClick={() => setState("minimized")}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Minimize2 className="h-4 w-4" />
          </button>

          {/* Close */}
          <button
            onClick={() => setState("minimized")}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {mode === "chat" ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col min-h-0"
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <div className="space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                        message.role === "user"
                          ? "bg-industry text-white rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md",
                      )}
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="flex gap-1 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="h-2 w-2 rounded-full bg-muted-foreground/50"
                      />
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: 0.1,
                        }}
                        className="h-2 w-2 rounded-full bg-muted-foreground/50"
                      />
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: 0.2,
                        }}
                        className="h-2 w-2 rounded-full bg-muted-foreground/50"
                      />
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Speaking indicator */}
            <AnimatePresence>
              {isSpeaking && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-center border-t border-border bg-muted/30 py-2"
                >
                  <VoiceWaveform
                    isActive
                    isSpeaking={isSpeaking}
                    size="sm"
                    className="text-industry"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  className="flex-1 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-industry focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                    inputValue.trim()
                      ? "bg-industry text-white hover:bg-industry-hover"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>

              {/* Quick actions */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["Show demo", "How does it work?", "Pricing"].map((action) => (
                  <button
                    key={action}
                    disabled={isTyping}
                    onClick={() => {
                      if (isTyping) return;
                      const userMessage: Message = {
                        id: Date.now().toString(),
                        role: "user",
                        content: action,
                        timestamp: new Date(),
                      };
                      setMessages((prev) => [...prev, userMessage]);
                      sendToApi(action);
                    }}
                    className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="call"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center p-6"
          >
            {/* Call UI */}
            <CircularWaveform
              isActive={isCallActive}
              isSpeaking={isSpeaking}
              size={120}
              className="text-industry"
            />

            <h3 className="mt-6 text-lg font-semibold text-foreground">
              {isCallActive ? "Connected" : "Call Soniq"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground text-center">
              {isCallActive
                ? isSpeaking
                  ? "AI is speaking..."
                  : isListening
                    ? "Listening to you..."
                    : "Connected"
                : "Experience our AI voice agent live"}
            </p>

            {/* Call controls */}
            <div className="mt-8 flex items-center gap-4">
              {isCallActive && (
                <>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                      isMuted
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-foreground hover:bg-muted/80",
                    )}
                  >
                    {isMuted ? (
                      <MicOff className="h-5 w-5" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </button>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </button>
                </>
              )}

              <button
                onClick={toggleCall}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
                  isCallActive
                    ? "bg-destructive text-white hover:bg-destructive/90"
                    : "bg-green-500 text-white hover:bg-green-600",
                )}
              >
                {isCallActive ? (
                  <PhoneOff className="h-6 w-6" />
                ) : (
                  <Phone className="h-6 w-6" />
                )}
              </button>
            </div>

            {/* Call info */}
            {!isCallActive && (
              <p className="mt-6 text-xs text-muted-foreground text-center max-w-[200px]">
                This is a demo. In production, you&apos;ll hear our AI voice
                agent respond in real-time.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
