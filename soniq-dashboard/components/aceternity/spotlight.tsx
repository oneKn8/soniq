"use client";

import { cn } from "@/lib/utils";
import React from "react";

type SpotlightProps = {
  className?: string;
  fill?: string;
};

export const Spotlight = ({ className, fill }: SpotlightProps) => {
  return (
    <svg
      className={cn(
        "pointer-events-none absolute z-[1] h-[169%] w-[138%] animate-spotlight opacity-0 lg:w-[84%]",
        className,
      )}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
    >
      <g filter="url(#filter)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill || "white"}
          fillOpacity="0.21"
        />
      </g>
      <defs>
        <filter
          id="filter"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="151"
            result="effect1_foregroundBlur_1065_8"
          />
        </filter>
      </defs>
    </svg>
  );
};

export const SpotlightNew = ({
  className,
  fill,
  gradientFirst = "radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .08) 0, hsla(210, 100%, 55%, .02) 50%, hsla(210, 100%, 45%, 0) 80%)",
  gradientSecond = "radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .06) 0, hsla(210, 100%, 55%, .02) 80%, transparent 100%)",
  gradientThird = "radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .04) 0, hsla(210, 100%, 45%, .02) 80%, transparent 100%)",
}: {
  className?: string;
  fill?: string;
  gradientFirst?: string;
  gradientSecond?: string;
  gradientThird?: string;
}) => {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-0 h-full w-full",
        className,
      )}
    >
      {/* Main spotlight */}
      <div
        className="absolute left-1/2 top-0 h-[50vh] w-[60vw] -translate-x-1/2 opacity-50"
        style={{
          background: gradientFirst,
        }}
      />
      {/* Secondary glow */}
      <div
        className="absolute left-1/2 top-0 h-[80vh] w-[90vw] -translate-x-1/2"
        style={{
          background: gradientSecond,
        }}
      />
      {/* Tertiary ambient */}
      <div
        className="absolute left-1/2 top-0 h-screen w-screen -translate-x-1/2"
        style={{
          background: gradientThird,
        }}
      />
    </div>
  );
};
