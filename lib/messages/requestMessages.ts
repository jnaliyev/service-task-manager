export type RequestMessage = {
  id: number;
  task_id: number;
  sender_name: string;
  sender_type: "client" | "erp";
  body: string;
  attachments: string[] | string | null;
  created_at: string;
};

export function parseMessageAttachments(
  value: RequestMessage["attachments"]
): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim() !== ""
    );
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;

      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === "string" && item.trim() !== ""
        );
      }
    } catch {
      return value.trim() ? [value] : [];
    }
  }

  return [];
}

export function formatMessageDate(createdAt?: string | null) {
  if (!createdAt) return "—";

  const parsed = new Date(createdAt);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatMessageTime(createdAt?: string | null) {
  if (!createdAt) return "—";

  const parsed = new Date(createdAt);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function countUnreadMessages(
  messages: RequestMessage[],
  reader: "client" | "erp",
  readAt?: string | null
) {
  const oppositeType = reader === "client" ? "erp" : "client";
  const readTimestamp = readAt ? new Date(readAt).getTime() : 0;

  return messages.filter((message) => {
    if (message.sender_type !== oppositeType) return false;

    const createdAt = new Date(message.created_at).getTime();

    return Number.isFinite(createdAt) && createdAt > readTimestamp;
  }).length;
}
