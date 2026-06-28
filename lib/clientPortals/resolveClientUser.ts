import { NextResponse } from "next/server";
import type { Store } from "@/app/client/types/store";
import {
  filterStoresForAccess,
  getClientUserAccess,
  type ClientUserAccess,
  type ClientUserRecord,
} from "@/lib/clientPortals/clientUserAccess";
import { loadClientUserAssignedStoreIds } from "@/lib/clientPortals/clientUserStores";
import {
  getClientPortalBySlug,
  getPortalStores,
  resolvePortalCompanyName,
} from "@/lib/clientPortals/getClientPortal";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { getClientPortalUserById } from "@/lib/clientPortals/validateClientLogin";

export type ResolvedClientUserContext = {
  portal: NonNullable<Awaited<ReturnType<typeof getClientPortalBySlug>>>;
  user: ClientUserRecord;
  stores: Store[];
  access: ClientUserAccess;
  companyName: string;
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

  const [allStores, companyName] = await Promise.all([
    getPortalStores(portal),
    resolvePortalCompanyName(portal),
  ]);

  const admin = getSupabaseAdminClient();
  const assignedStoreIds = admin
    ? await loadClientUserAssignedStoreIds(admin, user.id)
    : [];

  const portalContext = {
    ...portal,
    company_name: companyName,
  };

  const access = getClientUserAccess(user, portalContext, allStores, assignedStoreIds);
  const stores = filterStoresForAccess(allStores, access);

  return {
    context: {
      portal,
      user,
      stores,
      access,
      companyName,
    },
    error: null,
  };
}

export async function resolveLoginStoreIds(user: {
  id: string;
  accessLevel: "company" | "stores";
  storeIds: number[];
}): Promise<number[]> {
  const admin = getSupabaseAdminClient();

  if (admin) {
    const assignedStoreIds = await loadClientUserAssignedStoreIds(admin, user.id);

    if (assignedStoreIds.length > 0) {
      return assignedStoreIds;
    }
  }

  if (user.accessLevel === "stores" && user.storeIds.length > 0) {
    return user.storeIds;
  }

  return [];
}
