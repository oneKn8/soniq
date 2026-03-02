// ============================================================================
// SONIQ ANIMATION LIBRARY
// Consistent, performant animations using Framer Motion
// ============================================================================

import type { Variants, Transition } from "framer-motion";

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transitions = {
  // Fast, snappy interactions
  fast: {
    type: "spring",
    stiffness: 500,
    damping: 30,
  } as Transition,

  // Standard UI transitions
  default: {
    type: "spring",
    stiffness: 300,
    damping: 25,
  } as Transition,

  // Smooth, gentle transitions
  smooth: {
    type: "spring",
    stiffness: 200,
    damping: 25,
  } as Transition,

  // Ease-based transitions for simple animations
  ease: {
    duration: 0.2,
    ease: [0.25, 0.1, 0.25, 1],
  } as Transition,

  // Slow, deliberate transitions for modals/overlays
  slow: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1],
  } as Transition,

  // No animation (for reduced motion)
  none: {
    duration: 0,
  } as Transition,
} as const;

// ============================================================================
// FADE VARIANTS
// ============================================================================

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 10 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 },
};

// ============================================================================
// SCALE VARIANTS
// ============================================================================

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const scaleInBounce: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 20,
    },
  },
  exit: { opacity: 0, scale: 0.9 },
};

// ============================================================================
// SLIDE VARIANTS
// ============================================================================

export const slideInFromRight: Variants = {
  hidden: { x: "100%", opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: "100%", opacity: 0 },
};

export const slideInFromLeft: Variants = {
  hidden: { x: "-100%", opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: "-100%", opacity: 0 },
};

export const slideInFromBottom: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: { y: 0, opacity: 1 },
  exit: { y: "100%", opacity: 0 },
};

export const slideInFromTop: Variants = {
  hidden: { y: "-100%", opacity: 0 },
  visible: { y: 0, opacity: 1 },
  exit: { y: "-100%", opacity: 0 },
};

// ============================================================================
// STAGGER CONTAINER VARIANTS
// ============================================================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// ============================================================================
// STAGGER ITEM VARIANTS
// ============================================================================

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export const staggerItemScale: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

// ============================================================================
// MODAL/OVERLAY VARIANTS
// ============================================================================

export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15 },
  },
};

// ============================================================================
// SIDEBAR VARIANTS
// ============================================================================

export const sidebarVariants: Variants = {
  expanded: { width: 240 },
  collapsed: { width: 72 },
};

// ============================================================================
// PANEL VARIANTS
// ============================================================================

export const panelSlideRight: Variants = {
  hidden: { x: "100%", opacity: 0.5 },
  visible: {
    x: 0,
    opacity: 1,
    transition: transitions.smooth,
  },
  exit: {
    x: "100%",
    opacity: 0.5,
    transition: transitions.ease,
  },
};

export const panelSlideUp: Variants = {
  hidden: { y: "100%", opacity: 0.5 },
  visible: {
    y: 0,
    opacity: 1,
    transition: transitions.smooth,
  },
  exit: {
    y: "100%",
    opacity: 0.5,
    transition: transitions.ease,
  },
};

// ============================================================================
// HOVER ANIMATIONS (for whileHover)
// ============================================================================

export const hoverLift = {
  y: -2,
  transition: transitions.fast,
};

export const hoverScale = {
  scale: 1.02,
  transition: transitions.fast,
};

export const hoverGlow = {
  boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)",
  transition: transitions.fast,
};

// ============================================================================
// TAP ANIMATIONS (for whileTap)
// ============================================================================

export const tapScale = {
  scale: 0.98,
};

export const tapPress = {
  scale: 0.95,
};

// ============================================================================
// BUTTON VARIANTS
// ============================================================================

export const buttonVariants: Variants = {
  idle: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
  disabled: { opacity: 0.5 },
};

// ============================================================================
// LIST ITEM VARIANTS
// ============================================================================

export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
};

// ============================================================================
// CARD VARIANTS
// ============================================================================

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  hover: {
    y: -4,
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
  },
};

// ============================================================================
// NOTIFICATION VARIANTS
// ============================================================================

export const notificationVariants: Variants = {
  hidden: { opacity: 0, y: -20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

// ============================================================================
// LOADING/SKELETON VARIANTS
// ============================================================================

export const shimmer: Variants = {
  initial: { x: "-100%" },
  animate: {
    x: "100%",
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: "linear",
    },
  },
};

export const pulse: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: 1,
    transition: {
      repeat: Infinity,
      repeatType: "reverse",
      duration: 1,
    },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Get appropriate transition based on reduced motion preference
 */
export function getTransition(transition: Transition): Transition {
  if (prefersReducedMotion()) {
    return transitions.none;
  }
  return transition;
}

/**
 * Create stagger delay for index
 */
export function staggerDelay(index: number, baseDelay = 0.05): number {
  return index * baseDelay;
}

/**
 * Conditional variants based on reduced motion
 */
export function motionSafe<T>(variants: T, fallback: T): T {
  if (prefersReducedMotion()) {
    return fallback;
  }
  return variants;
}
