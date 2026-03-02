"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import type {
  AppConfig,
  IndustryType,
  ViewType,
  SettingsTab,
  UIState,
  DashboardMetrics,
  LogEntry,
  CallSession,
  SpeakerState,
  MetricValue,
  Permission,
  UserRole,
} from "@/types";
import {
  STAFF_PERMISSIONS,
  ADMIN_PERMISSIONS,
  DEVELOPER_PERMISSIONS,
} from "@/types";
import {
  createDefaultConfig,
  getPreset,
  getTerminology,
  INDUSTRY_PRESETS,
} from "@/lib/industryPresets";
import {
  generateDashboardMetrics,
  generateInitialLogs,
  generateLogEntry,
  generateIndustryMetrics,
  generateCallSession,
} from "@/lib/mockData";
import {
  fetchDashboardMetrics,
  fetchActivityLog,
  checkApiHealth,
  getTenantId,
} from "@/lib/api";

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  config: "soniq_config_v2",
  ui: "soniq_ui_state",
} as const;

// ============================================================================
// CONTEXT TYPES
// ============================================================================

interface ConfigContextType {
  // Configuration
  config: AppConfig | null;
  isLoading: boolean;
  isConfigured: boolean;

  // Config Actions
  saveConfig: (config: Partial<AppConfig>) => void;
  updateConfig: <K extends keyof AppConfig>(
    key: K,
    value: AppConfig[K],
  ) => void;
  resetConfig: () => void;
  switchIndustry: (industry: IndustryType) => void;

  // Industry Helpers
  getPreset: typeof getPreset;
  getTerminology: typeof getTerminology;
  industryPresets: typeof INDUSTRY_PRESETS;

  // UI State
  uiState: UIState;
  setView: (view: ViewType) => void;
  setSettingsTab: (tab: SettingsTab) => void;
  toggleSidebar: () => void;
  toggleCommandPalette: () => void;

  // Real-time Data
  metrics: DashboardMetrics | null;
  industryMetrics: MetricValue[];
  logs: LogEntry[];
  activeCalls: CallSession[];
  speakerState: SpeakerState;

  // Real-time Actions
  addLog: (entry: Omit<LogEntry, "id" | "timestamp">) => void;
  setSpeakerState: (state: SpeakerState) => void;
  refreshMetrics: () => void;

  // Simulation (for demo)
  simulateCall: () => void;
  simulateRevenue: (amount: number) => void;

  // Permissions
  hasPermission: (permission: Permission) => boolean;
  getUserPermissions: () => Permission[];
  setUserRole: (role: UserRole) => void;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

// ============================================================================
// DEFAULT UI STATE
// ============================================================================

const DEFAULT_UI_STATE: UIState = {
  currentView: "dashboard",
  settingsTab: "general",
  sidebarCollapsed: false,
  commandPaletteOpen: false,
};

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function ConfigProvider({ children }: { children: ReactNode }) {
  // Core State
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uiState, setUiState] = useState<UIState>(DEFAULT_UI_STATE);

  // Real-time Data State
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [industryMetrics, setIndustryMetrics] = useState<MetricValue[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeCalls, setActiveCalls] = useState<CallSession[]>([]);
  const [speakerState, setSpeakerState] = useState<SpeakerState>("idle");

  // API State - whether to use real API or mock data
  const [apiEnabled, setApiEnabled] = useState(false);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    const loadState = async () => {
      try {
        // Check if API is available AND we have a tenant ID
        const hasTenant = !!getTenantId();
        const isApiAvailable = hasTenant && (await checkApiHealth());
        setApiEnabled(isApiAvailable);

        if (isApiAvailable) {
          console.log("[ConfigContext] API available, using real data");
        } else if (!hasTenant) {
          console.log("[ConfigContext] No tenant, using mock data");
        } else {
          console.log("[ConfigContext] API unavailable, using mock data");
        }

        // Load config
        const savedConfig = localStorage.getItem(STORAGE_KEYS.config);
        let activeConfig: AppConfig;

        if (savedConfig) {
          activeConfig = JSON.parse(savedConfig) as AppConfig;
          console.log("[ConfigContext] Loaded saved config");
        } else {
          // Initialize demo config when none exists
          activeConfig = {
            ...createDefaultConfig("hotel", "developer"),
            isConfigured: true,
            businessName: "Demo Hotel",
            agentName: "Soniq",
            configuredAt: new Date().toISOString(),
          };
          console.log("[ConfigContext] Initialized demo config");
        }

        setConfig(activeConfig);

        // Initialize metrics - try API first, fall back to mock
        // Only call API if we have a tenant
        if (isApiAvailable) {
          try {
            const apiMetrics = await fetchDashboardMetrics();
            setMetrics(apiMetrics);
          } catch (err) {
            console.warn("[ConfigContext] API fetch failed, using mock:", err);
            setMetrics(generateDashboardMetrics(activeConfig.industry));
          }
        } else {
          setMetrics(generateDashboardMetrics(activeConfig.industry));
        }

        setIndustryMetrics(generateIndustryMetrics(activeConfig.industry));

        // Load UI state
        const savedUI = localStorage.getItem(STORAGE_KEYS.ui);
        if (savedUI) {
          setUiState({ ...DEFAULT_UI_STATE, ...JSON.parse(savedUI) });
        }

        // Initialize logs - try API first, fall back to mock
        // Only call API if we have a tenant
        if (isApiAvailable) {
          try {
            const apiLogs = await fetchActivityLog({ limit: 30 });
            setLogs(apiLogs.entries);
          } catch (err) {
            console.warn(
              "[ConfigContext] API logs fetch failed, using mock:",
              err,
            );
            setLogs(generateInitialLogs(30));
          }
        } else {
          setLogs(generateInitialLogs(30));
        }
      } catch (error) {
        console.error("[ConfigContext] Failed to load state:", error);
      } finally {
        // Small delay for smooth transition
        setTimeout(() => setIsLoading(false), 500);
      }
    };

    loadState();
  }, []);

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  useEffect(() => {
    if (config && !isLoading) {
      localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(config));
    }
  }, [config, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEYS.ui, JSON.stringify(uiState));
    }
  }, [uiState, isLoading]);

  // ============================================================================
  // REAL-TIME LOG UPDATES
  // ============================================================================

  useEffect(() => {
    if (!config?.isConfigured) return;

    const interval = setInterval(
      async () => {
        if (apiEnabled) {
          // Fetch new logs from API
          try {
            const apiLogs = await fetchActivityLog({ limit: 30 });
            setLogs(apiLogs.entries);
          } catch (err) {
            console.warn("[ConfigContext] Failed to fetch logs:", err);
            // Fall back to mock on error
            const newLog = generateLogEntry();
            setLogs((prev) => [newLog, ...prev].slice(0, 100));
          }
        } else {
          // Use mock data
          const newLog = generateLogEntry();
          setLogs((prev) => [newLog, ...prev].slice(0, 100));
        }
      },
      apiEnabled ? 5000 : 3000 + Math.random() * 4000,
    ); // Poll every 5s for API, 3-7s for mock

    return () => clearInterval(interval);
  }, [config?.isConfigured, apiEnabled]);

  // ============================================================================
  // METRICS REFRESH
  // ============================================================================

  useEffect(() => {
    if (!config?.isConfigured) return;

    const interval = setInterval(
      async () => {
        if (apiEnabled) {
          // Fetch from API
          try {
            const apiMetrics = await fetchDashboardMetrics();
            setMetrics(apiMetrics);
          } catch (err) {
            console.warn("[ConfigContext] Failed to fetch metrics:", err);
            // Fall back to mock on error
            setMetrics(generateDashboardMetrics(config.industry));
          }
        } else {
          // Use mock data
          setMetrics(generateDashboardMetrics(config.industry));
        }
        // Industry metrics are always mock for now (industry-specific)
        setIndustryMetrics(generateIndustryMetrics(config.industry));
      },
      apiEnabled ? 10000 : 30000,
    ); // Poll every 10s for API, 30s for mock

    return () => clearInterval(interval);
  }, [config?.isConfigured, config?.industry, apiEnabled]);

  // ============================================================================
  // CONFIG ACTIONS
  // ============================================================================

  const saveConfig = useCallback((newConfig: Partial<AppConfig>) => {
    setConfig((prev) => {
      if (!prev) {
        // Creating new config
        const industry = (newConfig.industry || "hotel") as IndustryType;
        const base = createDefaultConfig(industry);
        const merged = {
          ...base,
          ...newConfig,
          isConfigured: true,
          configuredAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        };
        // Initialize metrics
        setMetrics(generateDashboardMetrics(merged.industry));
        setIndustryMetrics(generateIndustryMetrics(merged.industry));
        return merged;
      }
      // Updating existing config
      return {
        ...prev,
        ...newConfig,
        lastModified: new Date().toISOString(),
      };
    });
  }, []);

  const updateConfig = useCallback(
    <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
      setConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [key]: value,
          lastModified: new Date().toISOString(),
        };
      });
    },
    [],
  );

  const resetConfig = useCallback(() => {
    setConfig(null);
    setMetrics(null);
    setIndustryMetrics([]);
    setActiveCalls([]);
    setSpeakerState("idle");
    localStorage.removeItem(STORAGE_KEYS.config);
  }, []);

  const switchIndustry = useCallback((industry: IndustryType) => {
    setConfig((prev) => {
      const base = createDefaultConfig(industry);
      if (!prev) return base;
      return {
        ...prev,
        industry,
        pricing: base.pricing,
        themeColor: base.themeColor,
        lastModified: new Date().toISOString(),
      };
    });
    setMetrics(generateDashboardMetrics(industry));
    setIndustryMetrics(generateIndustryMetrics(industry));
  }, []);

  // ============================================================================
  // UI ACTIONS
  // ============================================================================

  const setView = useCallback((view: ViewType) => {
    setUiState((prev) => ({ ...prev, currentView: view }));
  }, []);

  const setSettingsTab = useCallback((tab: SettingsTab) => {
    setUiState((prev) => ({ ...prev, settingsTab: tab }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setUiState((prev) => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed,
    }));
  }, []);

  const toggleCommandPalette = useCallback(() => {
    setUiState((prev) => ({
      ...prev,
      commandPaletteOpen: !prev.commandPaletteOpen,
    }));
  }, []);

  // ============================================================================
  // REAL-TIME ACTIONS
  // ============================================================================

  const addLog = useCallback((entry: Omit<LogEntry, "id" | "timestamp">) => {
    const newLog: LogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 100));
  }, []);

  const refreshMetrics = useCallback(async () => {
    if (!config) return;

    if (apiEnabled) {
      try {
        const apiMetrics = await fetchDashboardMetrics();
        setMetrics(apiMetrics);
      } catch (err) {
        console.warn("[ConfigContext] Failed to refresh metrics:", err);
        setMetrics(generateDashboardMetrics(config.industry));
      }
    } else {
      setMetrics(generateDashboardMetrics(config.industry));
    }
    setIndustryMetrics(generateIndustryMetrics(config.industry));
  }, [config, apiEnabled]);

  // ============================================================================
  // SIMULATION ACTIONS (for demo purposes)
  // ============================================================================

  const simulateCall = useCallback(() => {
    if (!config) return;

    const call = generateCallSession(config.industry);
    setActiveCalls((prev) => [...prev, call]);

    addLog({
      level: "INFO",
      category: "CALL",
      message: `CALL_INITIATED id=${call.id} from=${call.callerPhone}`,
      callId: call.id,
    });

    // Simulate call flow
    setTimeout(() => {
      setSpeakerState("user");
      addLog({
        level: "INFO",
        category: "CALL",
        message: `VAD_TRIGGER speaker=USER confidence=0.94`,
        callId: call.id,
      });
    }, 2000);

    setTimeout(() => {
      setSpeakerState("processing");
    }, 4000);

    setTimeout(() => {
      setSpeakerState("ai");
      addLog({
        level: "INFO",
        category: "INTENT",
        message: `INTENT_DETECTED type=${call.intentsDetected[0]?.name || "INQUIRY"} confidence=0.92`,
        callId: call.id,
      });
    }, 5000);

    setTimeout(() => {
      setSpeakerState("idle");
      setActiveCalls((prev) => prev.filter((c) => c.id !== call.id));

      if (call.revenue) {
        addLog({
          level: "INFO",
          category: "BOOKING",
          message: `BOOKING_CONFIRMED id=BK-${call.id.slice(-6)} amount=$${call.revenue}`,
          callId: call.id,
        });
      }

      addLog({
        level: "INFO",
        category: "CALL",
        message: `CALL_COMPLETE id=${call.id} duration=${call.duration}s`,
        callId: call.id,
      });
    }, 10000);
  }, [config, addLog]);

  const simulateRevenue = useCallback(
    (amount: number) => {
      addLog({
        level: "INFO",
        category: "BOOKING",
        message: `BOOKING_CONFIRMED revenue=$${amount} source=PHONE`,
      });

      setMetrics((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          business: {
            ...prev.business,
            revenueToday: prev.business.revenueToday + amount,
            transactionsToday: prev.business.transactionsToday + 1,
          },
        };
      });
    },
    [addLog],
  );

  // ============================================================================
  // PERMISSION ACTIONS
  // ============================================================================

  const getUserPermissions = useCallback((): Permission[] => {
    if (!config) return [];
    switch (config.userRole) {
      case "developer":
        return DEVELOPER_PERMISSIONS;
      case "admin":
        return ADMIN_PERMISSIONS;
      case "staff":
        return STAFF_PERMISSIONS;
      default:
        return STAFF_PERMISSIONS;
    }
  }, [config]);

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      const permissions = getUserPermissions();
      return permissions.includes(permission);
    },
    [getUserPermissions],
  );

  const setUserRole = useCallback((role: UserRole) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        userRole: role,
        lastModified: new Date().toISOString(),
      };
    });
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const isConfigured = useMemo(() => {
    return config?.isConfigured ?? false;
  }, [config?.isConfigured]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value = useMemo<ConfigContextType>(
    () => ({
      // Configuration
      config,
      isLoading,
      isConfigured,

      // Config Actions
      saveConfig,
      updateConfig,
      resetConfig,
      switchIndustry,

      // Industry Helpers
      getPreset,
      getTerminology,
      industryPresets: INDUSTRY_PRESETS,

      // UI State
      uiState,
      setView,
      setSettingsTab,
      toggleSidebar,
      toggleCommandPalette,

      // Real-time Data
      metrics,
      industryMetrics,
      logs,
      activeCalls,
      speakerState,

      // Real-time Actions
      addLog,
      setSpeakerState,
      refreshMetrics,

      // Simulation
      simulateCall,
      simulateRevenue,

      // Permissions
      hasPermission,
      getUserPermissions,
      setUserRole,
    }),
    [
      config,
      isLoading,
      isConfigured,
      saveConfig,
      updateConfig,
      resetConfig,
      switchIndustry,
      uiState,
      setView,
      setSettingsTab,
      toggleSidebar,
      toggleCommandPalette,
      metrics,
      industryMetrics,
      logs,
      activeCalls,
      speakerState,
      addLog,
      refreshMetrics,
      simulateCall,
      simulateRevenue,
      hasPermission,
      getUserPermissions,
      setUserRole,
    ],
  );

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
}

// ============================================================================
// SELECTOR HOOKS (for performance)
// ============================================================================

export function useConfigValue() {
  const { config } = useConfig();
  return config;
}

export function useUIState() {
  const {
    uiState,
    setView,
    setSettingsTab,
    toggleSidebar,
    toggleCommandPalette,
  } = useConfig();
  return {
    uiState,
    setView,
    setSettingsTab,
    toggleSidebar,
    toggleCommandPalette,
  };
}

export function useMetrics() {
  const { metrics, industryMetrics, refreshMetrics } = useConfig();
  return { metrics, industryMetrics, refreshMetrics };
}

export function useLogs() {
  const { logs, addLog } = useConfig();
  return { logs, addLog };
}

export function useCallSimulation() {
  const {
    speakerState,
    setSpeakerState,
    simulateCall,
    simulateRevenue,
    activeCalls,
  } = useConfig();
  return {
    speakerState,
    setSpeakerState,
    simulateCall,
    simulateRevenue,
    activeCalls,
  };
}
