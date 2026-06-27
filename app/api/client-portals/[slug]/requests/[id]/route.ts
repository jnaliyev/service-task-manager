import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireClientTask } from "@/lib/clientPortals/requireClientTask";
import { getClientRequestPermissions } from "@/lib/clientPortals/verifyClientTask";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type RouteContext = {
  params: Promise<{ slug: string; id: string }>;
};

function parseAttachments(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== ""
  );
}

const TASK_SELECT =
  "id, store, store_id, location, issue, client_description, status, department, category, priority, created_at, attachments, company_name, technician";

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug, id } = await context.params;
    const taskId = Number(id);

    if (!Number.isFinite(taskId) || taskId <= 0) {
      return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
    }

    const result = await requireClientTask(request, slug, taskId, TASK_SELECT);

    if (result.error) {
      return result.error;
    }

    return NextResponse.json({
      request: result.task,
      permissions: getClientRequestPermissions(result.task),
    });
  } catch (error) {
    console.error("Client portal request detail API error:", error);

    return NextResponse.json(
      { error: "Error while loading request" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { slug, id } = await context.params;
    const taskId = Number(id);

    if (!Number.isFinite(taskId) || taskId <= 0) {
      return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
    }

    const result = await requireClientTask(request, slug, taskId);

    if (result.error) {
      return result.error;
    }

    const task = result.task;
    const permissions = getClientRequestPermissions(task);
    const body = (await request.json()) as {
      issue?: string;
      client_description?: string;
      attachments?: string[];
      cancel?: boolean;
    };

    if (body.cancel) {
      if (!permissions.canCancel) {
        return NextResponse.json({ error: "Request cannot be cancelled" }, { status: 403 });
      }

      const { error } = await supabase
        .from("tasks")
        .update({ status: "Cancelled" })
        .eq("id", taskId);

      if (error) {
        throw error;
      }

      return NextResponse.json({ success: true });
    }

    if (!permissions.canEdit) {
      return NextResponse.json({ error: "Request cannot be edited" }, { status: 403 });
    }

    const issue = body.issue?.trim();
    const clientDescription = body.client_description?.trim();

    if (!issue) {
      return NextResponse.json({ error: "Issue is required" }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      issue,
      client_description: clientDescription || issue,
    };

    if (Array.isArray(body.attachments)) {
      updatePayload.attachments = parseAttachments(body.attachments);
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", taskId)
      .select(TASK_SELECT)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      request: data,
      permissions: getClientRequestPermissions(data),
    });
  } catch (error) {
    console.error("Client portal request update API error:", error);

    return NextResponse.json(
      { error: "Error while updating request" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { slug, id } = await context.params;
    const taskId = Number(id);

    if (!Number.isFinite(taskId) || taskId <= 0) {
      return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
    }

    const result = await requireClientTask(request, slug, taskId);

    if (result.error) {
      return result.error;
    }

    const permissions = getClientRequestPermissions(result.task);

    if (!permissions.canDelete) {
      return NextResponse.json({ error: "Request cannot be deleted" }, { status: 403 });
    }

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Client portal request delete API error:", error);

    return NextResponse.json(
      { error: "Error while deleting request" },
      { status: 500 }
    );
  }
}
