import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestMessage } from "@/lib/messages/requestMessages";

export const MESSAGES_TABLE = "task_comments";

export type TaskCommentRow = {
  id: number | string;
  task_id: number | string;
  comment: string;
  author: string;
  created_at?: string | null;
};

function inferSenderType(author: string): "client" | "erp" {
  return author.trim().startsWith("Client Portal") ? "client" : "erp";
}

export function splitCommentBodyAndAttachments(comment: string): {
  body: string;
  attachments: string[];
} {
  const attachments: string[] = [];
  const bodyLines: string[] = [];

  for (const line of comment.split("\n")) {
    const trimmed = line.trim();

    if (/^https?:\/\//i.test(trimmed)) {
      attachments.push(trimmed);
      continue;
    }

    bodyLines.push(line);
  }

  return {
    body: bodyLines.join("\n").trim(),
    attachments,
  };
}

export function buildCommentPayload(body: string, attachments: string[] = []) {
  return [body.trim(), ...attachments.filter(Boolean)].filter(Boolean).join("\n");
}

export function mapTaskCommentToMessage(row: TaskCommentRow): RequestMessage {
  const { body, attachments } = splitCommentBodyAndAttachments(row.comment || "");

  return {
    id: Number(row.id),
    task_id: Number(row.task_id),
    sender_name: row.author || "Unknown",
    sender_type: inferSenderType(row.author || ""),
    body,
    attachments,
    created_at: row.created_at || new Date().toISOString(),
  };
}

export async function loadTaskComments(
  supabase: SupabaseClient,
  taskId: number
) {
  return supabase
    .from(MESSAGES_TABLE)
    .select("id, task_id, comment, author, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
}

export async function insertTaskComment(
  supabase: SupabaseClient,
  payload: {
    task_id: number;
    comment: string;
    author: string;
  }
) {
  return supabase
    .from(MESSAGES_TABLE)
    .insert([
      {
        task_id: payload.task_id,
        comment: payload.comment,
        author: payload.author,
      },
    ])
    .select("id, task_id, comment, author, created_at")
    .single();
}
