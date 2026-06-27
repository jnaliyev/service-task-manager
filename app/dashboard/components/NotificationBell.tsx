"use client";

import { useEffect, useRef } from "react";
import type { ClientRequestNotification } from "../hooks/useClientRequestRealtime";

type NotificationBellProps = {
  notifications: ClientRequestNotification[];
  unreadCount: number;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onOpenTask: (notification: ClientRequestNotification) => void;
  onDismiss: (notificationId: string) => void;
};

function formatNotificationTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationBell({
  notifications,
  unreadCount,
  isOpen,
  onOpen,
  onClose,
  onOpenTask,
  onDismiss,
}: NotificationBellProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen, onClose]);

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        type="button"
        className="notification-bell-trigger"
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? onClose() : onOpen())}
      >
        <span className="notification-bell-icon" aria-hidden="true">
          🔔
        </span>
        {unreadCount > 0 && (
          <span className="notification-bell-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-bell-panel">
          <div className="notification-bell-panel-header">
            <h3>Notifications</h3>
            <span>{notifications.length} total</span>
          </div>

          {notifications.length === 0 ? (
            <p className="notification-bell-empty">No notifications yet.</p>
          ) : (
            <ul className="notification-bell-list">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`notification-bell-item${
                    notification.read ? "" : " notification-bell-item--unread"
                  }`}
                >
                  <div className="notification-bell-item-top">
                    <strong>Yeni sorğu daxil oldu</strong>
                    <span>{formatNotificationTime(notification.createdAt)}</span>
                  </div>

                  <p>
                    <span>Company:</span> {notification.companyName}
                  </p>
                  <p>
                    <span>Store:</span> {notification.storeName}
                  </p>
                  <p>
                    <span>Priority:</span> {notification.priority}
                  </p>
                  <p>
                    <span>Category:</span> {notification.category}
                  </p>

                  <div className="notification-bell-item-actions">
                    <button
                      type="button"
                      className="notification-bell-action notification-bell-action-primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenTask(notification);
                      }}
                    >
                      Open Task
                    </button>
                    <button
                      type="button"
                      className="notification-bell-action"
                      onClick={() => onDismiss(notification.id)}
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
