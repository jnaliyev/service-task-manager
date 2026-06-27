"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { playNotificationSound } from "@/lib/notifications/playNotificationSound";

export type ClientRequestNotification = {
  id: string;
  taskId: number;
  companyName: string;
  storeName: string;
  priority: string;
  category: string;
  createdAt: string;
  read: boolean;
};

type TaskInsertPayload = {
  id: number;
  created_by?: string | null;
  company_name?: string | null;
  store?: string | null;
  priority?: string | null;
  category?: string | null;
  created_at?: string | null;
};

function isClientPortalTask(createdBy?: string | null) {
  return typeof createdBy === "string" && createdBy.startsWith("Client Portal");
}

function createNotificationFromTask(task: TaskInsertPayload): ClientRequestNotification {
  return {
    id: `task-${task.id}-${Date.now()}`,
    taskId: task.id,
    companyName: task.company_name?.trim() || "—",
    storeName: task.store?.trim() || "—",
    priority: task.priority?.trim() || "Medium",
    category: task.category?.trim() || "General",
    createdAt: task.created_at || new Date().toISOString(),
    read: false,
  };
}

type UseClientRequestRealtimeOptions<TTask extends { id: number }> = {
  enabled: boolean;
  supabase: SupabaseClient;
  fetchTaskById: (taskId: number) => Promise<TTask | null>;
  onTaskReceived: (task: TTask) => void;
};

export function useClientRequestRealtime<TTask extends { id: number }>({
  enabled,
  supabase,
  fetchTaskById,
  onTaskReceived,
}: UseClientRequestRealtimeOptions<TTask>) {
  const [notifications, setNotifications] = useState<ClientRequestNotification[]>(
    []
  );
  const [activeToastId, setActiveToastId] = useState<string | null>(null);
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<number>>(
    () => new Set()
  );
  const [isPanelOpen, setPanelOpen] = useState(false);
  const highlightTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const channelRef = useRef<RealtimeChannel | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const activeToast = useMemo(
    () => notifications.find((notification) => notification.id === activeToastId) ?? null,
    [notifications, activeToastId]
  );

  const highlightTask = useCallback((taskId: number) => {
    setHighlightedTaskIds((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });

    const existingTimeout = highlightTimeoutsRef.current.get(taskId);

    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      setHighlightedTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      highlightTimeoutsRef.current.delete(taskId);
    }, 3000);

    highlightTimeoutsRef.current.set(taskId, timeout);
  }, []);

  const handleIncomingTask = useCallback(
    async (payload: TaskInsertPayload) => {
      if (!isClientPortalTask(payload.created_by)) return;

      const notification = createNotificationFromTask(payload);

      setNotifications((prev) => [notification, ...prev]);
      setActiveToastId(notification.id);
      playNotificationSound();
      highlightTask(payload.id);

      const fullTask = await fetchTaskById(payload.id);

      if (fullTask) {
        onTaskReceived(fullTask);
      }
    },
    [fetchTaskById, highlightTask, onTaskReceived]
  );

  useEffect(() => {
    if (!enabled) return;

    const event = "INSERT";
    const schema = "public";
    const table = "tasks";

    console.log("Realtime subscription config:", {
      event,
      schema,
      table,
    });

    console.log("Realtime subscription created");

    const channel = supabase
      .channel("dashboard-client-requests")
      .on(
        "postgres_changes",
        {
          event,
          schema,
          table,
        },
        (payload) => {
          console.log("Realtime new task payload:", payload);
          void handleIncomingTask(payload.new as TaskInsertPayload);
        }
      )
      .subscribe((status, error, ...restArgs) => {
        console.log("Realtime subscribe callback:", {
          status,
          error,
        });

        if (error === undefined) {
          console.log("Realtime subscribe callback args:", [
            status,
            error,
            ...restArgs,
          ]);
        }

        console.log("Realtime channel state:", channel.state);
      });

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [enabled, supabase, handleIncomingTask]);

  useEffect(() => {
    return () => {
      highlightTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      highlightTimeoutsRef.current.clear();
    };
  }, []);

  const dismissToast = useCallback(() => {
    setActiveToastId(null);
  }, []);

  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== notificationId)
    );
    setActiveToastId((prev) => (prev === notificationId ? null : prev));
  }, []);

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
  }, []);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
    markNotificationsRead();
  }, [markNotificationsRead]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const openNotificationTask = useCallback(
    (notification: ClientRequestNotification) => {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item
        )
      );
      setActiveToastId((prev) => (prev === notification.id ? null : prev));
      return notification.taskId;
    },
    []
  );

  return {
    notifications,
    unreadCount,
    activeToast,
    highlightedTaskIds,
    isPanelOpen,
    openPanel,
    closePanel,
    dismissToast,
    dismissNotification,
    openNotificationTask,
    highlightTask,
  };
}
