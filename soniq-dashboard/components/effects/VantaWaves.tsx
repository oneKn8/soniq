"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

interface VantaWavesProps {
  className?: string;
  color?: number;
  shininess?: number;
  waveHeight?: number;
  waveSpeed?: number;
  zoom?: number;
}

export function VantaWaves({
  className,
  color = 0x0a0a1a,
  shininess = 35,
  waveHeight = 15,
  waveSpeed = 0.75,
  zoom = 0.85,
}: VantaWavesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [vantaEffect, setVantaEffect] = useState<{
    destroy: () => void;
  } | null>(null);

  useEffect(() => {
    let effect: { destroy: () => void } | null = null;

    const initVanta = async () => {
      if (!containerRef.current || vantaEffect) return;

      try {
        // Dynamic import for Vanta WAVES
        // @ts-expect-error - vanta doesn't have types
        const WAVES = (await import("vanta/dist/vanta.waves.min")).default;

        effect = WAVES({
          el: containerRef.current,
          THREE: THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          color: color,
          shininess: shininess,
          waveHeight: waveHeight,
          waveSpeed: waveSpeed,
          zoom: zoom,
        });

        setVantaEffect(effect);
      } catch (error) {
        console.error("Failed to initialize Vanta WAVES:", error);
      }
    };

    initVanta();

    return () => {
      if (effect) {
        effect.destroy();
      }
    };
  }, [color, shininess, waveHeight, waveSpeed, zoom, vantaEffect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (vantaEffect) {
        vantaEffect.destroy();
      }
    };
  }, [vantaEffect]);

  return (
    <div ref={containerRef} className={cn("absolute inset-0 z-0", className)} />
  );
}
