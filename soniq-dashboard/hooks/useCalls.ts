"use client";

import { useState, useEffect, useCallback } from "react";
import { get } from "@/lib/api/client";

export interface Call {
  id: string;
  call_sid: string;
  direction: "inbound" | "outbound";
  status: string;
  caller_phone: string;
  caller_name?: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  outcome_type?: string;
  summary?: string;
  sentiment_score?: number;
  intents_detected?: string[];
  recording_url?: string;
  transcript?: string | object;
  created_at: string;
  contact?: {
    id: string;
    first_name?: string;
    last_name?: string;
    phone: string;
    email?: string;
  };
  booking?: {
    id: string;
    booking_date: string;
    booking_time: string;
    booking_type: string;
    status: string;
    confirmation_code: string;
  };
}

export interface CallsResponse {
  calls: Call[];
  total: number;
  limit: number;
  offset: number;
}

export interface CallStats {
  callsToday: number;
  callsWeek: number;
  callsMonth: number;
  avgDurationSeconds: number;
  outcomes: Record<string, number>;
}

interface UseCallsOptions {
  status?: string;
  outcome?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
  pollInterval?: number; // Auto-refresh interval in ms (default: 10000)
}

export function useCalls(options: UseCallsOptions = {}) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {};
      if (options.status) params.status = options.status;
      if (options.outcome) params.outcome = options.outcome;
      if (options.startDate) params.start_date = options.startDate;
      if (options.endDate) params.end_date = options.endDate;
      if (options.search) params.search = options.search;
      if (options.limit) params.limit = options.limit.toString();
      if (options.offset) params.offset = options.offset.toString();

      const response = await get<CallsResponse>("/api/calls", params);
      setCalls(response.calls);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch calls");
    } finally {
      setLoading(false);
    }
  }, [
    options.status,
    options.outcome,
    options.startDate,
    options.endDate,
    options.search,
    options.limit,
    options.offset,
  ]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Auto-polling for real-time updates
  useEffect(() => {
    const interval = options.pollInterval ?? 10000; // Default 10 seconds
    if (interval <= 0) return;

    const timer = setInterval(() => {
      fetchCalls();
    }, interval);

    return () => clearInterval(timer);
  }, [fetchCalls, options.pollInterval]);

  return { calls, total, loading, error, refetch: fetchCalls };
}

export function useCall(id: string | null) {
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setCall(null);
      return;
    }

    const fetchCall = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await get<Call>(`/api/calls/${id}`);
        setCall(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch call");
      } finally {
        setLoading(false);
      }
    };

    fetchCall();
  }, [id]);

  return { call, loading, error };
}

export function useCallStats() {
  const [stats, setStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await get<CallStats>("/api/calls/stats");
        setStats(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}
