import { NextResponse } from "next/server";
import { createTask } from "@/lib/tasks/createTask";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (!payload.store || !payload.issue || !payload.created_by) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const data = await createTask(payload);

    return NextResponse.json({
      success: true,
      task: data,
    });
  } catch (error) {
    console.error("Create task API error:", error);

    return NextResponse.json(
      { error: "Error while creating task" },
      { status: 500 }
    );
  }
}
