import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildCommentPayload,
  insertTaskComment,
  loadTaskComments,
  mapTaskCommentToMessage,
} from "@/lib/messages/taskCommentsAdapter";
import { requireClientTask } from "@/lib/clientPortals/requireClientTask";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type RouteContext = {
  params: Promise<{ slug: string; id: string }>;
};

function normalizeAttachments(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== ""
  );
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug, id } = await context.params;
    const taskId = Number(id);

    if (!Number.isFinite(taskId) || taskId <= 0) {
      return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
    }

    const result = await requireClientTask(request, slug, taskId, "id");

    if (result.error) {
      return result.error;
    }

    const { data, error } = await loadTaskComments(supabase, taskId);

    if (error) {
      console.error("[messages] load failed:", error);

      return NextResponse.json({
        messages: [],
        unreadCount: 0,
        loadError: true,
      });
    }

    const messages = (data || []).map((row) => mapTaskCommentToMessage(row));

    return NextResponse.json({
      messages,
      unreadCount: 0,
    });
  } catch (error) {
    console.error("[messages] load failed:", error);

    return NextResponse.json({
      messages: [],
      unreadCount: 0,
      loadError: true,
    });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug, id } = await context.params;
    const taskId = Number(id);

    if (!Number.isFinite(taskId) || taskId <= 0) {
      return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
    }

    const result = await requireClientTask(request, slug, taskId, "id");

    if (result.error) {
      return result.error;
    }

    const portal = result.portal;

    const body = (await request.json()) as {
      body?: string;
      attachments?: string[];
    };

    const messageBody = body.body?.trim() || "";
    const attachments = normalizeAttachments(body.attachments);

    if (!messageBody && attachments.length === 0) {
      return NextResponse.json({ error: "Message is empty" }, { status: 400 });
    }

    const senderName = `Client Portal - ${portal.company_name} (${result.user.full_name}, ${result.user.username || result.user.email})`;

    const { data, error } = await insertTaskComment(supabase, {
      task_id: taskId,
      author: senderName,
      comment: buildCommentPayload(messageBody, attachments),
    });

    if (error) {
      console.error("[messages] send failed:", error);
      throw error;
    }

    return NextResponse.json({
      message: mapTaskCommentToMessage(data),
    });
  } catch (error) {
    console.error("[messages] send failed:", error);

    return NextResponse.json(
      { error: "Error while sending message" },
      { status: 500 }
    );
  }
}
