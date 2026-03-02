"use client";

import * as React from "react";
import {
  Send,
  Mail,
  MessageSquare,
  Bell,
  Filter,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, Column } from "@/components/crm/shared/DataTable";
import { Pagination } from "@/components/crm/shared/Pagination";
import { EmptyNotifications } from "@/components/crm/shared/EmptyState";
import { useIndustry } from "@/context/IndustryContext";
import { Badge } from "@/components/ui/badge";
import {
  listNotifications,
  listTemplates,
  getNotificationTypeLabel,
} from "@/lib/api";
import type {
  Notification,
  NotificationTemplate,
  NotificationStatus,
  PaginationParams,
} from "@/types/crm";
import { cn } from "@/lib/utils";

// ============================================================================
// STATUS ICON
// ============================================================================

function StatusIcon({ status }: { status: NotificationStatus }) {
  const iconMap: Record<NotificationStatus, React.ElementType> = {
    pending: Clock,
    queued: Clock,
    sending: RefreshCw,
    sent: CheckCircle,
    delivered: CheckCircle,
    opened: CheckCircle,
    clicked: CheckCircle,
    bounced: AlertCircle,
    failed: XCircle,
    cancelled: XCircle,
  };

  const colorMap: Record<NotificationStatus, string> = {
    pending: "text-zinc-400",
    queued: "text-blue-400",
    sending: "text-indigo-400 animate-spin",
    sent: "text-emerald-400",
    delivered: "text-emerald-400",
    opened: "text-teal-400",
    clicked: "text-cyan-400",
    bounced: "text-amber-400",
    failed: "text-red-400",
    cancelled: "text-zinc-500",
  };

  const Icon = iconMap[status];
  return <Icon className={cn("h-4 w-4", colorMap[status])} />;
}

function ChannelIcon({ channel }: { channel: string }) {
  const icons: Record<string, React.ElementType> = {
    email: Mail,
    sms: MessageSquare,
    push: Bell,
    in_app: Bell,
  };

  const Icon = icons[channel] || Bell;
  return <Icon className="h-4 w-4 text-zinc-400" />;
}

// ============================================================================
// TABLE COLUMNS
// ============================================================================

const columns: Column<Notification>[] = [
  {
    key: "status",
    header: "Status",
    width: "60px",
    render: (notification) => (
      <div className="flex items-center justify-center">
        <StatusIcon status={notification.status} />
      </div>
    ),
  },
  {
    key: "channel",
    header: "Channel",
    width: "60px",
    render: (notification) => (
      <div className="flex items-center justify-center">
        <ChannelIcon channel={notification.channel} />
      </div>
    ),
  },
  {
    key: "type",
    header: "Type",
    render: (notification) => (
      <span className="text-zinc-300">
        {getNotificationTypeLabel(notification.notification_type)}
      </span>
    ),
  },
  {
    key: "recipient",
    header: "Recipient",
    render: (notification) => (
      <div>
        <div className="text-zinc-100">
          {notification.recipient_name || "Unknown"}
        </div>
        <div className="text-xs text-zinc-500">{notification.recipient}</div>
      </div>
    ),
  },
  {
    key: "body",
    header: "Message",
    render: (notification) => (
      <span className="text-zinc-400 line-clamp-1 max-w-[300px]">
        {notification.body}
      </span>
    ),
  },
  {
    key: "created_at",
    header: "Created",
    sortable: true,
    render: (notification) => {
      const date = new Date(notification.created_at);
      return (
        <span className="text-zinc-500 text-xs">
          {date.toLocaleDateString()}{" "}
          {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      );
    },
  },
  {
    key: "sent_at",
    header: "Sent",
    render: (notification) => {
      if (!notification.sent_at)
        return <span className="text-zinc-600">-</span>;
      const date = new Date(notification.sent_at);
      return (
        <span className="text-zinc-500 text-xs">
          {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      );
    },
  },
];

// ============================================================================
// TEMPLATE CARD
// ============================================================================

function TemplateCard({ template }: { template: NotificationTemplate }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 cursor-pointer transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-zinc-100">{template.name}</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {template.channel}
          </Badge>
          {template.is_default && (
            <Badge className="text-xs bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
              Default
            </Badge>
          )}
        </div>
      </div>
      <div className="text-sm text-zinc-400 mb-2">
        {getNotificationTypeLabel(template.notification_type)}
      </div>
      <div className="text-xs text-zinc-500 line-clamp-2">
        {template.body_template}
      </div>
    </div>
  );
}

// ============================================================================
// NOTIFICATIONS PAGE
// ============================================================================

export default function NotificationsPage() {
  const { transactionLabel, transactionPluralLabel } = useIndustry();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [templates, setTemplates] = React.useState<NotificationTemplate[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [pagination, setPagination] = React.useState<PaginationParams>({
    limit: 20,
    offset: 0,
  });

  // Load notifications
  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [notifResult, templatesResult] = await Promise.all([
          listNotifications({}, pagination),
          listTemplates(),
        ]);
        setNotifications(notifResult.data);
        setTotal(notifResult.total);
        setTemplates(templatesResult.templates);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [pagination]);

  const handleRefresh = () => {
    setPagination({ ...pagination }); // Trigger reload
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Notifications</h1>
          <p className="text-sm text-zinc-500">
            Manage notification queue and templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Send Notification
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="queue"
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="mx-6 mt-4 w-fit">
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Queue Tab */}
        <TabsContent
          value="queue"
          className="flex-1 flex flex-col overflow-hidden mt-0"
        >
          {/* Filters */}
          <div className="flex items-center gap-4 border-b border-zinc-800 px-6 py-3">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <div className="flex gap-2">
              {(["all", "pending", "sent", "failed"] as const).map((status) => (
                <Button
                  key={status}
                  variant="ghost"
                  size="sm"
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {notifications.length === 0 && !isLoading ? (
              <EmptyNotifications />
            ) : (
              <DataTable
                columns={columns}
                data={notifications}
                keyExtractor={(n) => n.id}
                isLoading={isLoading}
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
                onPageChange={(offset) =>
                  setPagination({ ...pagination, offset })
                }
              />
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent
          value="templates"
          className="flex-1 overflow-auto p-6 mt-0"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Notification Templates
            </h2>
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>

          {templates.length === 0 ? (
            <div className="text-center text-zinc-500 py-12">
              No templates configured
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="flex-1 overflow-auto p-6 mt-0">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">
              Notification Settings
            </h2>

            <div className="space-y-6">
              {/* Transaction Confirmations */}
              <div className="rounded-lg border border-zinc-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-zinc-100">
                    {transactionLabel} Confirmations
                  </span>
                  <Badge className="bg-emerald-500/20 text-emerald-400">
                    Enabled
                  </Badge>
                </div>
                <p className="text-sm text-zinc-400">
                  Send confirmation notifications when{" "}
                  {transactionPluralLabel.toLowerCase()} are created
                </p>
                <div className="mt-3 flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="checkbox" checked className="rounded" />
                    Email
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="checkbox" checked className="rounded" />
                    SMS
                  </label>
                </div>
              </div>

              {/* Reminders */}
              <div className="rounded-lg border border-zinc-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-zinc-100">
                    {transactionLabel} Reminders
                  </span>
                  <Badge className="bg-emerald-500/20 text-emerald-400">
                    Enabled
                  </Badge>
                </div>
                <p className="text-sm text-zinc-400">
                  Automatically send reminders before{" "}
                  {transactionPluralLabel.toLowerCase()}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">24 hours before</Badge>
                  <Badge variant="outline">1 hour before</Badge>
                </div>
              </div>

              {/* Review Requests */}
              <div className="rounded-lg border border-zinc-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-zinc-100">
                    Review Requests
                  </span>
                  <Badge className="bg-zinc-500/20 text-zinc-400">
                    Disabled
                  </Badge>
                </div>
                <p className="text-sm text-zinc-400">
                  Request reviews after completed{" "}
                  {transactionPluralLabel.toLowerCase()}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
