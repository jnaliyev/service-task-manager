import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { filterTasksForAccess } from "@/lib/clientPortals/clientUserAccess";
import { resolveClientUser } from "@/lib/clientPortals/resolveClientUser";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const resolved = await resolveClientUser(request, slug);

    if (resolved.error) {
      return resolved.error;
    }

    const { portal, access } = resolved.context;

    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, store, store_id, location, issue, status, department, category, priority, created_at, attachments, company_name"
      )
      .eq("company_name", portal.company_name)
      .like("created_by", "Client Portal%")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Client portal requests API error:", error);
      return NextResponse.json(
        { error: "Error while loading requests" },
        { status: 500 }
      );
    }

    const requests = filterTasksForAccess(data || [], access);

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Client portal requests API error:", error);

    return NextResponse.json(
      { error: "Error while loading requests" },
      { status: 500 }
    );
  }
}
