"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useSyncExternalStore,
  ReactNode,
} from "react";

// ============================================================================
// TYPES
// ============================================================================

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

// ============================================================================
// STORAGE KEY
// ============================================================================

const THEME_STORAGE_KEY = "soniq_theme";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") return getSystemTheme();
  return mode;
}

function applyTheme(resolvedTheme: ResolvedTheme) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  if (resolvedTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// Hydration-safe mounted detection via useSyncExternalStore
const mountedSubscribe = () => () => {};
const getMountedSnapshot = () => true;
const getMountedServerSnapshot = () => false;

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  return saved && ["light", "dark", "system"].includes(saved)
    ? saved
    : "system";
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(getInitialTheme()),
  );
  const mounted = useSyncExternalStore(
    mountedSubscribe,
    getMountedSnapshot,
    getMountedServerSnapshot,
  );

  // Apply theme to DOM whenever resolved theme changes
  useEffect(() => {
    if (!mounted) return;
    applyTheme(resolvedTheme);
  }, [mounted, resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        const newResolved = getSystemTheme();
        setResolvedTheme(newResolved);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mounted, theme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    const newResolved = resolveTheme(newTheme);
    setResolvedTheme(newResolved);
    applyTheme(newResolved);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      // Simple toggle: dark <-> light (ignoring system for quick toggle)
      const newTheme = prev === "dark" ? "light" : "dark";
      setResolvedTheme(newTheme);
      applyTheme(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      return newTheme;
    });
  }, []);

  const isDark = resolvedTheme === "dark";

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      isDark,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme, isDark],
  );

  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
