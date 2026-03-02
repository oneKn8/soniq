import { useId } from "react";
import { cn } from "@/lib/utils";

interface SoniqMarkProps {
  className?: string;
  animated?: boolean;
  decorative?: boolean;
  title?: string;
}

export function SoniqMark({
  className,
  animated = false,
  decorative = false,
  title = "Soniq",
}: SoniqMarkProps) {
  const id = useId().replace(/:/g, "");
  const surfaceId = `soniq-surface-${id}`;
  const brandId = `soniq-brand-${id}`;
  const glowId = `soniq-glow-${id}`;

  return (
    <svg
      viewBox="0 0 256 256"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative}
      aria-label={decorative ? undefined : title}
      className={cn("overflow-visible", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <defs>
        <linearGradient
          id={surfaceId}
          x1="40"
          y1="24"
          x2="224"
          y2="236"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#111827" />
          <stop offset="50%" stopColor="#09090B" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient
          id={brandId}
          x1="72"
          y1="64"
          x2="196"
          y2="192"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="52%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <radialGradient
          id={glowId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(128 128) rotate(90) scale(82)"
        >
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.3" />
          <stop offset="58%" stopColor="#22D3EE" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </radialGradient>
      </defs>

      {animated ? (
        <style>{`
          @keyframes soniq-bar-left {
            0%, 100% { transform: scaleY(0.82); opacity: 0.72; }
            50% { transform: scaleY(1.08); opacity: 1; }
          }

          @keyframes soniq-bar-center {
            0%, 100% { transform: scaleY(0.9); }
            45% { transform: scaleY(1.12); }
          }

          @keyframes soniq-bar-right {
            0%, 100% { transform: scaleY(0.7); opacity: 0.68; }
            50% { transform: scaleY(1.16); opacity: 1; }
          }

          @keyframes soniq-tail {
            0%, 100% { transform: translate(0px, 0px); }
            50% { transform: translate(2px, 2px); }
          }

          @keyframes soniq-halo {
            0%, 100% { opacity: 0.92; transform: scale(0.98); }
            50% { opacity: 1; transform: scale(1.02); }
          }

          .soniq-halo {
            transform-origin: center;
            animation: soniq-halo 3.2s ease-in-out infinite;
          }

          .soniq-tail {
            transform-origin: 128px 128px;
            animation: soniq-tail 2.8s ease-in-out infinite;
          }

          .soniq-bar {
            transform-box: fill-box;
            transform-origin: center bottom;
          }

          .soniq-bar-left {
            animation: soniq-bar-left 1.4s ease-in-out infinite;
          }

          .soniq-bar-center {
            animation: soniq-bar-center 1.4s ease-in-out infinite 0.1s;
          }

          .soniq-bar-right {
            animation: soniq-bar-right 1.4s ease-in-out infinite 0.2s;
          }

          @media (prefers-reduced-motion: reduce) {
            .soniq-halo,
            .soniq-tail,
            .soniq-bar-left,
            .soniq-bar-center,
            .soniq-bar-right {
              animation: none;
            }
          }
        `}</style>
      ) : null}

      {decorative ? null : <title>{title}</title>}
      <rect
        x="16"
        y="16"
        width="224"
        height="224"
        rx="56"
        fill={`url(#${surfaceId})`}
      />
      <rect
        x="16.5"
        y="16.5"
        width="223"
        height="223"
        rx="55.5"
        stroke="#A5B4FC"
        strokeOpacity="0.14"
      />
      <circle
        cx="128"
        cy="128"
        r="78"
        fill={`url(#${glowId})`}
        className={animated ? "soniq-halo" : undefined}
      />
      <circle
        cx="128"
        cy="128"
        r="58"
        stroke={`url(#${brandId})`}
        strokeWidth="16"
      />
      <path
        d="M169 169L196 196"
        stroke={`url(#${brandId})`}
        strokeWidth="16"
        strokeLinecap="round"
        className={animated ? "soniq-tail" : undefined}
      />
      <rect
        x="100"
        y="108"
        width="12"
        height="40"
        rx="6"
        fill="#F8FAFC"
        opacity="0.78"
        className={animated ? "soniq-bar soniq-bar-left" : undefined}
      />
      <rect
        x="122"
        y="90"
        width="12"
        height="76"
        rx="6"
        fill="#F8FAFC"
        className={animated ? "soniq-bar soniq-bar-center" : undefined}
      />
      <rect
        x="144"
        y="114"
        width="12"
        height="28"
        rx="6"
        fill="#F8FAFC"
        opacity="0.78"
        className={animated ? "soniq-bar soniq-bar-right" : undefined}
      />
    </svg>
  );
}
