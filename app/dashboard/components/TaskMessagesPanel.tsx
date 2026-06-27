"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import {
  buildCommentPayload,
  insertTaskComment,
  loadTaskComments,
  mapTaskCommentToMessage,
  MESSAGES_TABLE,
  type TaskCommentRow,
} from "@/lib/messages/taskCommentsAdapter";
import {
  formatMessageDate,
  formatMessageTime,
  parseMessageAttachments,
  type RequestMessage,
} from "@/lib/messages/requestMessages";

type TaskMessagesPanelProps = {
  taskId: number;
  senderName: string;
  darkMode: boolean;
  onUnreadChange?: (taskId: number, count: number) => void;
};

type PhotoItem = {
  id: string;
  file: File;
  previewUrl: string;
};

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ATTACHMENTS_BUCKET = "client-attachments";

function createPhotoItem(file: File): PhotoItem {
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

async function uploadMessagePhotos(files: File[]): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (const file of files) {
    const filePath = `request-messages/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .getPublicUrl(filePath);

    uploadedUrls.push(data.publicUrl);
  }

  return uploadedUrls;
}

export default function TaskMessagesPanel({
  taskId,
  senderName,
  darkMode,
  onUnreadChange,
}: TaskMessagesPanelProps) {
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageText, setMessageText] = useState("");
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const photoItemsRef = useRef(photoItems);
  photoItemsRef.current = photoItems;

  const markRead = useCallback(async () => {
    setUnreadCount(0);
    onUnreadChange?.(taskId, 0);
  }, [onUnreadChange, taskId]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: messageRows, error: messageError } = await loadTaskComments(
        supabase,
        taskId
      );

      if (messageError) {
        console.error("[messages] load failed:", messageError);
        setMessages([]);
        setUnreadCount(0);
        setError("Unable to load messages.");
        return;
      }

      const nextMessages = (messageRows || []).map((row) =>
        mapTaskCommentToMessage(row)
      );
      setMessages(nextMessages);
      setUnreadCount(0);
      onUnreadChange?.(taskId, 0);
    } catch (loadError) {
      console.error("[messages] load failed:", loadError);
      setMessages([]);
      setError("Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange, taskId]);

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
    const channel = supabase
      .channel(`erp-request-messages-${taskId}`)
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

          if (incoming.sender_type === "client") {
            setUnreadCount((count) => {
              const nextCount = count + 1;
              onUnreadChange?.(taskId, nextCount);
              return nextCount;
            });
            void markRead();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [markRead, onUnreadChange, taskId]);

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
      const attachments = files.length > 0 ? await uploadMessagePhotos(files) : [];

      const { data, error: insertError } = await insertTaskComment(supabase, {
        task_id: taskId,
        author: senderName,
        comment: buildCommentPayload(body, attachments),
      });

      if (insertError) {
        throw insertError;
      }

      const message = mapTaskCommentToMessage(data);

      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current;
        }

        return [...current, message];
      });

      setMessageText("");
      setPhotoItems((current) => {
        current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        return [];
      });
    } catch (sendError) {
      console.error("[messages] send failed:", sendError);
      setError("Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) =>
      ACCEPTED_IMAGE_TYPES.includes(file.type)
    );

    if (validFiles.length !== files.length) {
      setError("Only JPEG, PNG, and WebP images are allowed.");
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

  const panelBackground = darkMode ? "#1f2937" : "white";
  const panelColor = darkMode ? "#f9fafb" : "#111827";
  const mutedColor = darkMode ? "#cbd5e1" : "#6b7280";
  const borderColor = darkMode ? "#334155" : "#e5e7eb";

  return (
    <div
      style={{
        background: panelBackground,
        color: panelColor,
        padding: "24px",
        borderRadius: "16px",
        marginTop: "24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <h2 style={{ margin: 0 }}>Messages</h2>
        {unreadCount > 0 && (
          <span
            style={{
              minWidth: "24px",
              height: "24px",
              padding: "0 8px",
              borderRadius: "999px",
              background: "#2563eb",
              color: "white",
              fontSize: "12px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount}
          </span>
        )}
      </div>

      {loading && (
        <p style={{ marginTop: "16px", color: mutedColor }}>Loading messages...</p>
      )}

      {!loading && messages.length === 0 && (
        <p style={{ marginTop: "16px", color: mutedColor }}>No messages yet.</p>
      )}

      <div
        ref={listRef}
        style={{
          marginTop: "16px",
          maxHeight: "320px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.map((message) => {
          const attachments = parseMessageAttachments(message.attachments);

          return (
            <article
              key={message.id}
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                border: `1px solid ${borderColor}`,
                background: darkMode ? "#111827" : "#f9fafb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "8px",
                  fontSize: "13px",
                }}
              >
                <strong>{message.sender_name}</strong>
                <span style={{ color: mutedColor }}>
                  {formatMessageDate(message.created_at)} ·{" "}
                  {formatMessageTime(message.created_at)}
                </span>
              </div>
              {message.body.trim() && (
                <p style={{ margin: 0, lineHeight: 1.5 }}>{message.body}</p>
              )}
              {attachments.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginTop: message.body.trim() ? "10px" : 0,
                  }}
                >
                  {attachments.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img
                        src={url}
                        alt=""
                        style={{
                          width: "96px",
                          height: "96px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: `1px solid ${borderColor}`,
                        }}
                      />
                    </a>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {error && (
        <p style={{ marginTop: "12px", color: "#b91c1c", fontSize: "14px" }}>
          {error}
        </p>
      )}

      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <textarea
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          placeholder="Write a message..."
          disabled={busy}
          rows={3}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: "10px",
            border: `1px solid ${borderColor}`,
            background: darkMode ? "#0f172a" : "white",
            color: panelColor,
            boxSizing: "border-box",
          }}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <label
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: `1px solid ${borderColor}`,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={busy}
              onChange={handlePhotoChange}
              style={{ display: "none" }}
            />
            Attach photo
          </label>

          <button
            type="button"
            disabled={busy || (!messageText.trim() && photoItems.length === 0)}
            onClick={() => void handleSend()}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "none",
              background: "#2563eb",
              color: "white",
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Sending..." : "Send"}
          </button>
        </div>

        {photoItems.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {photoItems.map((item) => (
              <div key={item.id} style={{ position: "relative" }}>
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  style={{
                    width: "72px",
                    height: "72px",
                    objectFit: "cover",
                    borderRadius: "8px",
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => removePhoto(item.id)}
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "22px",
                    height: "22px",
                    borderRadius: "999px",
                    border: "none",
                    background: "rgba(17, 24, 39, 0.8)",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function subscribeToClientMessageNotifications(
  supabaseClient: SupabaseClient,
  enabled: boolean,
  selectedTaskId: string | null,
  onMessage: (message: RequestMessage) => void
) {
  if (!enabled) {
    return () => {};
  }

  const channel = supabaseClient
    .channel("erp-client-message-notifications")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: MESSAGES_TABLE,
      },
      (payload) => {
        const incoming = mapTaskCommentToMessage(payload.new as TaskCommentRow);

        if (incoming.sender_type !== "client") return;
        if (String(incoming.task_id) === selectedTaskId) return;

        onMessage(incoming);
      }
    )
    .subscribe();

  return () => {
    void supabaseClient.removeChannel(channel);
  };
}
