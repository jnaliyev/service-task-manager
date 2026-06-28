import { NextResponse } from "next/server";
import { filterTasksForAccess } from "@/lib/clientPortals/clientUserAccess";
import { loadClientPortalTasks } from "@/lib/clientPortals/loadClientPortalTasks";
import { resolveClientUser } from "@/lib/clientPortals/resolveClientUser";

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

    const { access, companyName } = resolved.context;

    const data = await loadClientPortalTasks(companyName, access);
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
