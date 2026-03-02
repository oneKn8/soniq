/**
 * Resources API client
 * Staff, rooms, equipment management
 */

import { get, post, put, patch, del } from "./client";
import type {
  Resource,
  ResourceType,
  ResourceFilters,
  AvailabilitySlot,
  PaginationParams,
  PaginatedResult,
  CreateResourceInput,
  UpdateResourceInput,
} from "@/types/crm";

// ============================================================================
// API Types
// ============================================================================

interface ResourcesListResponse {
  resources: Resource[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

interface ResourcesSimpleResponse {
  resources: Resource[];
}

interface AvailabilityResponse {
  availability: AvailabilitySlot[];
}

interface ReorderRequest {
  resource_ids: string[];
}

// ============================================================================
// LIST & SEARCH
// ============================================================================

/**
 * List resources with filters and pagination
 */
export async function listResources(
  filters?: ResourceFilters,
  pagination?: PaginationParams,
): Promise<ResourcesListResponse> {
  const params: Record<string, string> = {};

  // Add filters
  if (filters?.type) {
    params.type = Array.isArray(filters.type)
      ? filters.type.join(",")
      : filters.type;
  }
  if (filters?.is_active !== undefined) {
    params.is_active = String(filters.is_active);
  }
  if (filters?.accepts_bookings !== undefined) {
    params.accepts_bookings = String(filters.accepts_bookings);
  }

  // Add pagination
  if (pagination?.limit) params.limit = String(pagination.limit);
  if (pagination?.offset) params.offset = String(pagination.offset);
  if (pagination?.sort_by) params.sort_by = pagination.sort_by;
  if (pagination?.sort_order) params.sort_order = pagination.sort_order;

  return get<ResourcesListResponse>("/api/resources", params);
}

/**
 * Get all active resources
 */
export async function getActiveResources(): Promise<ResourcesSimpleResponse> {
  return get<ResourcesSimpleResponse>("/api/resources/active");
}

/**
 * Get all bookable resources
 */
export async function getBookableResources(): Promise<ResourcesSimpleResponse> {
  return get<ResourcesSimpleResponse>("/api/resources/bookable");
}

/**
 * Get resources by type
 */
export async function getResourcesByType(
  type: ResourceType,
): Promise<ResourcesSimpleResponse> {
  return get<ResourcesSimpleResponse>(`/api/resources/type/${type}`);
}

// ============================================================================
// CRUD
// ============================================================================

/**
 * Get a single resource by ID
 */
export async function getResource(id: string): Promise<Resource> {
  return get<Resource>(`/api/resources/${id}`);
}

/**
 * Create a new resource
 */
export async function createResource(
  input: CreateResourceInput,
): Promise<Resource> {
  return post<Resource>("/api/resources", input);
}

/**
 * Update a resource
 */
export async function updateResource(
  id: string,
  input: UpdateResourceInput,
): Promise<Resource> {
  return put<Resource>(`/api/resources/${id}`, input);
}

/**
 * Partial update a resource
 */
export async function patchResource(
  id: string,
  input: Partial<UpdateResourceInput>,
): Promise<Resource> {
  return patch<Resource>(`/api/resources/${id}`, input);
}

/**
 * Delete (deactivate) a resource
 */
export async function deleteResource(
  id: string,
): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(`/api/resources/${id}`);
}

// ============================================================================
// AVAILABILITY
// ============================================================================

/**
 * Get availability for a specific resource
 */
export async function getResourceAvailability(
  resourceId: string,
  startDate: string,
  endDate: string,
): Promise<AvailabilityResponse> {
  return get<AvailabilityResponse>(
    `/api/resources/${resourceId}/availability`,
    {
      start_date: startDate,
      end_date: endDate,
    },
  );
}

// ============================================================================
// REORDERING
// ============================================================================

/**
 * Reorder resources (for drag-and-drop UI)
 */
export async function reorderResources(
  resourceIds: string[],
): Promise<{ success: boolean }> {
  return post<{ success: boolean }>("/api/resources/reorder", {
    resource_ids: resourceIds,
  } as ReorderRequest);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get resource type display label
 */
export function getResourceTypeLabel(type: ResourceType): string {
  const labels: Record<ResourceType, string> = {
    staff: "Staff Member",
    room: "Room",
    equipment: "Equipment",
    service: "Service",
    other: "Other",
  };
  return labels[type] || type;
}

/**
 * Get resource type icon name
 */
export function getResourceTypeIcon(type: ResourceType): string {
  const icons: Record<ResourceType, string> = {
    staff: "User",
    room: "DoorOpen",
    equipment: "Wrench",
    service: "Briefcase",
    other: "Box",
  };
  return icons[type] || "Box";
}

/**
 * Get resource type color
 */
export function getResourceTypeColor(type: ResourceType): string {
  const colors: Record<ResourceType, string> = {
    staff: "#6366f1", // indigo
    room: "#10b981", // emerald
    equipment: "#f59e0b", // amber
    service: "#8b5cf6", // violet
    other: "#6b7280", // gray
  };
  return colors[type] || "#6b7280";
}

/**
 * Format duration in minutes to human readable
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${mins} min`;
}
