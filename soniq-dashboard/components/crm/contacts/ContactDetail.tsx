"use client";

import * as React from "react";
import {
  X,
  Phone,
  Mail,
  Building,
  Calendar,
  MessageSquare,
  Edit,
  Trash2,
  MoreHorizontal,
  Tag,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ContactForm } from "./ContactForm";
import { getContactHistory, getContactNotes, deleteContact } from "@/lib/api";
import type { Contact, ContactActivity, ContactNote } from "@/types/crm";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface ContactDetailProps {
  contact: Contact;
  onClose: () => void;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-1 text-lg font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call_received: Phone,
  call_made: Phone,
  sms_sent: MessageSquare,
  sms_received: MessageSquare,
  booking_created: Calendar,
  booking_completed: Calendar,
};

function ActivityItem({ activity }: { activity: ContactActivity }) {
  const Icon = ACTIVITY_ICONS[activity.activity_type] || Clock;
  const date = new Date(activity.created_at);

  return (
    <div className="flex gap-3 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800">
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-zinc-300">
          {activity.description || activity.activity_type.replace(/_/g, " ")}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {date.toLocaleDateString()} at {date.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

function NoteItem({ note }: { note: ContactNote }) {
  const date = new Date(note.created_at);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          {note.note_type}
        </Badge>
        {note.is_pinned && (
          <span className="text-xs text-amber-400">Pinned</span>
        )}
      </div>
      <p className="text-sm text-zinc-300">{note.content}</p>
      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
        <span>{note.created_by_name || "System"}</span>
        <span>-</span>
        <span>{date.toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ContactDetail({ contact, onClose }: ContactDetailProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [activities, setActivities] = React.useState<ContactActivity[]>([]);
  const [notes, setNotes] = React.useState<ContactNote[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = React.useState(true);
  const [isLoadingNotes, setIsLoadingNotes] = React.useState(true);

  // Load activities and notes
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingActivities(true);
        const historyResult = await getContactHistory(contact.id, {
          limit: 20,
        });
        setActivities(historyResult.data);
      } catch (err) {
        console.error("Failed to load activities:", err);
      } finally {
        setIsLoadingActivities(false);
      }

      try {
        setIsLoadingNotes(true);
        const notesResult = await getContactNotes(contact.id, { limit: 20 });
        setNotes(notesResult.data);
      } catch (err) {
        console.error("Failed to load notes:", err);
      } finally {
        setIsLoadingNotes(false);
      }
    };

    loadData();
  }, [contact.id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      await deleteContact(contact.id);
      onClose();
    } catch (err) {
      alert("Failed to delete contact");
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h2 className="text-lg font-semibold text-white">Contact Details</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Profile Section */}
          <div className="border-b border-zinc-800 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10 text-xl font-semibold text-indigo-400">
                {contact.name?.charAt(0) || contact.phone.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">
                  {contact.name || contact.first_name || "Unknown"}
                </h3>
                {contact.company && (
                  <p className="text-sm text-zinc-400">{contact.company}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {contact.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-300">{contact.phone}</span>
              </div>
              {contact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-zinc-500" />
                  <span className="text-zinc-300">{contact.email}</span>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-zinc-500" />
                  <span className="text-zinc-300">{contact.company}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <StatCard
                label="Bookings"
                value={contact.total_bookings}
                icon={Calendar}
              />
              <StatCard
                label="Calls"
                value={contact.total_calls}
                icon={Phone}
              />
              <StatCard
                label="Score"
                value={contact.engagement_score}
                icon={TrendingUp}
              />
            </div>

            {/* Lifetime Value */}
            {contact.lifetime_value_cents > 0 && (
              <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="text-xs text-emerald-400">Lifetime Value</div>
                <div className="text-xl font-semibold text-emerald-400">
                  {formatCurrency(contact.lifetime_value_cents)}
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="activity" className="flex-1">
            <TabsList className="w-full justify-start rounded-none border-b border-zinc-800 bg-transparent px-4">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="p-4">
              {isLoadingActivities ? (
                <div className="py-8 text-center text-zinc-500">Loading...</div>
              ) : activities.length === 0 ? (
                <div className="py-8 text-center text-zinc-500">
                  No activity yet
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {activities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="p-4">
              {isLoadingNotes ? (
                <div className="py-8 text-center text-zinc-500">Loading...</div>
              ) : notes.length === 0 ? (
                <div className="py-8 text-center text-zinc-500">
                  No notes yet
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <NoteItem key={note.id} note={note} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="details" className="p-4">
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-zinc-500">Status:</span>
                  <span className="ml-2 capitalize text-zinc-300">
                    {contact.status}
                  </span>
                </div>
                {contact.lead_status && (
                  <div>
                    <span className="text-zinc-500">Lead Status:</span>
                    <span className="ml-2 capitalize text-zinc-300">
                      {contact.lead_status}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-zinc-500">Source:</span>
                  <span className="ml-2 capitalize text-zinc-300">
                    {contact.source}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">First Contact:</span>
                  <span className="ml-2 text-zinc-300">
                    {new Date(contact.first_contact_at).toLocaleDateString()}
                  </span>
                </div>
                {contact.last_contact_at && (
                  <div>
                    <span className="text-zinc-500">Last Contact:</span>
                    <span className="ml-2 text-zinc-300">
                      {new Date(contact.last_contact_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-zinc-500">Preferred Language:</span>
                  <span className="ml-2 uppercase text-zinc-300">
                    {contact.preferred_language}
                  </span>
                </div>
                {contact.preferred_contact_method && (
                  <div>
                    <span className="text-zinc-500">Preferred Contact:</span>
                    <span className="ml-2 capitalize text-zinc-300">
                      {contact.preferred_contact_method}
                    </span>
                  </div>
                )}
                <div className="pt-4 border-t border-zinc-800">
                  <span className="text-zinc-500">
                    Communication Preferences:
                  </span>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          contact.do_not_call
                            ? "text-red-400"
                            : "text-emerald-400"
                        }
                      >
                        {contact.do_not_call ? "No calls" : "Calls OK"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          contact.do_not_sms
                            ? "text-red-400"
                            : "text-emerald-400"
                        }
                      >
                        {contact.do_not_sms ? "No SMS" : "SMS OK"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          contact.do_not_email
                            ? "text-red-400"
                            : "text-emerald-400"
                        }
                      >
                        {contact.do_not_email ? "No email" : "Email OK"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          contact.marketing_opt_in
                            ? "text-emerald-400"
                            : "text-zinc-400"
                        }
                      >
                        {contact.marketing_opt_in
                          ? "Marketing opt-in"
                          : "No marketing"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Form */}
      <ContactForm
        open={isEditing}
        onOpenChange={setIsEditing}
        contact={contact}
        onSuccess={() => {
          setIsEditing(false);
          onClose();
        }}
      />
    </>
  );
}
