import { NextResponse } from "next/server";
import type { Store } from "@/app/client/types/store";
import {
  getClientUserAccess,
  type ClientUserAccess,
  type ClientUserRecord,
} from "@/lib/clientPortals/clientUserAccess";
import {
  getClientPortalBySlug,
  getCompanyStores,
} from "@/lib/clientPortals/getClientPortal";
import { getClientPortalUserById } from "@/lib/clientPortals/validateClientLogin";

export type ResolvedClientUserContext = {
  portal: NonNullable<Awaited<ReturnType<typeof getClientPortalBySlug>>>;
  user: ClientUserRecord;
  stores: Store[];
  access: ClientUserAccess;
};

export async function resolveClientUser(
  request: Request,
  slug: string
): Promise<
  | { context: ResolvedClientUserContext; error: null }
  | { context: null; error: NextResponse }
> {
  const userId = request.headers.get("X-Client-User-Id")?.trim();

  if (!userId) {
    return {
      context: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const portal = await getClientPortalBySlug(slug);

  if (!portal) {
    return {
      context: null,
      error: NextResponse.json({ error: "Portal not found" }, { status: 404 }),
    };
  }

  const user = await getClientPortalUserById(slug, userId);

  if (!user) {
    return {
      context: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const stores = await getCompanyStores(portal.company_name);
  const access = getClientUserAccess(user, portal, stores);

  return {
    context: {
      portal,
      user,
      stores,
      access,
    },
    error: null,
  };
}
