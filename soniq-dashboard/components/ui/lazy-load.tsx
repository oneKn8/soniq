"use client";

import React, { Suspense, useRef, useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeVariants, transitions } from "@/lib/animations";

// ============================================================================
// SKELETON LOADER
// ============================================================================

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "shimmer" | "none";
}

export function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
  animation = "shimmer",
}: SkeletonProps) {
  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "",
    rounded: "rounded-xl",
  };

  const animationClasses = {
    pulse: "animate-pulse",
    shimmer:
      "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
    none: "",
  };

  return (
    <div
      className={cn(
        "bg-muted",
        variantClasses[variant],
        animationClasses[animation],
        className,
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    />
  );
}

// ============================================================================
// SKELETON CARD
// ============================================================================

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 space-y-3",
        className,
      )}
    >
      <Skeleton variant="rounded" height={20} width="60%" />
      <Skeleton variant="rounded" height={16} width="100%" />
      <Skeleton variant="rounded" height={16} width="80%" />
      <div className="flex gap-2 pt-2">
        <Skeleton variant="rounded" height={32} width={80} />
        <Skeleton variant="rounded" height={32} width={80} />
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON LIST
// ============================================================================

interface SkeletonListProps {
  count?: number;
  className?: string;
  itemClassName?: string;
}

export function SkeletonList({
  count = 3,
  className,
  itemClassName,
}: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-3 rounded-lg border border-border bg-card p-3",
            itemClassName,
          )}
        >
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="rounded" height={16} width="40%" />
            <Skeleton variant="rounded" height={12} width="60%" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// LAZY LOAD COMPONENT
// ============================================================================

interface LazyLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  className?: string;
  minHeight?: number | string;
  animate?: boolean;
}

export function LazyLoad({
  children,
  fallback,
  rootMargin = "100px",
  threshold = 0,
  className,
  minHeight = 100,
  animate = true,
}: LazyLoadProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasLoaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin, threshold, hasLoaded]);

  const defaultFallback = (
    <div
      style={{
        minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight,
      }}
      className="flex items-center justify-center"
    >
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div ref={ref} className={className}>
      {animate ? (
        <AnimatePresence mode="wait">
          {isVisible ? (
            <motion.div
              key="content"
              variants={fadeVariants}
              initial="hidden"
              animate="visible"
              transition={transitions.ease}
            >
              {children}
            </motion.div>
          ) : (
            <motion.div
              key="fallback"
              variants={fadeVariants}
              initial="visible"
              exit="exit"
              transition={transitions.ease}
            >
              {fallback || defaultFallback}
            </motion.div>
          )}
        </AnimatePresence>
      ) : isVisible ? (
        children
      ) : (
        fallback || defaultFallback
      )}
    </div>
  );
}

// ============================================================================
// SUSPENSE BOUNDARY
// ============================================================================

interface SuspenseBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function SuspenseBoundary({
  children,
  fallback,
  className,
}: SuspenseBoundaryProps) {
  const defaultFallback = (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );

  return <Suspense fallback={fallback || defaultFallback}>{children}</Suspense>;
}

// ============================================================================
// PROGRESSIVE IMAGE
// ============================================================================

interface ProgressiveImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
}

export const ProgressiveImage = memo(function ProgressiveImage({
  src,
  alt,
  placeholder,
  className,
  containerClassName,
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      {/* Placeholder/blur */}
      {placeholder && !isLoaded && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className={cn(
            "absolute inset-0 h-full w-full object-cover blur-lg scale-110",
            className,
          )}
        />
      )}

      {/* Skeleton if no placeholder */}
      {!placeholder && !isLoaded && !error && (
        <Skeleton
          variant="rectangular"
          className={cn("absolute inset-0 h-full w-full", className)}
        />
      )}

      {/* Main image */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />

      {/* Error state */}
      {error && (
        <div
          className={cn(
            "flex items-center justify-center bg-muted text-muted-foreground",
            className,
          )}
        >
          <span className="text-xs">Failed to load</span>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// DEFERRED RENDER
// Delays rendering until after initial paint
// ============================================================================

interface DeferredRenderProps {
  children: React.ReactNode;
  delay?: number;
  fallback?: React.ReactNode;
}

export function DeferredRender({
  children,
  delay = 0,
  fallback = null,
}: DeferredRenderProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (delay === 0) {
      // Use requestIdleCallback for optimal timing
      if (typeof requestIdleCallback !== "undefined") {
        const id = requestIdleCallback(() => setShouldRender(true));
        return () => cancelIdleCallback(id);
      } else {
        // Fallback for Safari
        const id = setTimeout(() => setShouldRender(true), 1);
        return () => clearTimeout(id);
      }
    } else {
      const id = setTimeout(() => setShouldRender(true), delay);
      return () => clearTimeout(id);
    }
  }, [delay]);

  return shouldRender ? <>{children}</> : <>{fallback}</>;
}

export default LazyLoad;
