"use client";

import { useEffect, useState, useRef } from "react";
import { useTenant } from "@/context/TenantContext";
import { get, put } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  Check,
  ArrowLeft,
  User,
  Volume2,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// Aceternity & MagicUI components
import {
  CardContainer,
  CardBody,
  CardItem,
} from "@/components/aceternity/3d-card";
import { WobbleCard } from "@/components/aceternity/wobble-card";
import { TextGenerateEffect } from "@/components/aceternity/text-generate-effect";
import { SpotlightNew } from "@/components/aceternity/spotlight";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { ShineBorder } from "@/components/magicui/shine-border";

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

interface AssistantSettings {
  agent_name: string;
  voice_id: string;
  personality: Personality | null;
}

export default function AssistantSettingsPage() {
  const { currentTenant, refreshTenants } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [formData, setFormData] = useState<AssistantSettings>({
    agent_name: "",
    voice_id: "",
    personality: null,
  });

  const businessName = currentTenant?.business_name || "your business";

  useEffect(() => {
    if (currentTenant) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tenantData = currentTenant as Record<string, any>;
      setFormData({
        agent_name: tenantData.agent_name || "",
        voice_id: tenantData.voice_config?.voiceId || "",
        personality: tenantData.agent_personality?.tone || null,
      });
      setIsLoading(false);
    }
  }, [currentTenant]);

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

  const handleSave = async () => {
    if (!currentTenant) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await put(`/api/tenants/${currentTenant.id}`, {
        agent_name: formData.agent_name,
        voice_config: {
          voiceId: formData.voice_id,
        },
        agent_personality: {
          tone: formData.personality,
        },
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

  const canSave =
    formData.agent_name.trim() !== "" &&
    formData.voice_id !== "" &&
    formData.personality !== null;

  const getGreetingExample = (p: (typeof PERSONALITIES)[0]) => {
    return p.example
      .replace("{business}", businessName)
      .replace("{name}", formData.agent_name || "{name}");
  };

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

        {/* Audio element for voice preview */}
        <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

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
            words="Assistant Settings"
            className="text-2xl font-semibold text-foreground md:text-3xl"
            duration={0.3}
          />
          <p className="mt-2 text-muted-foreground">
            Customize your AI assistant&apos;s identity and personality
          </p>
        </div>

        {/* Assistant name with shine border */}
        <div className="relative z-10 space-y-3">
          <Label htmlFor="assistant-name">Assistant name</Label>
          <ShineBorder
            borderRadius={8}
            borderWidth={1}
            duration={10}
            color={formData.agent_name ? "#6366f1" : "#64748b"}
            className="w-full min-w-full bg-background p-0"
          >
            <Input
              id="assistant-name"
              placeholder="Sarah"
              value={formData.agent_name}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  agent_name: e.target.value,
                }));
                setSaveSuccess(false);
                setError(null);
              }}
              className="border-0 bg-transparent focus-visible:ring-0"
            />
          </ShineBorder>
          {formData.personality && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">
                Suggestions:
              </span>
              {NAME_SUGGESTIONS[formData.personality].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      agent_name: suggestion,
                    }));
                    setSaveSuccess(false);
                    setError(null);
                  }}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Voice selection with 3D cards */}
        <div className="relative z-10 space-y-4">
          <Label className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Voice
          </Label>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VOICES.map((voiceOption) => {
              const isSelected = formData.voice_id === voiceOption.id;
              const isPlaying = playingVoice === voiceOption.id;

              return (
                <CardContainer
                  key={voiceOption.id}
                  containerClassName="py-4"
                  className="inter-var"
                >
                  <CardBody
                    className={cn(
                      "relative h-auto w-full rounded-xl border p-4 transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                        : "border-border bg-card hover:border-primary/50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          voice_id: voiceOption.id,
                        }));
                        setSaveSuccess(false);
                        setError(null);
                      }}
                      className="flex h-full w-full flex-col items-center text-center"
                    >
                      <CardItem translateZ={30} className="w-full">
                        {isSelected && (
                          <div className="absolute right-2 top-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                        <div
                          className={cn(
                            "mx-auto flex h-16 w-16 items-center justify-center rounded-full",
                            voiceOption.type === "female"
                              ? "bg-gradient-to-br from-pink-400 to-rose-600"
                              : "bg-gradient-to-br from-blue-400 to-indigo-600",
                          )}
                        >
                          <User className="h-8 w-8 text-white" />
                        </div>
                      </CardItem>
                      <CardItem translateZ={20} className="mt-4">
                        <p className="text-lg font-semibold">
                          {voiceOption.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {voiceOption.tone}
                        </p>
                      </CardItem>
                      <CardItem translateZ={40} className="mt-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playPreview(voiceOption);
                          }}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full transition-all",
                            isPlaying
                              ? "scale-110 bg-primary text-primary-foreground"
                              : "bg-muted hover:scale-105 hover:bg-primary/20",
                          )}
                        >
                          {isPlaying ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </button>
                      </CardItem>
                    </button>
                  </CardBody>
                </CardContainer>
              );
            })}
          </div>
        </div>

        {/* Personality selection with wobble cards */}
        <div className="relative z-10 space-y-4">
          <Label>Personality</Label>
          <div className="grid gap-4 md:grid-cols-3">
            {PERSONALITIES.map((p) => {
              const isSelected = formData.personality === p.id;

              return (
                <div key={p.id} className="relative">
                  {isSelected && (
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary via-primary/50 to-primary opacity-75 blur-sm" />
                  )}
                  <WobbleCard
                    containerClassName={cn(
                      "min-h-[180px] cursor-pointer relative",
                      isSelected ? "bg-primary" : p.color,
                    )}
                    className="p-4"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          personality: p.id,
                        }));
                        setSaveSuccess(false);
                        setError(null);
                      }}
                      className="flex h-full w-full flex-col text-left"
                    >
                      {isSelected && (
                        <div className="absolute right-3 top-3">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-white">
                        {p.label}
                      </h3>
                      <p className="mt-1 text-sm text-white/70">
                        {p.description}
                      </p>
                      <div className="mt-4 rounded-lg bg-white/10 p-3">
                        <p className="text-sm italic text-white/90">
                          {getGreetingExample(p)}
                        </p>
                      </div>
                    </button>
                  </WobbleCard>
                </div>
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
