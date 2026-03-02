"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTenant, type TenantDetails } from "@/context/TenantContext";
import { put } from "@/lib/api/client";

type SaveStatus = "idle" | "saving" | "saved";

interface UseTenantConfigReturn {
  /** The current tenant with all settings */
  tenant: TenantDetails | null;
  /** Whether tenant data is loading */
  isLoading: boolean;
  /** Save status for the current save operation */
  saveStatus: SaveStatus;
  /** Error message from the last save attempt */
  error: string | null;
  /** Clear the current error */
  clearError: () => void;
  /**
   * Update tenant settings with optimistic UI update.
   * Immediately updates the local tenant state, then persists to DB.
   * Uses a 500ms debounce to batch rapid changes.
   */
  updateSettings: (updates: Partial<TenantDetails>) => void;
}

/**
 * Unified hook for reading and writing tenant settings.
 * Replaces the old pattern of useConfig() + useTenantSettings().
 *
 * - Reads from TenantContext (database is source of truth)
 * - Writes with optimistic updates + debounced API persistence
 * - Handles save status indicators and error states
 */
export function useTenantConfig(): UseTenantConfigReturn {
  const {
    currentTenant,
    isLoading,
    refreshCurrentTenant,
    updateTenantLocally,
  } = useTenant();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Accumulate updates during the debounce window
  const pendingUpdatesRef = useRef<Partial<TenantDetails>>({});

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  const clearError = useCallback(() => setError(null), []);

  const updateSettings = useCallback(
    (updates: Partial<TenantDetails>) => {
      if (!currentTenant?.id) {
        setError("No tenant selected");
        return;
      }

      // 1. Optimistic update - immediately update TenantContext in memory
      updateTenantLocally(updates);

      // 2. Accumulate updates for the debounced save
      pendingUpdatesRef.current = {
        ...pendingUpdatesRef.current,
        ...updates,
      };

      // 3. Debounced save to database
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        const toSave = { ...pendingUpdatesRef.current };
        pendingUpdatesRef.current = {};

        // Remove fields that shouldn't be sent in PUT
        delete toSave.id;
        delete toSave.created_at;
        delete toSave.is_active;
        delete toSave.role;
        delete toSave.phone_number;

        setSaveStatus("saving");

        try {
          await put(`/api/tenants/${currentTenant.id}`, toSave);

          // Refresh from server to get canonical state
          await refreshCurrentTenant();

          setSaveStatus("saved");
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(
            () => setSaveStatus("idle"),
            2000,
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to save settings";
          setError(message);
          setSaveStatus("idle");

          // Revert optimistic update by refreshing from server
          await refreshCurrentTenant();
        }
      }, 500);
    },
    [currentTenant, updateTenantLocally, refreshCurrentTenant],
  );

  return {
    tenant: currentTenant,
    isLoading,
    saveStatus,
    error,
    clearError,
    updateSettings,
  };
}
