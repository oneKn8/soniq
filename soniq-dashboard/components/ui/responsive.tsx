"use client";

import React, { memo } from "react";
import { cn } from "@/lib/utils";
import { useResponsive, type Breakpoint } from "@/hooks/useResponsive";

// ============================================================================
// SHOW/HIDE COMPONENTS BASED ON BREAKPOINT
// ============================================================================

interface ResponsiveProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Show content only on mobile (< md)
 */
export const MobileOnly = memo(function MobileOnly({
  children,
  className,
}: ResponsiveProps) {
  return <div className={cn("md:hidden", className)}>{children}</div>;
});

/**
 * Show content only on tablet (md to lg)
 */
export const TabletOnly = memo(function TabletOnly({
  children,
  className,
}: ResponsiveProps) {
  return (
    <div className={cn("hidden md:block lg:hidden", className)}>{children}</div>
  );
});

/**
 * Show content only on desktop (>= lg)
 */
export const DesktopOnly = memo(function DesktopOnly({
  children,
  className,
}: ResponsiveProps) {
  return <div className={cn("hidden lg:block", className)}>{children}</div>;
});

/**
 * Show content on tablet and up (>= md)
 */
export const TabletUp = memo(function TabletUp({
  children,
  className,
}: ResponsiveProps) {
  return <div className={cn("hidden md:block", className)}>{children}</div>;
});

/**
 * Show content on mobile and tablet (< lg)
 */
export const MobileTablet = memo(function MobileTablet({
  children,
  className,
}: ResponsiveProps) {
  return <div className={cn("lg:hidden", className)}>{children}</div>;
});

// ============================================================================
// RESPONSIVE CONTAINER
// ============================================================================

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const containerSizes = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
};

export const Container = memo(function Container({
  children,
  className,
  size = "xl",
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        containerSizes[size],
        className,
      )}
    >
      {children}
    </div>
  );
});

// ============================================================================
// RESPONSIVE GRID
// ============================================================================

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number | string;
}

export const ResponsiveGrid = memo(function ResponsiveGrid({
  children,
  className,
  cols = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = 4,
}: ResponsiveGridProps) {
  const gridColsClasses = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };

  const gapClass = typeof gap === "number" ? `gap-${gap}` : gap;

  return (
    <div
      className={cn(
        "grid",
        gapClass,
        cols.default &&
          gridColsClasses[cols.default as keyof typeof gridColsClasses],
        cols.sm &&
          `sm:${gridColsClasses[cols.sm as keyof typeof gridColsClasses]}`,
        cols.md &&
          `md:${gridColsClasses[cols.md as keyof typeof gridColsClasses]}`,
        cols.lg &&
          `lg:${gridColsClasses[cols.lg as keyof typeof gridColsClasses]}`,
        cols.xl &&
          `xl:${gridColsClasses[cols.xl as keyof typeof gridColsClasses]}`,
        className,
      )}
    >
      {children}
    </div>
  );
});

// ============================================================================
// RESPONSIVE STACK
// ============================================================================

interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  direction?: {
    default?: "row" | "col";
    sm?: "row" | "col";
    md?: "row" | "col";
    lg?: "row" | "col";
  };
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
}

export const ResponsiveStack = memo(function ResponsiveStack({
  children,
  className,
  direction = { default: "col", md: "row" },
  gap = 4,
  align = "start",
  justify = "start",
}: ResponsiveStackProps) {
  const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  };

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
  };

  return (
    <div
      className={cn(
        "flex",
        `gap-${gap}`,
        alignClasses[align],
        justifyClasses[justify],
        direction.default === "col" ? "flex-col" : "flex-row",
        direction.sm &&
          (direction.sm === "col" ? "sm:flex-col" : "sm:flex-row"),
        direction.md &&
          (direction.md === "col" ? "md:flex-col" : "md:flex-row"),
        direction.lg &&
          (direction.lg === "col" ? "lg:flex-col" : "lg:flex-row"),
        className,
      )}
    >
      {children}
    </div>
  );
});

// ============================================================================
// RESPONSIVE TEXT
// ============================================================================

interface ResponsiveTextProps {
  children: React.ReactNode;
  className?: string;
  size?: {
    default?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
    sm?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
    md?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
    lg?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
  };
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
}

const textSizeClasses = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
};

export const ResponsiveText = memo(function ResponsiveText({
  children,
  className,
  size = { default: "base" },
  as: Component = "p",
}: ResponsiveTextProps) {
  return (
    <Component
      className={cn(
        size.default && textSizeClasses[size.default],
        size.sm && `sm:${textSizeClasses[size.sm]}`,
        size.md && `md:${textSizeClasses[size.md]}`,
        size.lg && `lg:${textSizeClasses[size.lg]}`,
        className,
      )}
    >
      {children}
    </Component>
  );
});

// ============================================================================
// RESPONSIVE PADDING/MARGIN
// ============================================================================

interface ResponsiveSpacingProps {
  children: React.ReactNode;
  className?: string;
  p?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  px?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  py?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
}

export const ResponsiveSpacing = memo(function ResponsiveSpacing({
  children,
  className,
  p,
  px,
  py,
}: ResponsiveSpacingProps) {
  const classes: string[] = [];

  if (p) {
    if (p.default !== undefined) classes.push(`p-${p.default}`);
    if (p.sm !== undefined) classes.push(`sm:p-${p.sm}`);
    if (p.md !== undefined) classes.push(`md:p-${p.md}`);
    if (p.lg !== undefined) classes.push(`lg:p-${p.lg}`);
  }

  if (px) {
    if (px.default !== undefined) classes.push(`px-${px.default}`);
    if (px.sm !== undefined) classes.push(`sm:px-${px.sm}`);
    if (px.md !== undefined) classes.push(`md:px-${px.md}`);
    if (px.lg !== undefined) classes.push(`lg:px-${px.lg}`);
  }

  if (py) {
    if (py.default !== undefined) classes.push(`py-${py.default}`);
    if (py.sm !== undefined) classes.push(`sm:py-${py.sm}`);
    if (py.md !== undefined) classes.push(`md:py-${py.md}`);
    if (py.lg !== undefined) classes.push(`lg:py-${py.lg}`);
  }

  return <div className={cn(classes.join(" "), className)}>{children}</div>;
});

// ============================================================================
// RESPONSIVE VALUE COMPONENT
// ============================================================================

interface ResponsiveValueProps<T> {
  values: {
    base: T;
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
  };
  render: (value: T) => React.ReactNode;
}

export function ResponsiveValue<T>({
  values,
  render,
}: ResponsiveValueProps<T>) {
  const { breakpoint } = useResponsive();

  const breakpointOrder: (Breakpoint | "xs")[] = [
    "xs",
    "sm",
    "md",
    "lg",
    "xl",
    "2xl",
  ];
  const currentIndex = breakpointOrder.indexOf(breakpoint);

  // Find the closest defined value at or below current breakpoint
  let value = values.base;
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (bp === "xs") {
      value = values.base;
      break;
    }
    if (values[bp as keyof typeof values] !== undefined) {
      value = values[bp as keyof typeof values] as T;
      break;
    }
  }

  return <>{render(value)}</>;
}

export default {
  MobileOnly,
  TabletOnly,
  DesktopOnly,
  TabletUp,
  MobileTablet,
  Container,
  ResponsiveGrid,
  ResponsiveStack,
  ResponsiveText,
  ResponsiveSpacing,
  ResponsiveValue,
};
