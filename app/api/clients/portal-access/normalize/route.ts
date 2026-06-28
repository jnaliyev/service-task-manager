import { NextResponse } from "next/server";
import { normalizePortalsWithNumericSuffixes } from "@/lib/clientPortals/normalizeClientPortals";
import { mapPortalUserError } from "@/lib/clientPortals/portalAccessErrors";
import { getPortalWriteClient } from "@/lib/clientPortals/getPortalWriteClient";

export async function POST() {
  try {
    const supabase = getPortalWriteClient();
    const portals = await normalizePortalsWithNumericSuffixes(supabase);

    return NextResponse.json({
      success: true,
      portals,
    });
  } catch (error) {
    console.error("[portal-access/normalize] error:", error);

    return NextResponse.json(
      { error: mapPortalUserError(error) },
      { status: 500 }
    );
  }
}
