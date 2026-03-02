/**
 * Base API client for Soniq Dashboard
 * Handles all HTTP requests to the backend API with auth
 */

import { createClient } from "@/lib/supabase/client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:3001");

// Current tenant ID - can be set dynamically
let currentTenantId: string | null = null;

/**
 * Set the current tenant ID for API requests
 */
export function setTenantId(tenantId: string): void {
  currentTenantId = tenantId;
}

/**
 * Get the current tenant ID
 */
export function getTenantId(): string | null {
  return currentTenantId;
}

/**
 * Clear the current tenant ID
 */
export function clearTenantId(): void {
  currentTenantId = null;
}

export interface ApiError {
  message: string;
  status: number;
}

export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

/**
 * Get the current auth token from Supabase
 */
async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

/**
 * Generic API client function with auth
 */
export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  if (!API_BASE) {
    throw new ApiClientError(
      "NEXT_PUBLIC_API_URL is required in production",
      500,
    );
  }

  const url = `${API_BASE}${endpoint}`;

  // Get auth token
  const token = await getAuthToken();

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  // Add auth token if available
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Add tenant ID if set
  if (currentTenantId) {
    headers["X-Tenant-ID"] = currentTenantId;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle auth errors
  if (response.status === 401) {
    // Try to refresh the session
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.auth.refreshSession();
      if (!error) {
        // Retry the request with new token
        const newToken = await getAuthToken();
        if (newToken) {
          headers["Authorization"] = `Bearer ${newToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });

          if (retryResponse.ok) {
            const text = await retryResponse.text();
            return text ? JSON.parse(text) : ({} as T);
          }
        }
      }
    }

    throw new ApiClientError("Authentication required", 401);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorText;
    } catch {
      errorMessage =
        errorText || `Request failed with status ${response.status}`;
    }

    throw new ApiClientError(errorMessage, response.status);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

/**
 * GET request helper
 */
export function get<T>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = params
    ? `${endpoint}?${new URLSearchParams(params).toString()}`
    : endpoint;

  return apiClient<T>(url, { method: "GET" });
}

/**
 * POST request helper
 */
export function post<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiClient<T>(endpoint, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request helper
 */
export function put<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiClient<T>(endpoint, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PATCH request helper
 */
export function patch<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiClient<T>(endpoint, {
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request helper
 */
export function del<T>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: "DELETE" });
}

export { API_BASE };
