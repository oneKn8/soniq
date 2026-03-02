"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// SKIP LINKS COMPONENT
// Provides keyboard users quick navigation to main content areas
// ============================================================================

interface SkipLink {
  href: string;
  label: string;
}

const DEFAULT_LINKS: SkipLink[] = [
  { href: "#main-content", label: "Skip to main content" },
  { href: "#navigation", label: "Skip to navigation" },
];

interface SkipLinksProps {
  links?: SkipLink[];
  className?: string;
}

export function SkipLinks({
  links = DEFAULT_LINKS,
  className,
}: SkipLinksProps) {
  return (
    <div className={cn("fixed left-0 top-0 z-[9999]", className)}>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={cn(
            // Visually hidden by default
            "sr-only",
            // Visible when focused
            "focus:not-sr-only focus:absolute focus:left-4 focus:top-4",
            "focus:z-[9999] focus:block",
            // Styling
            "focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2",
            "focus:text-sm focus:font-medium focus:text-primary-foreground",
            "focus:shadow-lg focus:outline-none",
            "focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
          )}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN CONTENT LANDMARK
// Wrapper for main content with proper landmark and ID
// ============================================================================

interface MainContentProps {
  children: React.ReactNode;
  className?: string;
}

export function MainContent({ children, className }: MainContentProps) {
  return (
    <main
      id="main-content"
      role="main"
      tabIndex={-1}
      className={cn("outline-none", className)}
    >
      {children}
    </main>
  );
}

// ============================================================================
// NAVIGATION LANDMARK
// Wrapper for navigation with proper landmark and ID
// ============================================================================

interface NavigationLandmarkProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

export function NavigationLandmark({
  children,
  label = "Main navigation",
  className,
}: NavigationLandmarkProps) {
  return (
    <nav
      id="navigation"
      role="navigation"
      aria-label={label}
      className={className}
    >
      {children}
    </nav>
  );
}

// ============================================================================
// VISUALLY HIDDEN (for screen readers only)
// ============================================================================

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: React.ElementType;
}

export function VisuallyHidden({
  children,
  as: Component = "span",
}: VisuallyHiddenProps) {
  return <Component className="sr-only">{children}</Component>;
}

// ============================================================================
// FOCUS RING (for custom focus indicators)
// ============================================================================

interface FocusRingProps {
  children: React.ReactNode;
  className?: string;
  within?: boolean;
}

export function FocusRing({
  children,
  className,
  within = false,
}: FocusRingProps) {
  return (
    <div
      className={cn(
        within
          ? "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background"
          : "focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        "rounded-lg transition-shadow",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default SkipLinks;
