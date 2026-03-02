"use client";

import * as React from "react";
import {
  Plus,
  Search,
  Filter,
  User,
  DoorOpen,
  Wrench,
  Briefcase,
  Box,
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyResources } from "@/components/crm/shared/EmptyState";
import { ResourceForm } from "./ResourceForm";
import {
  listResources,
  deleteResource,
  getResourceTypeLabel,
  getResourceTypeIcon,
  getResourceTypeColor,
  formatDuration,
} from "@/lib/api";
import type { Resource, ResourceType, PaginationParams } from "@/types/crm";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPE ICON
// ============================================================================

function TypeIcon({ type }: { type: ResourceType }) {
  const icons: Record<ResourceType, React.ElementType> = {
    staff: User,
    room: DoorOpen,
    equipment: Wrench,
    service: Briefcase,
    other: Box,
  };

  const Icon = icons[type];
  return <Icon className="h-4 w-4" />;
}

// ============================================================================
// RESOURCE CARD
// ============================================================================

function ResourceCard({
  resource,
  onEdit,
  onDelete,
}: {
  resource: Resource;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = resource.color || getResourceTypeColor(resource.type);

  return (
    <div className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <TypeIcon type={resource.type} />
          </div>
          <div>
            <h3 className="font-medium text-zinc-100">{resource.name}</h3>
            <p className="text-sm text-zinc-500">
              {getResourceTypeLabel(resource.type)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon-sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Description */}
      {resource.description && (
        <p className="mt-3 text-sm text-zinc-400 line-clamp-2">
          {resource.description}
        </p>
      )}

      {/* Stats */}
      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-zinc-500">
          <Clock className="h-3 w-3" />
          <span>{formatDuration(resource.default_duration_minutes)}</span>
        </div>
        {resource.capacity > 1 && (
          <div className="flex items-center gap-1 text-zinc-500">
            <User className="h-3 w-3" />
            <span>Capacity: {resource.capacity}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {resource.is_active ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              Active
            </Badge>
          ) : (
            <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
              Inactive
            </Badge>
          )}
          {resource.accepts_bookings && (
            <Badge variant="outline" className="text-xs">
              <Calendar className="mr-1 h-3 w-3" />
              Bookable
            </Badge>
          )}
        </div>
        {resource.buffer_before_minutes > 0 ||
        resource.buffer_after_minutes > 0 ? (
          <span className="text-xs text-zinc-500">
            Buffer: {resource.buffer_before_minutes}m /{" "}
            {resource.buffer_after_minutes}m
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// RESOURCES PAGE
// ============================================================================

export default function ResourcesPage() {
  const [resources, setResources] = React.useState<Resource[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<ResourceType | "all">(
    "all",
  );
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingResource, setEditingResource] = React.useState<Resource | null>(
    null,
  );

  // Load resources
  React.useEffect(() => {
    const loadResources = async () => {
      setIsLoading(true);
      try {
        const result = await listResources(
          selectedType === "all" ? {} : { type: selectedType },
          { limit: 100 },
        );
        setResources(result.resources);
        setTotal(result.total);
      } catch (err) {
        console.error("Failed to load resources:", err);
        setResources([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadResources();
  }, [selectedType]);

  // Filter by search
  const filteredResources = React.useMemo(() => {
    if (!searchQuery) return resources;
    const query = searchQuery.toLowerCase();
    return resources.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query),
    );
  }, [resources, searchQuery]);

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setIsFormOpen(true);
  };

  const handleDelete = async (resource: Resource) => {
    if (!confirm(`Are you sure you want to delete "${resource.name}"?`)) return;

    try {
      await deleteResource(resource.id);
      setResources(resources.filter((r) => r.id !== resource.id));
    } catch (err) {
      alert("Failed to delete resource");
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingResource(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    // Reload resources
    setSelectedType(selectedType);
  };

  const resourceTypes: (ResourceType | "all")[] = [
    "all",
    "staff",
    "room",
    "equipment",
    "service",
    "other",
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Resources</h1>
          <p className="text-sm text-zinc-500">
            {total} resource{total !== 1 ? "s" : ""} configured
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Resource
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 border-b border-zinc-800 px-6 py-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-md border border-zinc-800 p-1">
          {resourceTypes.map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? "default" : "ghost"}
              size="sm"
              className="capitalize"
              onClick={() => setSelectedType(type)}
            >
              {type === "all" ? "All" : getResourceTypeLabel(type)}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-zinc-500">Loading resources...</div>
          </div>
        ) : filteredResources.length === 0 ? (
          searchQuery ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="text-zinc-500 mb-2">No resources found</div>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </div>
            </div>
          ) : (
            <EmptyResources onAdd={() => setIsFormOpen(true)} />
          )
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onEdit={() => handleEdit(resource)}
                onDelete={() => handleDelete(resource)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Resource Form */}
      <ResourceForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        resource={editingResource || undefined}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
