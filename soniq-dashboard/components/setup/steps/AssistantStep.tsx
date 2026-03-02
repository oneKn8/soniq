"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Check, ArrowLeft, User, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSetup } from "../SetupContext";
import { SelectionCard } from "../SelectionCard";

type Personality = "professional" | "friendly" | "efficient";

interface VoiceOption {
  id: string;
  name: string;
  type: "female" | "male";
  tone: string;
  previewUrl: string;
}

const VOICES: VoiceOption[] = [
  {
    id: "female_professional",
    name: "Sarah",
    type: "female",
    tone: "Professional",
    previewUrl: "/audio/sarah.mp3",
  },
  {
    id: "female_friendly",
    name: "Emma",
    type: "female",
    tone: "Friendly",
    previewUrl: "/audio/emma.mp3",
  },
  {
    id: "female_warm",
    name: "Maya",
    type: "female",
    tone: "Warm",
    previewUrl: "/audio/maya.mp3",
  },
  {
    id: "male_professional",
    name: "James",
    type: "male",
    tone: "Professional",
    previewUrl: "/audio/james.mp3",
  },
  {
    id: "male_friendly",
    name: "Alex",
    type: "male",
    tone: "Friendly",
    previewUrl: "/audio/alex.mp3",
  },
  {
    id: "male_calm",
    name: "David",
    type: "male",
    tone: "Calm",
    previewUrl: "/audio/david.mp3",
  },
];

const PERSONALITIES: {
  id: Personality;
  label: string;
  description: string;
  example: string;
  color: string;
}[] = [
  {
    id: "professional",
    label: "Professional",
    description: "Formal and business-like",
    example:
      '"Good afternoon, thank you for calling {business}. This is {name}, how may I assist you today?"',
    color: "bg-slate-800",
  },
  {
    id: "friendly",
    label: "Friendly",
    description: "Warm and conversational",
    example:
      '"Hey there! Thanks for calling {business}. I\'m {name} - what can I help you with?"',
    color: "bg-amber-800",
  },
  {
    id: "efficient",
    label: "Efficient",
    description: "Direct and to the point",
    example: '"{business}, this is {name}. How can I help?"',
    color: "bg-emerald-800",
  },
];

const NAME_SUGGESTIONS: Record<string, string[]> = {
  professional: ["Sarah", "James", "Emily", "Michael"],
  friendly: ["Emma", "Alex", "Sophie", "Ben"],
  efficient: ["Kate", "Sam", "Anna", "Max"],
};

export function AssistantStep() {
  const router = useRouter();
  const { state, dispatch, saveStep, goToNextStep, goToPreviousStep } =
    useSetup();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { name, voice, personality } = state.assistantData;
  const businessName = state.businessData.name || "your business";

  const canContinue =
    name.trim() !== "" && voice !== "" && personality !== null;

  const playPreview = (voiceOption: VoiceOption) => {
    if (audioRef.current) {
      if (playingVoice === voiceOption.id) {
        audioRef.current.pause();
        setPlayingVoice(null);
      } else {
        audioRef.current.src = voiceOption.previewUrl;
        audioRef.current
          .play()
          .then(() => {
            setPlayingVoice(voiceOption.id);
          })
          .catch(() => {
            setPlayingVoice(null);
          });
      }
    }
  };

  const handleAudioEnded = () => {
    setPlayingVoice(null);
  };

  const handleContinue = async () => {
    if (!canContinue) return;

    setIsSubmitting(true);
    const success = await saveStep("assistant");
    if (success) {
      goToNextStep();
      router.push("/setup/phone");
    }
    setIsSubmitting(false);
  };

  const handleBack = () => {
    goToPreviousStep();
    router.push("/setup/integrations");
  };

  const getGreetingExample = (p: (typeof PERSONALITIES)[0]) => {
    return p.example
      .replace("{business}", businessName)
      .replace("{name}", name || "{name}");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Give your assistant an identity
        </h1>
        <p className="mt-2 text-muted-foreground">
          This is how callers will experience your business
        </p>
      </div>

      {/* Audio element for voice preview */}
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

      {/* Assistant name */}
      <div className="space-y-3">
        <Label htmlFor="assistant-name">Assistant name</Label>
        <Input
          id="assistant-name"
          placeholder="Sarah"
          value={name}
          onChange={(e) =>
            dispatch({
              type: "SET_ASSISTANT_DATA",
              payload: { name: e.target.value },
            })
          }
        />
        {personality && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Suggestions:</span>
            {(NAME_SUGGESTIONS[personality] ?? []).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() =>
                  dispatch({
                    type: "SET_ASSISTANT_DATA",
                    payload: { name: suggestion },
                  })
                }
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Voice selection */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          Voice
        </Label>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VOICES.map((voiceOption) => {
            const isSelected = voice === voiceOption.id;
            const isPlaying = playingVoice === voiceOption.id;

            return (
              <button
                key={voiceOption.id}
                type="button"
                onClick={() =>
                  dispatch({
                    type: "SET_ASSISTANT_DATA",
                    payload: { voice: voiceOption.id },
                  })
                }
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/40",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                      voiceOption.type === "female"
                        ? "bg-gradient-to-br from-pink-400 to-rose-600"
                        : "bg-gradient-to-br from-blue-400 to-indigo-600",
                    )}
                  >
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{voiceOption.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {voiceOption.tone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playPreview(voiceOption);
                      }}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                        isPlaying
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-primary/20",
                      )}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    {isSelected && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Personality selection */}
      <div className="space-y-4">
        <Label>Personality</Label>
        <div className="grid gap-4 md:grid-cols-3">
          {PERSONALITIES.map((p) => {
            const isSelected = personality === p.id;

            return (
              <SelectionCard
                key={p.id}
                selected={isSelected}
                onClick={() =>
                  dispatch({
                    type: "SET_ASSISTANT_DATA",
                    payload: { personality: p.id },
                  })
                }
                title={p.label}
                description={p.description}
              >
                <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm italic text-muted-foreground">
                  {getGreetingExample(p)}
                </div>
              </SelectionCard>
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
