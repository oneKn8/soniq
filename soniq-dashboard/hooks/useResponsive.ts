"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

// ============================================================================
// BREAKPOINTS (matching Tailwind defaults)
// ============================================================================

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// ============================================================================
// USE MEDIA QUERY HOOK
// ============================================================================

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", callback);
      return () => mediaQuery.removeEventListener("change", callback);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ============================================================================
// USE BREAKPOINT HOOK
// ============================================================================

export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${breakpoints[breakpoint]}px)`);
}

// ============================================================================
// USE RESPONSIVE HOOK
// ============================================================================

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  breakpoint: Breakpoint | "xs";
  width: number;
  height: number;
}

function getResponsiveState(): ResponsiveState {
  if (typeof window === "undefined") {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLargeDesktop: false,
      breakpoint: "lg",
      width: 1024,
      height: 768,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  let breakpoint: Breakpoint | "xs" = "xs";
  if (width >= breakpoints["2xl"]) breakpoint = "2xl";
  else if (width >= breakpoints.xl) breakpoint = "xl";
  else if (width >= breakpoints.lg) breakpoint = "lg";
  else if (width >= breakpoints.md) breakpoint = "md";
  else if (width >= breakpoints.sm) breakpoint = "sm";

  return {
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg,
    isLargeDesktop: width >= breakpoints.xl,
    breakpoint,
    width,
    height,
  };
}

const serverSnapshot: ResponsiveState = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isLargeDesktop: false,
  breakpoint: "lg",
  width: 1024,
  height: 768,
};

function subscribeToResize(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

export function useResponsive(): ResponsiveState {
  return useSyncExternalStore(
    subscribeToResize,
    getResponsiveState,
    () => serverSnapshot,
  );
}

// ============================================================================
// USE REDUCED MOTION HOOK
// ============================================================================

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

// ============================================================================
// USE TOUCH DEVICE HOOK
// ============================================================================

function getIsTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is IE-specific
    navigator.msMaxTouchPoints > 0
  );
}

export function useTouchDevice(): boolean {
  const [isTouch] = useState(getIsTouchDevice);
  return isTouch;
}

// ============================================================================
// USE ORIENTATION HOOK
// ============================================================================

type Orientation = "portrait" | "landscape";

function getOrientation(): Orientation {
  if (typeof window === "undefined") return "landscape";
  return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
}

function subscribeToOrientationChange(callback: () => void) {
  window.addEventListener("resize", callback);
  window.addEventListener("orientationchange", callback);
  return () => {
    window.removeEventListener("resize", callback);
    window.removeEventListener("orientationchange", callback);
  };
}

export function useOrientation(): Orientation {
  return useSyncExternalStore(
    subscribeToOrientationChange,
    getOrientation,
    () => "landscape" as Orientation,
  );
}

// ============================================================================
// USE SIDEBAR STATE HOOK (responsive sidebar management)
// ============================================================================

interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export function useSidebarState(): SidebarState {
  const { isMobile, isTablet } = useResponsive();
  const [isOpenState, setIsOpen] = useState(false);
  const [isCollapsedState, setIsCollapsed] = useState(false);

  // Derive actual states based on responsive context
  // On desktop (not mobile, not tablet), sidebar is always visible (not "open" overlay style)
  // On tablet, default to collapsed
  const isOpen = isMobile || isTablet ? isOpenState : false;
  const isCollapsed = isMobile ? false : isTablet ? true : isCollapsedState;

  const toggle = useCallback(() => {
    if (isMobile) {
      setIsOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  }, [isMobile]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    isCollapsed,
    toggle,
    open,
    close,
    setCollapsed: setIsCollapsed,
  };
}

// ============================================================================
// RESPONSIVE VALUE HELPER
// ============================================================================

type ResponsiveValue<T> = {
  base: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  "2xl"?: T;
};

export function useResponsiveValue<T>(values: ResponsiveValue<T>): T {
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
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (bp === "xs") return values.base;
    if (values[bp as Breakpoint] !== undefined) {
      return values[bp as Breakpoint] as T;
    }
  }

  return values.base;
}
