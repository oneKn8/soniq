/**
 * API client exports
 */

// Base client
export {
  apiClient,
  get,
  post,
  put,
  patch,
  del,
  ApiClientError,
  API_BASE,
  getTenantId,
  setTenantId,
  clearTenantId,
  type ApiError,
} from "./client";

// Dashboard API
export {
  // Main functions (transformed to frontend format)
  fetchDashboardMetrics,
  fetchActivityLog,
  fetchVoiceSessions,
  checkApiHealth,

  // Raw API functions (original backend format)
  fetchMetricsRaw,
  fetchStatsRaw,
  fetchActivityLogRaw,

  // Transform utilities
  transformMetrics,
  transformLogEntry,

  // Types
  type ApiMetricsResponse,
  type ApiActivityLogEntry,
  type ApiActivityLogResponse,
  type ApiDashboardStats,
  type ApiVoiceSession,
  type ApiVoiceSessionsResponse,
} from "./dashboard";

// Contacts API
export {
  searchContacts,
  lookupByPhone,
  lookupByEmail,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  findOrCreateByPhone,
  updateContactStatus,
  updateContactTags,
  bulkAddTag,
  getContactNotes,
  addContactNote,
  getContactHistory,
  getContactBookings,
  getContactCalls,
  importContacts,
  exportContacts,
  mergeContacts,
  recalculateEngagementScore,
} from "./contacts";

// Calendar API
export {
  listBookings,
  getUpcomingBookings,
  getCalendarEvents,
  getDaySummary,
  getBooking,
  createBooking,
  updateBooking,
  cancelBooking,
  confirmBooking,
  completeBooking,
  markNoShow,
  cancelBookingWithReason,
  rescheduleBooking,
  getAvailableSlots,
  getAvailableSlotsForRange,
  checkAvailability,
  createSlot,
  updateSlot,
  blockSlot,
  unblockSlot,
  deleteSlot,
  generateSlots,
  getDateRangeForView,
  navigateCalendar,
} from "./calendar";

// Notifications API
export {
  listNotifications,
  getNotification,
  sendNotification,
  previewNotification,
  listTemplates,
  createTemplate,
  updateTemplate,
  getPreferences,
  updatePreferences,
  processQueue,
  getNotificationTypeLabel,
  getNotificationStatusInfo,
  getChannelIcon,
} from "./notifications";

// Deals API
export {
  getPipeline,
  searchDeals,
  getDeal,
  createDeal,
  updateDeal,
  updateDealStage,
  archiveDeal,
  type Deal,
  type DealStage,
  type PipelineStage,
  type CreateDealInput,
  type UpdateDealInput,
} from "./deals";

// Tasks API
export {
  searchTasks,
  getTaskCounts,
  getUpcomingTasks,
  getOverdueTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  type Task,
  type TaskType,
  type TaskPriority,
  type TaskCounts,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "./tasks";

// Resources API
export {
  listResources,
  getActiveResources,
  getBookableResources,
  getResourcesByType,
  getResource,
  createResource,
  updateResource,
  patchResource,
  deleteResource,
  getResourceAvailability,
  reorderResources,
  getResourceTypeLabel,
  getResourceTypeIcon,
  getResourceTypeColor,
  formatDuration,
} from "./resources";
