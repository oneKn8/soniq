"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary. It replaces the root layout when the layout itself (or
 * anything above the route segment) throws, so it must render its own <html>
 * and <body> and cannot depend on globals.css. Styling is therefore inlined and
 * kept theme-neutral on the Soniq dark surface.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          textAlign: "center",
          background: "#09090b",
          color: "#f8fafc",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 18,
            border: "1px solid rgba(165,180,252,0.16)",
            background: "#111827",
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 256 256"
            fill="none"
            role="img"
            aria-label="Soniq"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                id="global-error-brand"
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
            </defs>
            <circle
              cx="128"
              cy="128"
              r="58"
              stroke="url(#global-error-brand)"
              strokeWidth="16"
            />
            <path
              d="M169 169L196 196"
              stroke="url(#global-error-brand)"
              strokeWidth="16"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
          Soniq ran into a problem
        </h1>
        <p
          style={{
            margin: "12px 0 0",
            maxWidth: 420,
            fontSize: 14,
            lineHeight: 1.5,
            color: "#a1a1aa",
          }}
        >
          A critical error stopped the app from loading. Please try again in a
          moment.
        </p>

        {error.digest && (
          <p
            style={{
              margin: "16px 0 0",
              padding: "4px 12px",
              borderRadius: 6,
              border: "1px solid rgba(148,163,184,0.2)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
              color: "#a1a1aa",
            }}
          >
            Reference: {error.digest}
          </p>
        )}

        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 32,
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
            color: "#0b1120",
            background: "#22d3ee",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
