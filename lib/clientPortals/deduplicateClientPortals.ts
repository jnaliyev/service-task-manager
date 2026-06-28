import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadClientUserAssignedStoreIds,
  replaceClientUserAssignedStores,
} from "@/lib/clientPortals/clientUserStores";
import { slugifyClientName } from "@/lib/clientPortals/slugifyClientName";

export type ClientPortalRow = {
  id: string;
  slug: string;
  active: boolean;
  created_at: string;
  client_id: string | number | null;
  company_name: string;
};

export type ClientPortalSummary = {
  id: string;
  slug: string;
  active: boolean;
  client_id: string;
};

const NUMERIC_SUFFIX_PATTERN = /-\d+$/;
const PORTAL_SELECT =
  "id, slug, active, created_at, client_id, company_name";

export function stripNumericSlugSuffix(slug: string): string {
  return slug.replace(NUMERIC_SUFFIX_PATTERN, "");
}

export function hasNumericSlugSuffix(slug: string): boolean {
  return NUMERIC_SUFFIX_PATTERN.test(slug);
}

function sameClientId(
  left: string | number | null | undefined,
  right: string | number | null | undefined
) {
  if (left == null || right == null) return false;
  return String(left) === String(right);
}

export function resolveCanonicalBaseSlug(
  clientName: string | undefined,
  portals: ClientPortalRow[]
): string {
  const fromName = clientName ? slugifyClientName(clientName) : "";

  if (fromName) {
    return fromName;
  }

  if (portals.length > 0) {
    return stripNumericSlugSuffix(portals[0].slug);
  }

  return "";
}

function sortPortalsOldestFirst(portals: ClientPortalRow[]) {
  return [...portals].sort(
    (left, right) =>
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );
}

function pickPrimaryPortal(portals: ClientPortalRow[], baseSlug: string) {
  const exactMatch = portals.find((portal) => portal.slug === baseSlug);

  if (exactMatch) {
    return exactMatch;
  }

  const withoutSuffix = portals.filter(
    (portal) => !hasNumericSlugSuffix(portal.slug)
  );

  if (withoutSuffix.length > 0) {
    return sortPortalsOldestFirst(withoutSuffix)[0];
  }

  return sortPortalsOldestFirst(portals)[0];
}

async function loadPortalById(
  supabase: SupabaseClient,
  portalId: string
): Promise<ClientPortalRow | null> {
  const { data, error } = await supabase
    .from("client_portals")
    .select(PORTAL_SELECT)
    .eq("id", portalId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ClientPortalRow | null) || null;
}

export async function findPortalsForClient(
  supabase: SupabaseClient,
  clientId: string,
  clientName?: string
): Promise<ClientPortalRow[]> {
  const seen = new Map<string, ClientPortalRow>();
  const normalizedName = clientName?.trim();
  const baseSlug = normalizedName ? slugifyClientName(normalizedName) : "";

  function addRows(rows: ClientPortalRow[] | null | undefined) {
    for (const row of rows || []) {
      if (!seen.has(row.id)) {
        seen.set(row.id, row);
      }
    }
  }

  const { data: byClientId, error: byClientIdError } = await supabase
    .from("client_portals")
    .select(PORTAL_SELECT)
    .eq("client_id", clientId);

  if (byClientIdError) {
    throw byClientIdError;
  }

  addRows(byClientId as ClientPortalRow[]);

  if (normalizedName) {
    const { data: byCompany, error: byCompanyError } = await supabase
      .from("client_portals")
      .select(PORTAL_SELECT)
      .ilike("company_name", normalizedName);

    if (byCompanyError) {
      throw byCompanyError;
    }

    addRows(byCompany as ClientPortalRow[]);
  }

  if (baseSlug) {
    const { data: bySlug, error: bySlugError } = await supabase
      .from("client_portals")
      .select(PORTAL_SELECT)
      .or(`slug.eq.${baseSlug},slug.like.${baseSlug}-%`);

    if (bySlugError) {
      throw bySlugError;
    }

    addRows(bySlug as ClientPortalRow[]);
  }

  return sortPortalsOldestFirst(Array.from(seen.values()));
}

async function mergeUserStoreAssignments(
  supabase: SupabaseClient,
  targetUserId: string,
  sourceUserId: string
) {
  const [targetStoreIds, sourceStoreIds] = await Promise.all([
    loadClientUserAssignedStoreIds(supabase, targetUserId),
    loadClientUserAssignedStoreIds(supabase, sourceUserId),
  ]);

  const mergedStoreIds = [...new Set([...targetStoreIds, ...sourceStoreIds])];

  await replaceClientUserAssignedStores(supabase, targetUserId, mergedStoreIds);
}

async function mergeUserPermissions(
  supabase: SupabaseClient,
  targetUserId: string,
  sourceUser: {
    access_level?: string | null;
    role?: string | null;
    store_ids?: unknown;
  }
) {
  const { data: targetUser, error: targetUserError } = await supabase
    .from("client_users")
    .select("access_level, role, store_ids")
    .eq("id", targetUserId)
    .maybeSingle();

  if (targetUserError) {
    throw targetUserError;
  }

  if (!targetUser) {
    return;
  }

  const sourceAccess = (sourceUser.access_level || "").trim().toLowerCase();
  const targetAccess = (targetUser.access_level || "").trim().toLowerCase();
  const nextAccessLevel =
    sourceAccess === "company" || targetAccess === "company"
      ? "company"
      : "stores";

  const sourceRole = (sourceUser.role || "").trim().toLowerCase();
  const targetRole = (targetUser.role || "").trim().toLowerCase();
  const nextRole =
    sourceRole === "manager" || targetRole === "manager" ? "manager" : "user";

  const legacyStoreIds = Array.isArray(targetUser.store_ids)
    ? targetUser.store_ids
    : Array.isArray(sourceUser.store_ids)
      ? sourceUser.store_ids
      : [];

  const { error: updateError } = await supabase
    .from("client_users")
    .update({
      access_level: nextAccessLevel,
      role: nextRole,
      store_ids: legacyStoreIds,
    })
    .eq("id", targetUserId);

  if (updateError) {
    throw updateError;
  }
}

async function migrateUsersToPrimaryPortal(
  supabase: SupabaseClient,
  primaryPortalId: string,
  duplicatePortalId: string,
  clientId: string
) {
  const [{ data: duplicateUsers, error: duplicateUsersError }, { data: primaryUsers, error: primaryUsersError }] =
    await Promise.all([
      supabase
        .from("client_users")
        .select("id, username, access_level, role, store_ids")
        .eq("client_portal_id", duplicatePortalId),
      supabase
        .from("client_users")
        .select("id, username")
        .eq("client_portal_id", primaryPortalId),
    ]);

  if (duplicateUsersError) {
    throw duplicateUsersError;
  }

  if (primaryUsersError) {
    throw primaryUsersError;
  }

  const primaryUsernameMap = new Map<string, string>();

  for (const user of primaryUsers || []) {
    const username = (user.username || "").trim().toLowerCase();

    if (username) {
      primaryUsernameMap.set(username, user.id);
    }
  }

  for (const duplicateUser of duplicateUsers || []) {
    const username = (duplicateUser.username || "").trim().toLowerCase();
    const existingPrimaryUserId = username
      ? primaryUsernameMap.get(username)
      : undefined;

    if (existingPrimaryUserId) {
      await mergeUserStoreAssignments(
        supabase,
        existingPrimaryUserId,
        duplicateUser.id
      );
      await mergeUserPermissions(
        supabase,
        existingPrimaryUserId,
        duplicateUser
      );

      const { error: deleteUserError } = await supabase
        .from("client_users")
        .delete()
        .eq("id", duplicateUser.id);

      if (deleteUserError) {
        throw deleteUserError;
      }

      continue;
    }

    const { error: moveUserError } = await supabase
      .from("client_users")
      .update({
        client_portal_id: primaryPortalId,
        client_id: clientId,
      })
      .eq("id", duplicateUser.id);

    if (moveUserError) {
      throw moveUserError;
    }

    if (username) {
      primaryUsernameMap.set(username, duplicateUser.id);
    }
  }
}

async function clearPortalClientId(
  supabase: SupabaseClient,
  portalId: string
) {
  const { error } = await supabase
    .from("client_portals")
    .update({ client_id: null })
    .eq("id", portalId);

  if (error) {
    throw error;
  }
}

async function deletePortal(
  supabase: SupabaseClient,
  portalId: string
) {
  const { error } = await supabase
    .from("client_portals")
    .delete()
    .eq("id", portalId);

  if (error) {
    throw error;
  }
}

async function renamePortalToCanonicalSlug(
  supabase: SupabaseClient,
  portalId: string,
  baseSlug: string,
  portalsToDelete: Set<string>
) {
  const { data: conflict, error: conflictError } = await supabase
    .from("client_portals")
    .select("id")
    .eq("slug", baseSlug)
    .neq("id", portalId)
    .maybeSingle();

  if (conflictError) {
    throw conflictError;
  }

  if (conflict) {
    if (portalsToDelete.has(conflict.id)) {
      await deletePortal(supabase, conflict.id);
    } else {
      throw new Error(
        `Cannot rename portal to "${baseSlug}" because another portal already uses that slug.`
      );
    }
  }

  const { error: renameError } = await supabase
    .from("client_portals")
    .update({ slug: baseSlug })
    .eq("id", portalId);

  if (renameError) {
    throw renameError;
  }
}

export async function deduplicateClientPortals(
  supabase: SupabaseClient,
  clientId: string,
  clientName?: string
): Promise<ClientPortalRow | null> {
  const portals = await findPortalsForClient(supabase, clientId, clientName);

  if (portals.length === 0) {
    return null;
  }

  const baseSlug = resolveCanonicalBaseSlug(clientName, portals);

  if (!baseSlug) {
    return loadPortalById(supabase, portals[0].id);
  }

  const primary = pickPrimaryPortal(portals, baseSlug);
  const duplicates = portals.filter((portal) => portal.id !== primary.id);
  const duplicateIds = new Set(duplicates.map((portal) => portal.id));

  for (const duplicate of duplicates) {
    await migrateUsersToPrimaryPortal(
      supabase,
      primary.id,
      duplicate.id,
      clientId
    );
  }

  for (const duplicate of duplicates) {
    if (sameClientId(duplicate.client_id, clientId)) {
      await clearPortalClientId(supabase, duplicate.id);
    }
  }

  const { error: linkPrimaryError } = await supabase
    .from("client_portals")
    .update({
      client_id: clientId,
      company_name: clientName?.trim() || primary.company_name,
      active: true,
    })
    .eq("id", primary.id);

  if (linkPrimaryError) {
    throw linkPrimaryError;
  }

  for (const duplicate of duplicates) {
    await deletePortal(supabase, duplicate.id);
  }

  const refreshedPrimary = await loadPortalById(supabase, primary.id);

  if (!refreshedPrimary) {
    return null;
  }

  if (refreshedPrimary.slug !== baseSlug) {
    await renamePortalToCanonicalSlug(
      supabase,
      refreshedPrimary.id,
      baseSlug,
      duplicateIds
    );
  }

  return loadPortalById(supabase, primary.id);
}

export async function getPrimaryPortalForClient(
  supabase: SupabaseClient,
  clientId: string,
  clientName?: string
): Promise<ClientPortalRow | null> {
  const { data: linkedPortal, error: linkedPortalError } = await supabase
    .from("client_portals")
    .select(PORTAL_SELECT)
    .eq("client_id", clientId)
    .maybeSingle();

  if (linkedPortalError) {
    throw linkedPortalError;
  }

  if (linkedPortal) {
    return linkedPortal as ClientPortalRow;
  }

  const portals = await findPortalsForClient(supabase, clientId, clientName);

  return portals[0] || null;
}

export async function resolvePortalSlugForNewClient(
  supabase: SupabaseClient,
  clientId: string,
  clientName: string
): Promise<string> {
  const existing = await getPrimaryPortalForClient(supabase, clientId, clientName);

  if (existing) {
    return existing.slug;
  }

  const baseSlug = slugifyClientName(clientName);

  if (!baseSlug) {
    throw new Error("Client name cannot produce a valid portal slug");
  }

  const { data: slugOwner, error: slugOwnerError } = await supabase
    .from("client_portals")
    .select("id, client_id, slug")
    .eq("slug", baseSlug)
    .maybeSingle();

  if (slugOwnerError) {
    throw slugOwnerError;
  }

  if (slugOwner && String(slugOwner.client_id || "") !== String(clientId)) {
    throw new Error("Portal already exists for another client with this slug.");
  }

  return baseSlug;
}
