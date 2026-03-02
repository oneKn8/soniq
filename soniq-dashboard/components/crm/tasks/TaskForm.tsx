"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal";
import { createTask, updateTask } from "@/lib/api/tasks";
import type {
  Task,
  TaskType,
  TaskPriority,
  CreateTaskInput,
} from "@/lib/api/tasks";
import { useIndustry } from "@/context/IndustryContext";

// ============================================================================
// TYPES
// ============================================================================

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  onSuccess?: (task: Task) => void;
}

// TYPE_OPTIONS derived dynamically from industry context (see component)

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function TaskForm({
  open,
  onOpenChange,
  task,
  onSuccess,
}: TaskFormProps) {
  const { customerLabel, dealLabel, taskTypes } = useIndustry();
  const typeOptions = taskTypes.map((t) => ({
    value: t.value as TaskType,
    label: t.label,
  }));
  const isEditing = !!task;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    title: "",
    type: "follow_up" as TaskType,
    priority: "medium" as TaskPriority,
    due_date: "",
    due_time: "",
    description: "",
    contact_id: "",
    deal_id: "",
    assigned_to: "",
  });

  // Reset form when opening/closing or when task changes
  React.useEffect(() => {
    if (open) {
      if (task) {
        setFormData({
          title: task.title || "",
          type: task.type || "follow_up",
          priority: task.priority || "medium",
          due_date: task.due_date ? task.due_date.split("T")[0] : "",
          due_time: task.due_time || "",
          description: task.description || "",
          contact_id: task.contact_id || "",
          deal_id: task.deal_id || "",
          assigned_to: task.assigned_to || "",
        });
      } else {
        // Default to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const defaultDate = tomorrow.toISOString().split("T")[0];

        setFormData({
          title: "",
          type: "follow_up",
          priority: "medium",
          due_date: defaultDate,
          due_time: "",
          description: "",
          contact_id: "",
          deal_id: "",
          assigned_to: "",
        });
      }
      setError(null);
    }
  }, [open, task]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!formData.title.trim()) {
        throw new Error("Task title is required");
      }
      if (!formData.due_date) {
        throw new Error("Due date is required");
      }

      let result: Task;

      if (isEditing && task) {
        result = await updateTask(task.id, {
          title: formData.title,
          type: formData.type,
          priority: formData.priority,
          due_date: formData.due_date,
          due_time: formData.due_time || undefined,
          description: formData.description || undefined,
          contact_id: formData.contact_id || undefined,
          deal_id: formData.deal_id || undefined,
          assigned_to: formData.assigned_to || undefined,
        });
      } else {
        const input: CreateTaskInput = {
          title: formData.title,
          type: formData.type,
          priority: formData.priority,
          due_date: formData.due_date,
          due_time: formData.due_time || undefined,
          description: formData.description || undefined,
          contact_id: formData.contact_id || undefined,
          deal_id: formData.deal_id || undefined,
          assigned_to: formData.assigned_to || undefined,
          source: "manual",
        };
        result = await createTask(input);
      }

      onSuccess?.(result);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>{isEditing ? "Edit Task" : "Add New Task"}</ModalTitle>
            <ModalDescription>
              {isEditing
                ? "Update task details"
                : "Create a new task to track follow-ups and actions"}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Title (required) */}
            <div className="space-y-2">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                name="title"
                placeholder={`Follow up with ${customerLabel.toLowerCase()}`}
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            {/* Type + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: TaskType) =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: TaskPriority) =>
                    setFormData((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date + Due Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-due-date">Due Date *</Label>
                <Input
                  id="task-due-date"
                  name="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due-time">Due Time</Label>
                <Input
                  id="task-due-time"
                  name="due_time"
                  type="time"
                  value={formData.due_time}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                name="description"
                placeholder="Add any details about this task..."
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>

            {/* Contact ID + Deal ID */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-contact">{customerLabel}</Label>
                <Input
                  id="task-contact"
                  name="contact_id"
                  placeholder={`${customerLabel} ID`}
                  value={formData.contact_id}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-deal">{dealLabel} ID</Label>
                <Input
                  id="task-deal"
                  name="deal_id"
                  placeholder={`${dealLabel} UUID`}
                  value={formData.deal_id}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label htmlFor="task-assigned">Assigned To</Label>
              <Input
                id="task-assigned"
                name="assigned_to"
                placeholder="User ID or name"
                value={formData.assigned_to}
                onChange={handleChange}
              />
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Save Changes" : "Add Task"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
