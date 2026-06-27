import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireClientTask } from "@/lib/clientPortals/requireClientTask";
import { getClientRequestPermissions } from "@/lib/clientPortals/verifyClientTask";
import { getAttachmentUrls } from "@/app/client/utils/requestDisplay";

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

    if (!permissions.canUploadPhoto) {
      return NextResponse.json(
        { error: "Additional photos are not allowed" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { photoUrl?: string };
    const photoUrl = body.photoUrl?.trim();

    if (!photoUrl || !/^https?:\/\//i.test(photoUrl)) {
      return NextResponse.json({ error: "Invalid photo URL" }, { status: 400 });
    }

    const currentAttachments = getAttachmentUrls(result.task.attachments);
    const nextAttachments = [...currentAttachments, photoUrl];

    const { data, error } = await supabase
      .from("tasks")
      .update({ attachments: nextAttachments })
      .eq("id", taskId)
      .select(
        "id, store, location, issue, client_description, status, department, category, priority, created_at, attachments, company_name, technician"
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      request: data,
      permissions: getClientRequestPermissions(data),
    });
  } catch (error) {
    console.error("Client portal request photo API error:", error);

    return NextResponse.json(
      { error: "Error while uploading photo" },
      { status: 500 }
    );
  }
}
