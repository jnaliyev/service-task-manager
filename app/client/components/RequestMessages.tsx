"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { az } from "@/app/client/i18n/az";
import {
  getClientAuthHeaders,
  type ClientPortalSession,
} from "@/lib/clientPortals/clientSession";
import {
  isAcceptedClientPhoto,
  uploadClientPhotos,
} from "@/app/client/utils/clientPhotoUpload";
import {
  MESSAGES_TABLE,
  mapTaskCommentToMessage,
  type TaskCommentRow,
} from "@/lib/messages/taskCommentsAdapter";
import {
  formatMessageDate,
  formatMessageTime,
  parseMessageAttachments,
  type RequestMessage,
} from "@/lib/messages/requestMessages";
import { playNotificationSound } from "@/lib/notifications/playNotificationSound";

type RequestMessagesProps = {
  slug: string;
  requestId: string;
  session: ClientPortalSession;
};

type PhotoItem = {
  id: string;
  file: File;
  previewUrl: string;
};

function createPhotoItem(file: File): PhotoItem {
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export default function RequestMessages({
  slug,
  requestId,
  session,
}: RequestMessagesProps) {
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageText, setMessageText] = useState("");
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const photoItemsRef = useRef(photoItems);
  photoItemsRef.current = photoItems;

  const markRead = useCallback(async () => {
    try {
      await fetch(
        `/api/client-portals/${slug}/requests/${requestId}/messages/read`,
        { method: "POST", headers: getClientAuthHeaders(session) }
      );
      setUnreadCount(0);
    } catch (markReadError) {
      console.error(markReadError);
    }
  }, [requestId, slug]);

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/client-portals/${slug}/requests/${requestId}/messages`,
        { headers: getClientAuthHeaders(session) }
      );

      const data = (await response.json()) as {
        messages: RequestMessage[];
        unreadCount: number;
        loadError?: boolean;
      };

      if (data.loadError || !response.ok) {
        console.error("[messages] load failed:", data);
        setMessages([]);
        setUnreadCount(0);
        setError(az.unableToLoadMessages);
        return;
      }

      setMessages(data.messages || []);
      setUnreadCount(data.unreadCount || 0);
      setError("");
    } catch (loadError) {
      console.error("[messages] load failed:", loadError);
      setMessages([]);
      setUnreadCount(0);
      setError(az.unableToLoadMessages);
    } finally {
      setLoading(false);
    }
  }, [requestId, slug]);

  useEffect(() => {
    void loadMessages();
    void markRead();
  }, [loadMessages, markRead]);

  useEffect(() => {
    return () => {
      photoItemsRef.current.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl)
      );
    };
  }, []);

  useEffect(() => {
    const taskId = Number(requestId);

    if (!Number.isFinite(taskId)) return;

    const channel = supabase
      .channel(`client-request-messages-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: MESSAGES_TABLE,
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          const incoming = mapTaskCommentToMessage(payload.new as TaskCommentRow);

          setMessages((current) => {
            if (current.some((message) => message.id === incoming.id)) {
              return current;
            }

            return [...current, incoming];
          });

          if (incoming.sender_type === "erp") {
            setUnreadCount((count) => count + 1);
            setToast(az.newMessageNotification);
            void playNotificationSound();
            void markRead();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [markRead, requestId]);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => setToast(null), 4000);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!listRef.current) return;

    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  async function handleSend() {
    const body = messageText.trim();
    const files = photoItems.map((item) => item.file);

    if (!body && files.length === 0) return;

    setError("");
    setBusy(true);

    try {
      let attachments: string[] = [];

      if (files.length > 0) {
        setUploadProgress({ current: 0, total: files.length });
        attachments = await uploadClientPhotos(files, (current, total) => {
          setUploadProgress({ current, total });
        });
        setUploadProgress(null);
      }

      const response = await fetch(
        `/api/client-portals/${slug}/requests/${requestId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getClientAuthHeaders(session),
          },
          body: JSON.stringify({ body, attachments }),
        }
      );

      if (!response.ok) {
        throw new Error("Send failed");
      }

      const data = (await response.json()) as { message: RequestMessage };

      setMessages((current) => {
        if (current.some((message) => message.id === data.message.id)) {
          return current;
        }

        return [...current, data.message];
      });

      setMessageText("");
      setPhotoItems((current) => {
        current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        return [];
      });
    } catch (sendError) {
      console.error(sendError);
      setError(az.messageSendError);
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    const validFiles = files.filter(isAcceptedClientPhoto);

    if (validFiles.length !== files.length) {
      setError(az.invalidImageType);
    } else {
      setError("");
    }

    if (validFiles.length === 0) {
      event.target.value = "";
      return;
    }

    setPhotoItems((current) => [
      ...current,
      ...validFiles.map(createPhotoItem),
    ]);
    event.target.value = "";
  }

  function removePhoto(id: string) {
    setPhotoItems((current) => {
      const item = current.find((photo) => photo.id === id);

      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }

      return current.filter((photo) => photo.id !== id);
    });
  }

  const uploadPercent = uploadProgress
    ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
    : 0;

  return (
    <div className="portal-messages-section">
      <div className="portal-messages-header">
        <h2 style={sectionTitleStyle}>{az.messagesTitle}</h2>
        {unreadCount > 0 && (
          <span className="portal-messages-unread">{unreadCount}</span>
        )}
      </div>

      {toast && <div className="portal-messages-toast">{toast}</div>}

      {loading && (
        <p style={emptyStyle}>{az.loadingMessages}</p>
      )}

      {!loading && messages.length === 0 && (
        <p style={emptyStyle}>{az.noMessagesYet}</p>
      )}

      <div ref={listRef} className="portal-messages-list">
        {messages.map((message) => {
          const attachments = parseMessageAttachments(message.attachments);

          return (
            <article
              key={message.id}
              className={`portal-message-item portal-message-item--${message.sender_type}`}
            >
              <div className="portal-message-meta">
                <strong>{message.sender_name}</strong>
                <span>
                  {formatMessageDate(message.created_at)} ·{" "}
                  {formatMessageTime(message.created_at)}
                </span>
              </div>
              {message.body.trim() && (
                <p className="portal-message-body">{message.body}</p>
              )}
              {attachments.length > 0 && (
                <div className="portal-message-attachments">
                  {attachments.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="" />
                    </a>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {error && <p style={errorStyle}>{error}</p>}

      <div className="portal-messages-composer">
        <textarea
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          placeholder={az.messagePlaceholder}
          disabled={busy}
          rows={3}
          style={textareaStyle}
        />

        <label className="portal-upload-area portal-upload-area--compact">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            onChange={handlePhotoChange}
            style={{ display: "none" }}
          />
          <span style={uploadTitleStyle}>{az.attachPhotoToMessage}</span>
        </label>

        {uploadProgress && (
          <div className="portal-upload-progress">
            <div className="portal-upload-progress-track">
              <div
                className="portal-upload-progress-fill"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
          </div>
        )}

        {photoItems.length > 0 && (
          <div className="portal-photo-grid">
            {photoItems.map((item) => (
              <div key={item.id} className="portal-photo-preview">
                <img src={item.previewUrl} alt={item.file.name} />
                <button
                  type="button"
                  className="portal-photo-remove"
                  disabled={busy}
                  onClick={() => removePhoto(item.id)}
                  aria-label={az.removePhoto}
                  title={az.removePhoto}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="portal-btn-primary"
          disabled={busy || (!messageText.trim() && photoItems.length === 0)}
          onClick={() => void handleSend()}
        >
          {busy ? az.sendingMessage : az.sendMessage}
        </button>
      </div>
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
  fontWeight: 700,
};

const emptyStyle: React.CSSProperties = {
  margin: "16px 0 0",
  color: "#6b7280",
  fontSize: "14px",
};

const errorStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#b91c1c",
  fontSize: "14px",
};

const textareaStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  fontSize: "15px",
  lineHeight: 1.5,
  color: "#111827",
  background: "#ffffff",
  resize: "vertical",
  boxSizing: "border-box",
};

const uploadTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#111827",
};
