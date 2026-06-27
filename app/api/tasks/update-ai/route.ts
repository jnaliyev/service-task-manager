import { NextResponse } from "next/server";
import { updateTaskAi } from "@/lib/tasks/updateTaskAi";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const taskId = Number(payload.task_id);

    if (!Number.isFinite(taskId) || taskId <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid task_id" },
        { status: 400 }
      );
    }

    if (
      !payload.ai_category ||
      !payload.ai_priority ||
      !payload.ai_summary ||
      payload.ai_confidence === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required AI fields" },
        { status: 400 }
      );
    }

    const data = await updateTaskAi(taskId, {
      ai_category: payload.ai_category,
      ai_priority: payload.ai_priority,
      ai_summary: payload.ai_summary,
      ai_confidence: Number(payload.ai_confidence),
    });

    return NextResponse.json({
      success: true,
      task: data,
    });
  } catch (error) {
    console.error("Update task AI API error:", error);

    return NextResponse.json(
      { error: "Error while saving AI analysis" },
      { status: 500 }
    );
  }
}
