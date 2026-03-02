"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { get, setTenantId, clearTenantId } from "@/lib/api/client";

/** Minimal tenant info returned by GET /api/tenants (list endpoint) */
interface TenantListItem {
  id: string;
  business_name: string;
  industry: string;
  phone_number: string;
  is_active: boolean;
  created_at: string;
  role: string;
}

/** Full tenant details returned by GET /api/tenants/:id */
export interface TenantDetails extends TenantListItem {
  updated_at?: string;
  agent_name?: string;
  agent_personality?: {
    tone: "professional" | "friendly" | "casual" | "formal";
    verbosity: "concise" | "balanced" | "detailed";
    empathy: "low" | "medium" | "high";
    humor: boolean;
  };
  voice_config?: {
    provider: "openai" | "elevenlabs" | "cartesia";
    voice_id: string;
    voice_name: string;
    speaking_rate: number;
    pitch: number;
  };
  greeting_standard?: string;
  greeting_after_hours?: string;
  greeting_returning?: string;
  timezone?: string;
  operating_hours?: {
    schedule: Array<{
      day: number;
      enabled: boolean;
      open_time: string;
      close_time: string;
    }>;
    holidays: Array<{ date: string; name: string }>;
  };
  escalation_enabled?: boolean;
  escalation_phone?: string;
  escalation_triggers?: string[];
  features?: {
    sms_confirmations: boolean;
    email_notifications: boolean;
    live_transfer: boolean;
    voicemail_fallback: boolean;
    sentiment_analysis: boolean;
    recording_enabled: boolean;
    transcription_enabled: boolean;
  };
  subscription_tier?: string;
  custom_instructions?: string;
  questionnaire_answers?: Record<string, unknown>;
  responses?: Record<string, string>;
  // Setup wizard fields
  setup_step?: string;
  setup_completed_at?: string;
  status?: string;
  location_city?: string;
  location_address?: string;
  assisted_mode?: boolean;
  after_hours_behavior?: string;
  transfer_behavior?: { type: string; no_answer: string };
  userRole?: string;
}

interface TenantContextType {
  tenants: TenantListItem[];
  currentTenant: TenantDetails | null;
  isLoading: boolean;
  error: string | null;
  selectTenant: (tenantId: string) => void;
  refreshTenants: () => Promise<void>;
  refreshCurrentTenant: () => Promise<void>;
  /** Optimistically update currentTenant in memory (for immediate UI feedback) */
  updateTenantLocally: (updates: Partial<TenantDetails>) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const TENANT_STORAGE_KEY = "soniq_current_tenant_id";

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [currentTenant, setCurrentTenant] = useState<TenantDetails | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Fetch full tenant details by ID */
  const fetchTenantDetails = useCallback(
    async (tenantId: string): Promise<TenantDetails | null> => {
      try {
        const data = await get<TenantDetails & { userRole?: string }>(
          `/api/tenants/${tenantId}`,
        );
        return data;
      } catch (err) {
        console.error("[TenantContext] Failed to fetch tenant details:", err);
        return null;
      }
    },
    [],
  );

  const loadTenants = useCallback(async () => {
    if (!user) {
      setTenants([]);
      setCurrentTenant(null);
      clearTenantId();
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const storedTenantId = localStorage.getItem(TENANT_STORAGE_KEY);
      if (storedTenantId) {
        setTenantId(storedTenantId);
      }

      const response = await get<{ tenants: TenantListItem[] }>("/api/tenants");
      const userTenants = response.tenants || [];
      setTenants(userTenants);

      if (userTenants.length > 0) {
        let selectedItem: TenantListItem | null = null;

        if (storedTenantId) {
          selectedItem =
            userTenants.find((t) => t.id === storedTenantId) || null;
        }

        if (!selectedItem) {
          selectedItem = userTenants[0];
        }

        setTenantId(selectedItem.id);
        localStorage.setItem(TENANT_STORAGE_KEY, selectedItem.id);

        // Fetch full details for the selected tenant
        const details = await fetchTenantDetails(selectedItem.id);
        if (details) {
          setCurrentTenant(details);
        } else {
          // Fallback: use list data if detail fetch fails
          setCurrentTenant(selectedItem as TenantDetails);
        }
      } else {
        setCurrentTenant(null);
        clearTenantId();
        localStorage.removeItem(TENANT_STORAGE_KEY);
      }
    } catch (err) {
      console.error("[TenantContext] Failed to load tenants:", err);
      setError(err instanceof Error ? err.message : "Failed to load tenants");
      setTenants([]);
      setCurrentTenant(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchTenantDetails]);

  useEffect(() => {
    if (!authLoading) {
      loadTenants();
    }
  }, [user, authLoading, loadTenants]);

  const selectTenant = useCallback(
    async (tenantId: string) => {
      const item = tenants.find((t) => t.id === tenantId);
      if (item) {
        setTenantId(item.id);
        localStorage.setItem(TENANT_STORAGE_KEY, item.id);

        // Fetch full details
        const details = await fetchTenantDetails(item.id);
        if (details) {
          setCurrentTenant(details);
        } else {
          setCurrentTenant(item as TenantDetails);
        }
      }
    },
    [tenants, fetchTenantDetails],
  );

  /** Refresh only the current tenant's full details (used after saves) */
  const refreshCurrentTenant = useCallback(async () => {
    if (!currentTenant?.id) return;

    const details = await fetchTenantDetails(currentTenant.id);
    if (details) {
      setCurrentTenant(details);
    }
  }, [currentTenant?.id, fetchTenantDetails]);

  /** Refresh the tenant list and current tenant details */
  const refreshTenants = useCallback(async () => {
    await loadTenants();
  }, [loadTenants]);

  /** Optimistically update currentTenant in memory for instant UI feedback */
  const updateTenantLocally = useCallback((updates: Partial<TenantDetails>) => {
    setCurrentTenant((prev) => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  return (
    <TenantContext.Provider
      value={{
        tenants,
        currentTenant,
        isLoading,
        error,
        selectTenant,
        refreshTenants,
        refreshCurrentTenant,
        updateTenantLocally,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
