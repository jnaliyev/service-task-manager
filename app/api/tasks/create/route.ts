import { NextResponse } from "next/server";
import { createTask } from "@/lib/tasks/createTask";

export async function POST(request: Request) {
  console.log("[API /api/tasks/create] reached");

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
    console.error("Create task Supabase error:", error);

    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : undefined;

    return NextResponse.json(
      {
        error: "Error while creating task",
        ...(isDevelopment && errorMessage ? { message: errorMessage } : {}),
      },
      { status: 500 }
    );
  }
}
