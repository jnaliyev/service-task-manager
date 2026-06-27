export type TaskHistoryRow = {
  id: number | string;
  task_id?: number;
  created_at?: string | null;
  event_type?: string | null;
  action?: string | null;
  event?: string | null;
  old_status?: string | null;
  new_status?: string | null;
  old_department?: string | null;
  new_department?: string | null;
  author?: string | null;
  changed_by?: string | null;
  description?: string | null;
  details?: string | null;
};

export type TimelineEvent = {
  id: string;
  icon: string;
  title: string;
  date: string;
  time: string;
  sortAt: number;
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function formatTimelineParts(createdAt?: string | null): {
  date: string;
  time: string;
  sortAt: number;
} {
  if (!createdAt) {
    return { date: "—", time: "—", sortAt: 0 };
  }

  const parsed = new Date(createdAt);

  if (Number.isNaN(parsed.getTime())) {
    return { date: "—", time: "—", sortAt: 0 };
  }

  return {
    date: parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: parsed.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }),
    sortAt: parsed.getTime(),
  };
}

function mapStatusEvent(status: string): { icon: string; title: string } | null {
  const key = normalizeKey(status);

  if (key === "open") {
    return { icon: "📥", title: "Open" };
  }

  if (key === "in progress" || key === "in_progress") {
    return { icon: "🚧", title: "Work Started" };
  }

  if (key === "waiting approval" || key === "waiting_approval") {
    return { icon: "⏳", title: "Waiting Approval" };
  }

  if (key === "completed" || key === "done") {
    return { icon: "✅", title: "Completed" };
  }

  return null;
}

function mapEventType(eventType: string): { icon: string; title: string } | null {
  const key = normalizeKey(eventType);

  if (
    key.includes("task created") ||
    key === "created" ||
    key === "request submitted"
  ) {
    return { icon: "📝", title: "Request Submitted" };
  }

  if (key.includes("ai analysis") || key === "ai_analysis") {
    return { icon: "🤖", title: "AI Analysis Completed" };
  }

  if (key.includes("department")) {
    return { icon: "🏢", title: "Assigned to Department" };
  }

  if (
    key.includes("employee assigned") ||
    key.includes("technician assigned") ||
    key.includes("assigned to")
  ) {
    return { icon: "👷", title: "Technician Assigned" };
  }

  if (key.includes("photo")) {
    return { icon: "📷", title: "Photos Uploaded" };
  }

  if (key.includes("comment")) {
    return { icon: "💬", title: "Comment Added" };
  }

  const statusEvent = mapStatusEvent(eventType);

  if (statusEvent) {
    return statusEvent;
  }

  return null;
}

export function mapTaskHistoryRow(row: TaskHistoryRow): TimelineEvent {
  const eventKey =
    row.event_type ||
    row.action ||
    row.event ||
    row.description ||
    row.details ||
    row.new_status ||
    "";

  const mapped = mapEventType(String(eventKey));

  if (!mapped && row.new_status) {
    const statusMapped = mapStatusEvent(row.new_status);

    if (statusMapped) {
      const parts = formatTimelineParts(row.created_at);

      return {
        id: String(row.id),
        icon: statusMapped.icon,
        title: statusMapped.title,
        date: parts.date,
        time: parts.time,
        sortAt: parts.sortAt,
      };
    }
  }

  if (
    !mapped &&
    (row.old_department || row.new_department) &&
    row.old_department !== row.new_department
  ) {
    const parts = formatTimelineParts(row.created_at);

    return {
      id: String(row.id),
      icon: "🏢",
      title: "Assigned to Department",
      date: parts.date,
      time: parts.time,
      sortAt: parts.sortAt,
    };
  }

  const parts = formatTimelineParts(row.created_at);
  const fallback = mapped || { icon: "•", title: String(eventKey || "Update") };

  return {
    id: String(row.id),
    icon: fallback.icon,
    title: fallback.title,
    date: parts.date,
    time: parts.time,
    sortAt: parts.sortAt,
  };
}

export function mapTaskHistoryRows(rows: TaskHistoryRow[]): TimelineEvent[] {
  return rows
    .map(mapTaskHistoryRow)
    .sort((a, b) => b.sortAt - a.sortAt);
}
