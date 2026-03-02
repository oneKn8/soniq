"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

export const BackgroundBeams = React.memo(
  ({ className }: { className?: string }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [beams] = useState(() =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        duration: Math.random() * 10 + 10,
        delay: Math.random() * 10,
        x1: Math.floor(Math.random() * 100),
        x2: Math.floor(Math.random() * 100),
      })),
    );

    return (
      <svg
        ref={svgRef}
        className={cn(
          "pointer-events-none absolute inset-0 z-0 h-full w-full",
          className,
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <defs>
          <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(120, 119, 198, 0.8)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <filter id="beam-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
        </defs>
        {beams.map((beam) => (
          <g key={beam.id}>
            <line
              x1={`${beam.x1}%`}
              y1="0"
              x2={`${beam.x2}%`}
              y2="100%"
              stroke="url(#beam-gradient)"
              strokeWidth="1"
              filter="url(#beam-blur)"
              className="animate-beam"
              style={{
                animationDuration: `${beam.duration}s`,
                animationDelay: `${beam.delay}s`,
              }}
            />
          </g>
        ))}
        <style>
          {`
            @keyframes beam {
              0%, 100% {
                opacity: 0;
              }
              50% {
                opacity: 1;
              }
            }
            .animate-beam {
              animation: beam linear infinite;
            }
          `}
        </style>
      </svg>
    );
  },
);

BackgroundBeams.displayName = "BackgroundBeams";

export function BackgroundBeamsWithCollision({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const beams = [
    { initialX: 10, translateX: 10, duration: 7, repeatDelay: 3, delay: 2 },
    { initialX: 600, translateX: 600, duration: 3, repeatDelay: 3, delay: 4 },
    {
      initialX: 100,
      translateX: 100,
      duration: 7,
      repeatDelay: 7,
      className: "h-6",
    },
    { initialX: 400, translateX: 400, duration: 5, repeatDelay: 14, delay: 4 },
    {
      initialX: 800,
      translateX: 800,
      duration: 11,
      repeatDelay: 2,
      className: "h-20",
    },
    {
      initialX: 1000,
      translateX: 1000,
      duration: 4,
      repeatDelay: 2,
      className: "h-12",
    },
    {
      initialX: 1200,
      translateX: 1200,
      duration: 6,
      repeatDelay: 4,
      delay: 2,
      className: "h-6",
    },
  ];

  return (
    <div
      ref={parentRef}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-b from-white to-neutral-100 dark:from-neutral-950 dark:to-neutral-800",
        className,
      )}
    >
      {beams.map((beam, index) => (
        <CollisionBeam
          key={`beam-${index}`}
          containerRef={containerRef}
          parentRef={parentRef}
          {...beam}
        />
      ))}
      {children}
      <div
        ref={containerRef}
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px w-full bg-neutral-600"
      />
    </div>
  );
}

interface CollisionBeamProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  parentRef: React.RefObject<HTMLDivElement | null>;
  initialX?: number;
  translateX?: number;
  initialY?: number;
  translateY?: number;
  duration?: number;
  delay?: number;
  repeatDelay?: number;
  className?: string;
}

const CollisionBeam = React.forwardRef<HTMLDivElement, CollisionBeamProps>(
  (
    {
      parentRef,
      containerRef,
      initialX = 0,
      translateX = 0,
      initialY = 0,
      translateY = 0,
      duration = 8,
      delay = 0,
      repeatDelay = 0,
      className,
    },
    ref,
  ) => {
    const beamRef = useRef<HTMLDivElement>(null);
    const [beamKey, setBeamKey] = useState(0);
    const [cycling, setCycling] = useState(false);

    useEffect(() => {
      const checkCollision = () => {
        if (beamRef.current && containerRef.current && parentRef.current) {
          const beamRect = beamRef.current.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();

          if (beamRect.bottom >= containerRect.top) {
            setCycling(true);
            setTimeout(
              () => {
                setCycling(false);
                setBeamKey((prev) => prev + 1);
              },
              (repeatDelay || 0) * 1000,
            );
          }
        }
      };

      const interval = setInterval(checkCollision, 50);
      return () => clearInterval(interval);
    }, [containerRef, parentRef, repeatDelay]);

    return (
      <div
        key={beamKey}
        ref={beamRef}
        className={cn(
          "absolute left-0 top-0 h-14 w-px rounded-full bg-gradient-to-t from-indigo-500 via-purple-500 to-transparent",
          cycling && "opacity-0",
          className,
        )}
        style={{
          left: initialX,
          animation: cycling
            ? "none"
            : `moveBeam ${duration}s linear ${delay}s infinite`,
        }}
      />
    );
  },
);

CollisionBeam.displayName = "CollisionBeam";
