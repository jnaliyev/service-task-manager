import { NextResponse } from "next/server";
import { requireClientTask } from "@/lib/clientPortals/requireClientTask";

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

    const result = await requireClientTask(request, slug, taskId, "id");

    if (result.error) {
      return result.error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[messages] mark read failed:", error);

    return NextResponse.json({ success: true });
  }
}
