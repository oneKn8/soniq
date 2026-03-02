// ============================================================================
// SONIQ PERFORMANCE UTILITIES
// Optimization helpers for better UX
// ============================================================================

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
} from "react";

// ============================================================================
// DEBOUNCE HOOK
// ============================================================================

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// DEBOUNCED CALLBACK HOOK
// ============================================================================

export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// ============================================================================
// THROTTLE HOOK
// ============================================================================

export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    const timeElapsed = now - lastExecuted.current;

    if (timeElapsed >= interval) {
      lastExecuted.current = now;
      // Throttle requires synchronous state update - this is intentional
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, interval - timeElapsed);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

// ============================================================================
// THROTTLED CALLBACK HOOK
// ============================================================================

export function useThrottledCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  interval: number,
): T {
  const lastExecuted = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeElapsed = now - lastExecuted.current;

      if (timeElapsed >= interval) {
        lastExecuted.current = now;
        callback(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastExecuted.current = Date.now();
          callback(...args);
          timeoutRef.current = null;
        }, interval - timeElapsed);
      }
    },
    [callback, interval],
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

// ============================================================================
// INTERSECTION OBSERVER HOOK (for lazy loading)
// ============================================================================

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {},
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const {
    threshold = 0,
    root = null,
    rootMargin = "0px",
    freezeOnceVisible = true,
  } = options;

  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const frozen = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || (freezeOnceVisible && frozen.current)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);

        if (visible && freezeOnceVisible) {
          frozen.current = true;
          observer.unobserve(element);
        }
      },
      { threshold, root, rootMargin },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, root, rootMargin, freezeOnceVisible]);

  return [elementRef, isVisible];
}

// ============================================================================
// LAZY RENDER HOOK
// ============================================================================

interface UseLazyRenderOptions {
  rootMargin?: string;
  fallback?: React.ReactNode;
}

export function useLazyRender(options: UseLazyRenderOptions = {}): {
  ref: React.RefObject<HTMLDivElement | null>;
  shouldRender: boolean;
} {
  const { rootMargin = "100px" } = options;
  const [ref, isVisible] = useIntersectionObserver({
    rootMargin,
    freezeOnceVisible: true,
  });

  return {
    ref,
    shouldRender: isVisible,
  };
}

// ============================================================================
// PREVIOUS VALUE HOOK
// ============================================================================

export function usePrevious<T>(value: T): T | undefined {
  const [prev, setPrev] = useState<T | undefined>(undefined);
  const [current, setCurrent] = useState<T>(value);

  if (value !== current) {
    setPrev(current);
    setCurrent(value);
  }

  return prev;
}

// ============================================================================
// ASYNC MEMOIZATION
// ============================================================================

export function useAsyncMemo<T>(
  factory: () => Promise<T>,
  deps: DependencyList,
  initialValue: T,
): T {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    let cancelled = false;

    factory().then((result) => {
      if (!cancelled) {
        setValue(result);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}

// ============================================================================
// REQUEST IDLE CALLBACK HOOK
// ============================================================================

export function useIdleCallback(
  callback: () => void,
  options?: IdleRequestOptions,
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (typeof requestIdleCallback === "undefined") {
      // Fallback for Safari
      const timeoutId = setTimeout(() => callbackRef.current(), 1);
      return () => clearTimeout(timeoutId);
    }

    const idleId = requestIdleCallback(() => callbackRef.current(), options);
    return () => cancelIdleCallback(idleId);
  }, [options]);
}

// ============================================================================
// PERFORMANCE MARK HOOK (for debugging)
// ============================================================================

export function usePerformanceMark(name: string): void {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      performance.mark(`${name}-start`);

      return () => {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      };
    }
  }, [name]);
}

// ============================================================================
// VIRTUAL LIST HELPERS
// ============================================================================

interface VirtualListConfig {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualListResult {
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  offsetY: number;
}

export function calculateVirtualList(
  scrollTop: number,
  config: VirtualListConfig,
): VirtualListResult {
  const { itemCount, itemHeight, containerHeight, overscan = 3 } = config;

  const totalHeight = itemCount * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(
    itemCount - 1,
    startIndex + visibleCount + overscan * 2,
  );
  const offsetY = startIndex * itemHeight;

  return {
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
  };
}

// ============================================================================
// RAF LOOP HOOK (for smooth animations)
// ============================================================================

export function useRafLoop(callback: (time: number) => void): {
  start: () => void;
  stop: () => void;
  isRunning: boolean;
} {
  const rafRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);
  const loopRef = useRef<((time: number) => void) | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    loopRef.current = (time: number) => {
      callbackRef.current(time);
      if (loopRef.current) {
        rafRef.current = requestAnimationFrame(loopRef.current);
      }
    };
  }, []);

  const start = useCallback(() => {
    setIsRunning((running) => {
      if (!running && loopRef.current) {
        rafRef.current = requestAnimationFrame(loopRef.current);
        return true;
      }
      return running;
    });
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { start, stop, isRunning };
}

// ============================================================================
// IMAGE PRELOAD
// ============================================================================

export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function preloadImages(sources: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(sources.map(preloadImage));
}

// ============================================================================
// LOCAL STORAGE WITH EXPIRY
// ============================================================================

interface CachedValue<T> {
  value: T;
  expiry: number;
}

export function setWithExpiry<T>(key: string, value: T, ttlMs: number): void {
  const item: CachedValue<T> = {
    value,
    expiry: Date.now() + ttlMs,
  };
  localStorage.setItem(key, JSON.stringify(item));
}

export function getWithExpiry<T>(key: string): T | null {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;

  try {
    const item: CachedValue<T> = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch {
    return null;
  }
}
