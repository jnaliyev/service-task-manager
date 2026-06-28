import { NextResponse } from "next/server";
import { getClientPortalContext } from "@/lib/clientPortals/getClientPortal";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const portalContext = await getClientPortalContext(slug);

    if (!portalContext) {
      console.log("[client_portals] Portal not found", {
        slug,
        portalContext,
      });
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    const { portal, stores, companyName, logoUrl } = portalContext;

    return NextResponse.json({
      portal: {
        slug: portal.slug,
        companyName,
        clientId: portal.client_id ?? null,
        logoUrl,
      },
      stores,
    });
  } catch (error) {
    console.error("Client portal API error:", error);

    return NextResponse.json(
      { error: "Error while loading client portal" },
      { status: 500 }
    );
  }
}
