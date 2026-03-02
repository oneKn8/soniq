"use client";

import * as React from "react";
import { Plus, Search, Filter, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/crm/shared/DataTable";
import { Pagination } from "@/components/crm/shared/Pagination";
import {
  EmptyContacts,
  EmptySearchResults,
} from "@/components/crm/shared/EmptyState";
// Badge unused currently but kept for future filter chips
import { ContactForm } from "./ContactForm";
import { ContactDetail } from "./ContactDetail";
import { useContacts } from "@/hooks/useContacts";
import { useIndustry } from "@/context/IndustryContext";
import type { Contact, ContactStatus } from "@/types/crm";
import { cn } from "@/lib/utils";

// ============================================================================
// STATUS BADGE
// ============================================================================

function StatusBadge({ status }: { status: ContactStatus }) {
  const statusConfig: Record<
    ContactStatus,
    { label: string; className: string }
  > = {
    active: {
      label: "Active",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    inactive: {
      label: "Inactive",
      className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    },
    blocked: {
      label: "Blocked",
      className: "bg-red-500/10 text-red-400 border-red-500/20",
    },
    vip: {
      label: "VIP",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    churned: {
      label: "Churned",
      className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

// ============================================================================
// TABLE COLUMNS - Factory function with terminology
// ============================================================================

function createColumns(transactionPluralLabel: string): Column<Contact>[] {
  return [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (contact) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-300">
            {contact.name?.charAt(0) || contact.phone.charAt(0)}
          </div>
          <div>
            <div className="font-medium text-zinc-100">
              {contact.name || contact.first_name || "Unknown"}
            </div>
            <div className="text-xs text-zinc-500">{contact.phone}</div>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (contact) => (
        <span className="text-zinc-400">{contact.email || "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (contact) => <StatusBadge status={contact.status} />,
    },
    {
      key: "total_bookings",
      header: transactionPluralLabel,
      align: "center",
      sortable: true,
      render: (contact) => (
        <span className="text-zinc-300">{contact.total_bookings}</span>
      ),
    },
    {
      key: "total_calls",
      header: "Calls",
      align: "center",
      sortable: true,
      render: (contact) => (
        <span className="text-zinc-300">{contact.total_calls}</span>
      ),
    },
    {
      key: "engagement_score",
      header: "Score",
      align: "center",
      sortable: true,
      render: (contact) => (
        <div className="flex items-center justify-center">
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
              contact.engagement_score >= 80 &&
                "bg-emerald-500/20 text-emerald-400",
              contact.engagement_score >= 50 &&
                contact.engagement_score < 80 &&
                "bg-amber-500/20 text-amber-400",
              contact.engagement_score < 50 && "bg-zinc-500/20 text-zinc-400",
            )}
          >
            {contact.engagement_score}
          </div>
        </div>
      ),
    },
    {
      key: "last_contact_at",
      header: "Last Contact",
      sortable: true,
      render: (contact) => {
        if (!contact.last_contact_at)
          return <span className="text-zinc-500">Never</span>;
        const date = new Date(contact.last_contact_at);
        return (
          <span className="text-zinc-400">{date.toLocaleDateString()}</span>
        );
      },
    },
  ];
}

// ============================================================================
// CONTACTS PAGE
// ============================================================================

export default function ContactsPage() {
  const {
    contacts,
    total,
    isLoading,
    error,
    filters,
    pagination,
    setFilters,
    setPagination,
    refresh,
  } = useContacts();

  const { customerLabel, customerPluralLabel, transactionPluralLabel } =
    useIndustry();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Create columns with industry terminology
  const columns = React.useMemo(
    () => createColumns(transactionPluralLabel),
    [transactionPluralLabel],
  );

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ ...filters, search: searchQuery || undefined });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSort = (column: string) => {
    const newOrder =
      pagination.sort_by === column && pagination.sort_order === "asc"
        ? "desc"
        : "asc";
    setPagination({ ...pagination, sort_by: column, sort_order: newOrder });
  };

  const handleRowClick = (contact: Contact) => {
    setSelectedContact(contact);
  };

  const handleSelect = (id: string, selected: boolean) => {
    const newSet = new Set(selectedIds);
    if (selected) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    refresh();
  };

  const handleDetailClose = () => {
    setSelectedContact(null);
    refresh();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-white">
            {customerPluralLabel}
          </h1>
          <p className="text-sm text-zinc-500">
            {total}{" "}
            {(total !== 1 ? customerPluralLabel : customerLabel).toLowerCase()}{" "}
            in your database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 border-b border-zinc-800 px-6 py-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-indigo-500/10 px-3 py-1.5">
            <span className="text-sm text-indigo-400">
              {selectedIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-red-400">{error}</p>
              <Button variant="outline" className="mt-4" onClick={refresh}>
                Try Again
              </Button>
            </div>
          </div>
        ) : contacts.length === 0 && !isLoading ? (
          searchQuery ? (
            <EmptySearchResults />
          ) : (
            <EmptyContacts onAdd={() => setIsFormOpen(true)} />
          )
        ) : (
          <DataTable
            columns={columns}
            data={contacts}
            keyExtractor={(c) => c.id}
            isLoading={isLoading}
            sortBy={pagination.sort_by}
            sortOrder={pagination.sort_order}
            onSort={handleSort}
            onRowClick={handleRowClick}
            selectable
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
          />
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="border-t border-zinc-800 px-6 py-4">
          <Pagination
            total={total}
            limit={pagination.limit || 20}
            offset={pagination.offset || 0}
            onPageChange={(offset) => setPagination({ ...pagination, offset })}
            onLimitChange={(limit) =>
              setPagination({ ...pagination, limit, offset: 0 })
            }
          />
        </div>
      )}

      {/* Contact Form Modal */}
      <ContactForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={handleFormSuccess}
      />

      {/* Contact Detail Drawer */}
      {selectedContact && (
        <ContactDetail contact={selectedContact} onClose={handleDetailClose} />
      )}
    </div>
  );
}
