"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { get, put } from "@/lib/api/client";
import {
  mapApiEscalation,
  type EscalationItem,
  type EscalationQueueResponse,
  type EscalationStatus,
} from "@/types/escalation";

// State types
interface EscalationState {
  queue: EscalationItem[];
  activeEscalation: EscalationItem | null;
  isPanelOpen: boolean;
  isDockExpanded: boolean;
  isLoading: boolean;
  error: string | null;
}

// Action types
type EscalationAction =
  | { type: "SET_QUEUE"; payload: EscalationItem[] }
  | { type: "SET_ACTIVE"; payload: EscalationItem | null }
  | { type: "OPEN_PANEL"; payload: EscalationItem }
  | { type: "CLOSE_PANEL" }
  | { type: "TOGGLE_DOCK" }
  | { type: "SET_DOCK_EXPANDED"; payload: boolean }
  | { type: "TAKE_CALL"; payload: string }
  | { type: "RESOLVE_ESCALATION"; payload: string }
  | { type: "SCHEDULE_CALLBACK"; payload: { id: string; assignedTo: string } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "UPDATE_WAIT_TIMES" };

// Reducer
function escalationReducer(
  state: EscalationState,
  action: EscalationAction,
): EscalationState {
  switch (action.type) {
    case "SET_QUEUE":
      return { ...state, queue: action.payload, isLoading: false };

    case "SET_ACTIVE":
      return { ...state, activeEscalation: action.payload };

    case "OPEN_PANEL":
      return {
        ...state,
        activeEscalation: action.payload,
        isPanelOpen: true,
        isDockExpanded: false,
      };

    case "CLOSE_PANEL":
      return { ...state, isPanelOpen: false, activeEscalation: null };

    case "TOGGLE_DOCK":
      return { ...state, isDockExpanded: !state.isDockExpanded };

    case "SET_DOCK_EXPANDED":
      return { ...state, isDockExpanded: action.payload };

    case "TAKE_CALL": {
      const updatedQueue = state.queue.map((e) =>
        e.id === action.payload
          ? { ...e, status: "in-progress" as EscalationStatus }
          : e,
      );
      const activeEscalation = updatedQueue.find(
        (e) => e.id === action.payload,
      );
      return {
        ...state,
        queue: updatedQueue,
        activeEscalation: activeEscalation || null,
        isPanelOpen: true,
        isDockExpanded: false,
      };
    }

    case "RESOLVE_ESCALATION": {
      const updatedQueue = state.queue.map((e) =>
        e.id === action.payload
          ? {
              ...e,
              status: "resolved" as EscalationStatus,
              resolvedAt: new Date(),
            }
          : e,
      );
      return {
        ...state,
        queue: updatedQueue,
        isPanelOpen: false,
        activeEscalation: null,
      };
    }

    case "SCHEDULE_CALLBACK": {
      const updatedQueue = state.queue.map((e) =>
        e.id === action.payload.id
          ? {
              ...e,
              status: "callback-scheduled" as EscalationStatus,
              assignedTo: action.payload.assignedTo,
            }
          : e,
      );
      return {
        ...state,
        queue: updatedQueue,
        isPanelOpen: false,
        activeEscalation: null,
      };
    }

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };

    case "UPDATE_WAIT_TIMES": {
      const updatedQueue = state.queue.map((e) =>
        e.status === "waiting" ? { ...e, waitTime: e.waitTime + 1 } : e,
      );
      return { ...state, queue: updatedQueue };
    }

    default:
      return state;
  }
}

// Initial state
const initialState: EscalationState = {
  queue: [],
  activeEscalation: null,
  isPanelOpen: false,
  isDockExpanded: false,
  isLoading: true,
  error: null,
};

// Context value type
interface EscalationContextValue {
  // State
  queue: EscalationItem[];
  waitingQueue: EscalationItem[];
  activeEscalation: EscalationItem | null;
  isPanelOpen: boolean;
  isDockExpanded: boolean;
  isLoading: boolean;
  error: string | null;

  // Stats
  waitingCount: number;
  urgentCount: number;
  highPriorityCount: number;
  avgWaitTime: number;

  // Actions
  takeCall: (escalationId: string) => void;
  resolveEscalation: (escalationId: string) => void;
  scheduleCallback: (escalationId: string, assignedTo: string) => void;
  openPanel: (escalation: EscalationItem) => void;
  closePanel: () => void;
  toggleDock: () => void;
  setDockExpanded: (expanded: boolean) => void;
  refresh: () => void;
}

const EscalationContext = createContext<EscalationContextValue | undefined>(
  undefined,
);

interface EscalationProviderProps {
  children: ReactNode;
}

export function EscalationProvider({ children }: EscalationProviderProps) {
  const [state, dispatch] = useReducer(escalationReducer, initialState);

  const loadQueue = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await get<EscalationQueueResponse>("/api/escalation/queue");
      const queue = (data.queue || []).map(mapApiEscalation);
      dispatch({ type: "SET_QUEUE", payload: queue });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        payload: err instanceof Error ? err.message : "Failed to load queue",
      });
    }
  }, []);

  // Load initial data
  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  // Update wait times every second for waiting escalations
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: "UPDATE_WAIT_TIMES" });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Computed values
  const waitingQueue = state.queue.filter((e) => e.status === "waiting");
  const waitingCount = waitingQueue.length;
  const urgentCount = waitingQueue.filter(
    (e) => e.priority === "urgent",
  ).length;
  const highPriorityCount = waitingQueue.filter(
    (e) => e.priority === "high",
  ).length;
  const avgWaitTime =
    waitingQueue.length > 0
      ? Math.round(
          waitingQueue.reduce((sum, e) => sum + e.waitTime, 0) /
            waitingQueue.length,
        )
      : 0;

  // Actions
  const takeCall = useCallback((escalationId: string) => {
    dispatch({ type: "TAKE_CALL", payload: escalationId });
    void put(`/api/escalation/queue/${escalationId}/take`).catch(() => {
      dispatch({
        type: "SET_ERROR",
        payload: "Failed to update escalation status",
      });
    });
  }, []);

  const resolveEscalation = useCallback((escalationId: string) => {
    dispatch({ type: "RESOLVE_ESCALATION", payload: escalationId });
    void put(`/api/escalation/queue/${escalationId}/resolve`).catch(() => {
      dispatch({ type: "SET_ERROR", payload: "Failed to resolve escalation" });
    });
  }, []);

  const scheduleCallback = useCallback(
    (escalationId: string, assignedTo: string) => {
      dispatch({
        type: "SCHEDULE_CALLBACK",
        payload: { id: escalationId, assignedTo },
      });
      void put(`/api/escalation/queue/${escalationId}/schedule-callback`, {
        assigned_to: assignedTo,
      }).catch(() => {
        dispatch({ type: "SET_ERROR", payload: "Failed to schedule callback" });
      });
    },
    [],
  );

  const openPanel = useCallback((escalation: EscalationItem) => {
    dispatch({ type: "OPEN_PANEL", payload: escalation });
  }, []);

  const closePanel = useCallback(() => {
    dispatch({ type: "CLOSE_PANEL" });
  }, []);

  const toggleDock = useCallback(() => {
    dispatch({ type: "TOGGLE_DOCK" });
  }, []);

  const setDockExpanded = useCallback((expanded: boolean) => {
    dispatch({ type: "SET_DOCK_EXPANDED", payload: expanded });
  }, []);

  const refresh = useCallback(() => {
    void loadQueue();
  }, [loadQueue]);

  const value: EscalationContextValue = {
    queue: state.queue,
    waitingQueue,
    activeEscalation: state.activeEscalation,
    isPanelOpen: state.isPanelOpen,
    isDockExpanded: state.isDockExpanded,
    isLoading: state.isLoading,
    error: state.error,
    waitingCount,
    urgentCount,
    highPriorityCount,
    avgWaitTime,
    takeCall,
    resolveEscalation,
    scheduleCallback,
    openPanel,
    closePanel,
    toggleDock,
    setDockExpanded,
    refresh,
  };

  return (
    <EscalationContext.Provider value={value}>
      {children}
    </EscalationContext.Provider>
  );
}

export function useEscalation() {
  const context = useContext(EscalationContext);
  if (context === undefined) {
    throw new Error("useEscalation must be used within an EscalationProvider");
  }
  return context;
}

// Helper hook for just queue stats
export function useEscalationStats() {
  const { waitingCount, urgentCount, highPriorityCount, avgWaitTime } =
    useEscalation();
  return { waitingCount, urgentCount, highPriorityCount, avgWaitTime };
}
