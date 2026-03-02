"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { get } from "@/lib/api/client";
import {
  computeEscalationStats,
  mapApiEscalation,
  type EscalationItem,
  type EscalationStatus,
  type EscalationPriority,
  type EscalationQueueResponse,
} from "@/types/escalation";

interface UseEscalationsOptions {
  status?: EscalationStatus;
  priority?: EscalationPriority;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseEscalationsReturn {
  // Data
  escalations: EscalationItem[];
  waitingCount: number;
  stats: {
    totalWaiting: number;
    urgent: number;
    high: number;
    avgWaitTime: number;
    longestWait: number;
  };

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  refresh: () => void;
  getEscalationById: (id: string) => EscalationItem | undefined;
}

export function useEscalations(
  options: UseEscalationsOptions = {},
): UseEscalationsReturn {
  const {
    status,
    priority,
    limit,
    autoRefresh = false,
    refreshInterval = 5000,
  } = options;

  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [allEscalations, setAllEscalations] = useState<EscalationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEscalations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await get<EscalationQueueResponse>("/api/escalation/queue");
      const queue = (data.queue || []).map(mapApiEscalation);
      setAllEscalations(queue);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load escalations",
      );
      setAllEscalations([]);
      setEscalations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void loadEscalations();
  }, [loadEscalations]);

  // Apply client-side filters from source queue
  useEffect(() => {
    let filtered = [...allEscalations];

    if (status) {
      filtered = filtered.filter((item) => item.status === status);
    }

    if (priority) {
      filtered = filtered.filter((item) => item.priority === priority);
    }

    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    setEscalations(filtered);
  }, [allEscalations, status, priority, limit]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      void loadEscalations();
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadEscalations]);

  // Get stats
  const stats = useMemo(
    () => computeEscalationStats(allEscalations),
    [allEscalations],
  );
  const waitingCount = stats.totalWaiting;

  // Get by ID
  const getEscalationById = useCallback(
    (id: string) => escalations.find((e) => e.id === id),
    [escalations],
  );

  return {
    escalations,
    waitingCount,
    stats,
    isLoading,
    error,
    refresh: loadEscalations,
    getEscalationById,
  };
}

// Hook for just the queue stats (lightweight)
export function useEscalationQueueStats() {
  const [stats, setStats] = useState(() => computeEscalationStats([]));
  const [waitingCount, setWaitingCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const data = await get<EscalationQueueResponse>(
          "/api/escalation/queue",
        );
        const queue = (data.queue || []).map(mapApiEscalation);
        const nextStats = computeEscalationStats(queue);

        if (!isMounted) return;
        setStats(nextStats);
        setWaitingCount(nextStats.totalWaiting);
      } catch {
        if (!isMounted) return;
        setStats(computeEscalationStats([]));
        setWaitingCount(0);
      }
    };

    void loadStats();

    const interval = setInterval(() => {
      void loadStats();
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { ...stats, waitingCount };
}
