"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Square, Volume2, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface VoicePreviewProps {
  voiceId: string;
  voiceName: string;
  provider: "openai" | "elevenlabs" | "cartesia";
  speakingRate: number;
  pitch: number;
  sampleText?: string;
  compact?: boolean;
}

interface WaveformBarProps {
  isPlaying: boolean;
  index: number;
}

// ============================================================================
// SAMPLE TEXTS
// ============================================================================

const SAMPLE_TEXTS = {
  default:
    "Hello! Thank you for calling. How can I assist you today? I'm here to help with any questions you might have.",
  greeting:
    "Good morning! Welcome to our service. I'd be happy to help you with your inquiry.",
  booking:
    "I've found an available appointment for you. Would 2:30 PM tomorrow work for your schedule?",
  confirmation:
    "Your appointment has been confirmed. You'll receive a confirmation email shortly. Is there anything else I can help you with?",
};

// ============================================================================
// WAVEFORM BAR COMPONENT
// ============================================================================

function WaveformBar({ isPlaying, index }: WaveformBarProps) {
  // Use state for animated height - only updated in interval callback (async)
  const [height, setHeight] = useState(20);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const interval = setInterval(
      () => {
        setHeight(Math.random() * 80 + 20);
      },
      100 + index * 20,
    );

    return () => clearInterval(interval);
  }, [isPlaying, index]);

  // When not playing, always show default height (derived, not from setState in effect)
  const displayHeight = isPlaying ? height : 20;

  return (
    <div
      className={cn(
        "w-1 rounded-full transition-all duration-100",
        isPlaying ? "bg-primary" : "bg-muted-foreground/30",
      )}
      style={{
        height: `${displayHeight}%`,
      }}
    />
  );
}

// ============================================================================
// VOICE PREVIEW COMPONENT
// ============================================================================

export function VoicePreview({
  voiceId,
  voiceName,
  provider,
  speakingRate,
  pitch,
  sampleText = SAMPLE_TEXTS.default,
  compact = false,
}: VoicePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cancel any ongoing speech when component unmounts or voice changes
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [voiceId, provider]);

  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      // Stop playback
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use Web Speech API as fallback for demo
      // In production, this would call the actual voice provider API
      const utterance = new SpeechSynthesisUtterance(sampleText);
      utteranceRef.current = utterance;

      // Apply settings
      utterance.rate = speakingRate;
      utterance.pitch = pitch;

      // Try to find a matching voice
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(
        (v) =>
          v.name.toLowerCase().includes(voiceName.toLowerCase()) ||
          v.voiceURI.toLowerCase().includes(voiceName.toLowerCase()),
      );

      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onstart = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setHasPlayed(true);
      };

      utterance.onerror = (event) => {
        setIsLoading(false);
        setIsPlaying(false);
        if (event.error !== "canceled") {
          setError("Failed to play audio preview");
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsLoading(false);
      setError("Voice preview not available");
    }
  }, [isPlaying, sampleText, speakingRate, pitch, voiceName]);

  // Compact version for voice list items
  if (compact) {
    return (
      <button
        type="button"
        onClick={handlePlay}
        disabled={isLoading}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
          isPlaying
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Square className="h-3 w-3" />
        ) : hasPlayed ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>
    );
  }

  // Full version with waveform visualization
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Volume2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">
              Voice Preview
            </div>
            <div className="text-xs text-muted-foreground">
              {voiceName} via {provider}
            </div>
          </div>
        </div>

        <Button
          onClick={handlePlay}
          disabled={isLoading}
          variant={isPlaying ? "default" : "outline"}
          size="sm"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : isPlaying ? (
            <span className="flex items-center gap-2">
              <Square className="h-3 w-3" />
              Stop
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Play Preview
            </span>
          )}
        </Button>
      </div>

      {/* Waveform Visualization */}
      <div className="relative h-16 overflow-hidden rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex h-full items-center justify-center gap-1">
          {Array.from({ length: 32 }).map((_, i) => (
            <WaveformBar key={i} isPlaying={isPlaying} index={i} />
          ))}
        </div>

        {/* Overlay when not playing */}
        {!isPlaying && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <span className="text-xs text-muted-foreground">
              {hasPlayed
                ? "Preview complete"
                : "Click play to hear voice sample"}
            </span>
          </div>
        )}
      </div>

      {/* Sample Text Display */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs text-muted-foreground italic">
          &quot;{sampleText}&quot;
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Voice Settings Summary */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>
          Speed:{" "}
          <span className="font-mono text-foreground">
            {speakingRate.toFixed(2)}x
          </span>
        </span>
        <span>
          Pitch:{" "}
          <span className="font-mono text-foreground">{pitch.toFixed(2)}</span>
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// SAMPLE TEXT SELECTOR
// ============================================================================

interface SampleTextSelectorProps {
  value: string;
  onChange: (text: string) => void;
}

export function SampleTextSelector({
  value,
  onChange,
}: SampleTextSelectorProps) {
  const [isCustom, setIsCustom] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {Object.entries(SAMPLE_TEXTS).map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              onChange(text);
              setIsCustom(false);
            }}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition-colors",
              value === text && !isCustom
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsCustom(true)}
          className={cn(
            "rounded-full px-3 py-1 text-xs transition-colors",
            isCustom
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter custom text to preview..."
          className="h-20 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      )}
    </div>
  );
}

export default VoicePreview;
