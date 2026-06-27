import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireClientTask } from "@/lib/clientPortals/requireClientTask";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type RouteContext = {
  params: Promise<{ slug: string; id: string }>;
};

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

    const { data, error } = await supabase
      .from("task_history")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Client portal request history API error:", error);
      return NextResponse.json(
        { error: "Error while loading timeline" },
        { status: 500 }
      );
    }

    return NextResponse.json({ history: data || [] });
  } catch (error) {
    console.error("Client portal request history API error:", error);

    return NextResponse.json(
      { error: "Error while loading timeline" },
      { status: 500 }
    );
  }
}
