"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// COBEOptions interface for the globe configuration
interface COBEOptions {
  width: number;
  height: number;
  onRender: (state: Record<string, number>) => void;
  phi: number;
  theta: number;
  dark: number;
  diffuse: number;
  mapSamples: number;
  mapBrightness: number;
  baseColor: [number, number, number];
  markerColor: [number, number, number];
  glowColor: [number, number, number];
  markers: { location: [number, number]; size: number }[];
  devicePixelRatio: number;
}

// Type for the createGlobe function
type CreateGlobeFn = (
  canvas: HTMLCanvasElement,
  options: COBEOptions,
) => { destroy: () => void };

interface GlobeProps {
  className?: string;
  config?: Partial<COBEOptions>;
}

const GLOBE_CONFIG: Omit<COBEOptions, "width" | "height" | "onRender"> = {
  phi: 0,
  theta: 0.3,
  dark: 1,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.1 },
    { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 },
    { location: [40.7128, -74.006], size: 0.1 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784], size: 0.06 },
  ],
  devicePixelRatio: 2,
};

export function Globe({ className, config = {} }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const [r, setR] = useState(0);
  const [cobeLoaded, setCobeLoaded] = useState(false);

  const phi = useRef(0);
  const width = useRef(0);

  const updatePointerInteraction = (clientX: number | null) => {
    pointerInteracting.current = clientX;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = clientX !== null ? "grabbing" : "grab";
    }
  };

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
      setR(delta / 200);
    }
  };

  useEffect(() => {
    // Dynamically import cobe
    let globe: { destroy: () => void } | undefined;

    const initGlobe = async () => {
      try {
        // Dynamic import - cobe is an optional peer dependency
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createGlobeModule = (await import("cobe" as any)) as {
          default: CreateGlobeFn;
        };
        const createGlobe: CreateGlobeFn = createGlobeModule.default;
        setCobeLoaded(true);

        if (!canvasRef.current) return;

        const onResize = () => {
          if (canvasRef.current) {
            width.current = canvasRef.current.offsetWidth;
          }
        };

        window.addEventListener("resize", onResize);
        onResize();

        const mergedConfig = { ...GLOBE_CONFIG, ...config };

        globe = createGlobe(canvasRef.current, {
          ...mergedConfig,
          width: width.current * 2,
          height: width.current * 2,
          onRender: (state: Record<string, number>) => {
            if (!pointerInteracting.current) {
              phi.current += 0.005;
            }
            state.phi = phi.current + r;
            state.width = width.current * 2;
            state.height = width.current * 2;
          },
        });

        // Add a timeout to fade in the globe after load
        setTimeout(() => {
          if (canvasRef.current) {
            canvasRef.current.style.opacity = "1";
          }
        }, 0);

        return () => {
          window.removeEventListener("resize", onResize);
          globe?.destroy();
        };
      } catch {
        console.warn(
          "Globe component requires the 'cobe' package. Install it with: npm install cobe",
        );
      }
    };

    initGlobe();

    return () => {
      globe?.destroy();
    };
  }, [r, config]);

  return (
    <div
      className={cn(
        "absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[600px]",
        className,
      )}
    >
      <canvas
        className={cn(
          "size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]",
        )}
        ref={canvasRef}
        onPointerDown={(e) => updatePointerInteraction(e.clientX)}
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) =>
          e.touches[0] && updateMovement(e.touches[0].clientX)
        }
      />
      {!cobeLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          Loading globe...
        </div>
      )}
    </div>
  );
}
