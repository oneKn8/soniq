"use client";

import React, { useRef, useState, useCallback } from "react";
import { Camera, X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface AvatarUploadProps {
  currentAvatar?: string;
  userName: string;
  onAvatarChange: (avatarUrl: string | null) => void;
}

interface CropState {
  scale: number;
  rotation: number;
  x: number;
  y: number;
}

// ============================================================================
// AVATAR UPLOAD COMPONENT
// ============================================================================

export function AvatarUpload({
  currentAvatar,
  userName,
  onAvatarChange,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropState, setCropState] = useState<CropState>({
    scale: 1,
    rotation: 0,
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
          setIsEditing(true);
          setCropState({ scale: 1, rotation: 0, x: 0, y: 0 });
        };
        reader.readAsDataURL(file);
      }
    },
    [],
  );

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
        setIsEditing(true);
        setCropState({ scale: 1, rotation: 0, x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSave = useCallback(() => {
    if (previewUrl) {
      // In a real app, you would crop the image here
      // For now, we just save the original
      onAvatarChange(previewUrl);
      setIsEditing(false);
      setPreviewUrl(null);
    }
  }, [previewUrl, onAvatarChange]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setPreviewUrl(null);
    setCropState({ scale: 1, rotation: 0, x: 0, y: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleRemoveAvatar = useCallback(() => {
    onAvatarChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onAvatarChange]);

  const adjustScale = useCallback((delta: number) => {
    setCropState((prev) => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale + delta)),
    }));
  }, []);

  const rotate = useCallback(() => {
    setCropState((prev) => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  }, []);

  // Editor Modal
  if (isEditing && previewUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Crop Avatar
            </h3>
            <button
              onClick={handleCancel}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Preview Area */}
          <div className="relative mx-auto mb-6 h-64 w-64 overflow-hidden rounded-full border-2 border-dashed border-border bg-muted">
            <img
              src={previewUrl}
              alt="Preview"
              className="absolute h-full w-full object-cover"
              style={{
                transform: `scale(${cropState.scale}) rotate(${cropState.rotation}deg)`,
                transformOrigin: "center",
              }}
            />
          </div>

          {/* Controls */}
          <div className="mb-6 flex items-center justify-center gap-4">
            <button
              onClick={() => adjustScale(-0.1)}
              className="rounded-lg border border-border bg-muted p-2 text-foreground hover:bg-accent"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <div className="w-32">
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={cropState.scale}
                onChange={(e) =>
                  setCropState((prev) => ({
                    ...prev,
                    scale: parseFloat(e.target.value),
                  }))
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
              />
            </div>
            <button
              onClick={() => adjustScale(0.1)}
              className="rounded-lg border border-border bg-muted p-2 text-foreground hover:bg-accent"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              onClick={rotate}
              className="rounded-lg border border-border bg-muted p-2 text-foreground hover:bg-accent"
            >
              <RotateCw className="h-5 w-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save Avatar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      {/* Avatar Display */}
      <div
        className={cn(
          "relative h-24 w-24 overflow-hidden rounded-full border-2 transition-colors",
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border bg-muted",
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {currentAvatar ? (
          <img
            src={currentAvatar}
            alt={userName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 text-2xl font-bold text-primary">
            {initials}
          </div>
        )}

        {/* Hover Overlay */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
        >
          <Camera className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Upload Controls */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="mr-2 h-4 w-4" />
          Upload Photo
        </Button>

        {currentAvatar && (
          <button
            onClick={handleRemoveAvatar}
            className="block text-sm text-destructive hover:underline"
          >
            Remove photo
          </button>
        )}

        <p className="text-xs text-muted-foreground">
          JPG, PNG, or GIF. Max 5MB.
        </p>
      </div>
    </div>
  );
}

export default AvatarUpload;
