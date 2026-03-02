import { useId } from "react";
import { cn } from "@/lib/utils";

interface SoniqWordmarkProps {
  className?: string;
  decorative?: boolean;
  title?: string;
}

export function SoniqWordmark({
  className,
  decorative = false,
  title = "Soniq",
}: SoniqWordmarkProps) {
  const id = useId().replace(/:/g, "");
  const brandId = `soniq-wordmark-brand-${id}`;

  return (
    <svg
      viewBox="0 0 520 164"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative}
      aria-label={decorative ? undefined : title}
      className={cn("overflow-visible", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <defs>
        <linearGradient
          id={brandId}
          x1="392"
          y1="44"
          x2="468"
          y2="126"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="52%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>

      {decorative ? null : <title>{title}</title>}
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="12"
      >
        <g id="letter-s">
          <path d="M86 30C78 20 64 14 46 14H36C19 14 6 26 6 42C6 56 16 65 35 70L57 75C77 80 88 89 88 103C88 120 74 132 55 132H40C25 132 13 127 4 117" />
        </g>

        <g id="letter-o" transform="translate(116 0)">
          <circle cx="34" cy="78" r="30" />
        </g>

        <g id="letter-n" transform="translate(208 0)">
          <path d="M0 132V70C0 37 18 16 46 16C74 16 92 37 92 70V132" />
        </g>

        <g id="letter-i" transform="translate(334 0)">
          <circle cx="6" cy="26" r="5.5" fill="currentColor" stroke="none" />
          <path d="M6 54V132" />
        </g>

        <g id="letter-q" transform="translate(382 0)" stroke={`url(#${brandId})`}>
          <circle cx="34" cy="78" r="30" />
          <path d="M56 100L83 127" />
        </g>
      </g>
    </svg>
  );
}
