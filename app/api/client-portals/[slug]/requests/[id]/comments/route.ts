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

export async function POST(request: Request, context: RouteContext) {
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

    if (!permissions.canComment) {
      return NextResponse.json({ error: "Comments are not allowed" }, { status: 403 });
    }

    const body = (await request.json()) as { comment?: string };
    const comment = body.comment?.trim();

    if (!comment) {
      return NextResponse.json({ error: "Comment is required" }, { status: 400 });
    }

    const author = `Client Portal - ${result.portal.company_name} (${result.user.full_name}, ${result.user.username || result.user.email})`;

    const { error } = await supabase.from("task_comments").insert([
      {
        task_id: taskId,
        comment,
        author,
      },
    ]);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Client portal request comment API error:", error);

    return NextResponse.json(
      { error: "Error while adding comment" },
      { status: 500 }
    );
  }
}
