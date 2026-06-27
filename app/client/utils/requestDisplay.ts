export function getAttachmentUrls(
  attachments: string[] | string | null | undefined
): string[] {
  if (!attachments) return [];

  if (Array.isArray(attachments)) {
    return attachments.filter(
      (url): url is string => typeof url === "string" && url.trim() !== ""
    );
  }

  if (typeof attachments === "string") {
    try {
      const parsed = JSON.parse(attachments);

      if (Array.isArray(parsed)) {
        return parsed.filter(
          (url): url is string => typeof url === "string" && url.trim() !== ""
        );
      }
    } catch {
      return attachments.trim() ? [attachments] : [];
    }
  }

  return [];
}

export function formatRequestId(
  id: number,
  createdAt?: string | null
) {
  const year = createdAt
    ? new Date(createdAt).getFullYear()
    : new Date().getFullYear();

  return `RS-${year}-${String(id).padStart(6, "0")}`;
}

export function formatCreatedDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
