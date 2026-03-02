// ============================================================================
// SONIQ ACCESSIBILITY UTILITIES
// WCAG 2.1 AA compliant helpers
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

export const Keys = {
  Enter: "Enter",
  Space: " ",
  Escape: "Escape",
  Tab: "Tab",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
} as const;

/**
 * Check if a keyboard event is an activation key (Enter or Space)
 */
export function isActivationKey(event: React.KeyboardEvent): boolean {
  return event.key === Keys.Enter || event.key === Keys.Space;
}

/**
 * Check if a keyboard event is an arrow key
 */
export function isArrowKey(event: React.KeyboardEvent): boolean {
  return [
    Keys.ArrowUp,
    Keys.ArrowDown,
    Keys.ArrowLeft,
    Keys.ArrowRight,
  ].includes(event.key as typeof Keys.ArrowUp);
}

// ============================================================================
// FOCUS MANAGEMENT
// ============================================================================

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(
  container: HTMLElement | null,
): HTMLElement[] {
  if (!container) return [];

  const focusableSelectors = [
    'a[href]:not([disabled]):not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])',
    '[contenteditable="true"]:not([disabled])',
  ];

  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors.join(", ")),
  ).filter((el) => {
    // Check if element is visible
    return el.offsetParent !== null;
  });
}

/**
 * Hook for focus trap (for modals, dialogs)
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Focus first focusable element
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== Keys.Tab) return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey) {
        // Shift+Tab: go to last element if at first
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: go to first element if at last
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to previous element
      previousActiveElement.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for roving tabindex (for menu/toolbar navigation)
 */
export function useRovingTabindex<T extends HTMLElement>(
  items: T[],
  options: {
    orientation?: "horizontal" | "vertical" | "both";
    loop?: boolean;
  } = {},
) {
  const { orientation = "vertical", loop = true } = options;
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      const isVertical = orientation === "vertical" || orientation === "both";
      const isHorizontal =
        orientation === "horizontal" || orientation === "both";

      let newIndex = index;

      switch (event.key) {
        case Keys.ArrowDown:
          if (isVertical) {
            event.preventDefault();
            newIndex = loop
              ? (index + 1) % items.length
              : Math.min(index + 1, items.length - 1);
          }
          break;
        case Keys.ArrowUp:
          if (isVertical) {
            event.preventDefault();
            newIndex = loop
              ? (index - 1 + items.length) % items.length
              : Math.max(index - 1, 0);
          }
          break;
        case Keys.ArrowRight:
          if (isHorizontal) {
            event.preventDefault();
            newIndex = loop
              ? (index + 1) % items.length
              : Math.min(index + 1, items.length - 1);
          }
          break;
        case Keys.ArrowLeft:
          if (isHorizontal) {
            event.preventDefault();
            newIndex = loop
              ? (index - 1 + items.length) % items.length
              : Math.max(index - 1, 0);
          }
          break;
        case Keys.Home:
          event.preventDefault();
          newIndex = 0;
          break;
        case Keys.End:
          event.preventDefault();
          newIndex = items.length - 1;
          break;
      }

      if (newIndex !== index) {
        setFocusedIndex(newIndex);
        items[newIndex]?.focus();
      }
    },
    [items, orientation, loop],
  );

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    getTabIndex: (index: number) => (index === focusedIndex ? 0 : -1),
  };
}

// ============================================================================
// ANNOUNCEMENTS (Live Regions)
// ============================================================================

/**
 * Hook for screen reader announcements
 */
export function useAnnounce() {
  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      const announcer = document.createElement("div");
      announcer.setAttribute("role", "status");
      announcer.setAttribute("aria-live", priority);
      announcer.setAttribute("aria-atomic", "true");
      announcer.className = "sr-only";
      announcer.textContent = message;

      document.body.appendChild(announcer);

      // Remove after announcement
      setTimeout(() => {
        document.body.removeChild(announcer);
      }, 1000);
    },
    [],
  );

  return announce;
}

// ============================================================================
// ARIA HELPERS
// ============================================================================

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export function generateId(prefix = "soniq"): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * ARIA props for expandable sections
 */
export function getExpandableProps(
  id: string,
  isExpanded: boolean,
): {
  trigger: Record<string, string | boolean>;
  content: Record<string, string | boolean>;
} {
  return {
    trigger: {
      "aria-expanded": isExpanded,
      "aria-controls": id,
    },
    content: {
      id,
      "aria-hidden": !isExpanded,
    },
  };
}

/**
 * ARIA props for tabs
 */
export function getTabProps(
  tabId: string,
  panelId: string,
  isSelected: boolean,
): {
  tab: Record<string, string | boolean | number>;
  panel: Record<string, string | boolean>;
} {
  return {
    tab: {
      id: tabId,
      role: "tab",
      "aria-selected": isSelected,
      "aria-controls": panelId,
      tabIndex: isSelected ? 0 : -1,
    },
    panel: {
      id: panelId,
      role: "tabpanel",
      "aria-labelledby": tabId,
      hidden: !isSelected,
    },
  };
}

/**
 * ARIA props for dialogs/modals
 */
export function getDialogProps(
  id: string,
  _title?: string,
): Record<string, string> {
  return {
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": `${id}-title`,
  };
}

// ============================================================================
// SKIP LINK COMPONENT PROPS
// ============================================================================

export interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export function getSkipLinkStyles(): string {
  return `
    sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999]
    focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md
    focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
  `;
}

// ============================================================================
// CONTRAST HELPERS
// ============================================================================

/**
 * Calculate relative luminance of a color
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
): number {
  const l1 = getLuminance(color1.r, color1.g, color1.b);
  const l2 = getLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA requirements
 */
export function meetsContrastAA(
  foreground: { r: number; g: number; b: number },
  background: { r: number; g: number; b: number },
  isLargeText = false,
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

// ============================================================================
// FOCUS VISIBLE HELPER
// ============================================================================

/**
 * Hook to detect if focus should be visible (keyboard navigation)
 */
export function useFocusVisible(): boolean {
  const [isFocusVisible, setIsFocusVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        setIsFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setIsFocusVisible(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  return isFocusVisible;
}
