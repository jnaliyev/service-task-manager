"use client";

import { useEffect, useRef } from "react";
import type { ClientRequestNotification } from "../hooks/useClientRequestRealtime";

type ClientRequestToastProps = {
  notification: ClientRequestNotification | null;
  onOpenTask: (notification: ClientRequestNotification) => void;
  onDismiss: () => void;
};

export default function ClientRequestToast({
  notification,
  onOpenTask,
  onDismiss,
}: ClientRequestToastProps) {
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notification) return;

    function handlePointerDown(event: MouseEvent) {
      if (!toastRef.current?.contains(event.target as Node)) {
        onDismiss();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [notification, onDismiss]);

  if (!notification) return null;

  return (
    <div
      ref={toastRef}
      className="client-request-toast"
      role="status"
      aria-live="polite"
    >
      <div className="client-request-toast-header">
        <span className="client-request-toast-icon" aria-hidden="true">
          🔔
        </span>
        <p className="client-request-toast-title">Yeni sorğu daxil oldu</p>
      </div>

      <dl className="client-request-toast-details">
        <div>
          <dt>Company:</dt>
          <dd>{notification.companyName}</dd>
        </div>
        <div>
          <dt>Store:</dt>
          <dd>{notification.storeName}</dd>
        </div>
        <div>
          <dt>Priority:</dt>
          <dd>{notification.priority}</dd>
        </div>
        <div>
          <dt>Category:</dt>
          <dd>{notification.category}</dd>
        </div>
      </dl>

      <div className="client-request-toast-actions">
        <button
          type="button"
          className="client-request-toast-btn client-request-toast-btn-primary"
          onClick={(event) => {
            event.stopPropagation();
            onOpenTask(notification);
          }}
        >
          Open Task
        </button>
        <button
          type="button"
          className="client-request-toast-btn client-request-toast-btn-secondary"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
