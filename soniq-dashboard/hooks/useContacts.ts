"use client";

import * as React from "react";
import { searchContacts } from "@/lib/api";
import type { Contact, ContactFilters, PaginationParams } from "@/types/crm";

// ============================================================================
// TYPES
// ============================================================================

interface UseContactsReturn {
  contacts: Contact[];
  total: number;
  isLoading: boolean;
  error: string | null;
  filters: ContactFilters;
  pagination: PaginationParams;
  setFilters: (filters: ContactFilters) => void;
  setPagination: (pagination: PaginationParams) => void;
  refresh: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useContacts(): UseContactsReturn {
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ContactFilters>({});
  const [pagination, setPagination] = React.useState<PaginationParams>({
    limit: 20,
    offset: 0,
    sort_by: "created_at",
    sort_order: "desc",
  });

  const loadContacts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await searchContacts(filters, pagination);
      setContacts(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
      setContacts([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  // Load contacts on mount and when filters/pagination change
  React.useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const refresh = React.useCallback(() => {
    loadContacts();
  }, [loadContacts]);

  return {
    contacts,
    total,
    isLoading,
    error,
    filters,
    pagination,
    setFilters,
    setPagination,
    refresh,
  };
}
