import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizeStoreIdList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);
}

export async function loadClientUserAssignedStoreIds(
  supabase: SupabaseClient,
  clientUserId: string
): Promise<number[]> {
  const { data, error } = await supabase
    .from("client_user_stores")
    .select("store_id")
    .eq("client_user_id", clientUserId);

  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") {
      return [];
    }

    throw error;
  }

  return normalizeStoreIdList((data || []).map((row) => row.store_id));
}

export async function loadAssignedStoreIdsByUserIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Record<string, number[]>> {
  if (userIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("client_user_stores")
    .select("client_user_id, store_id")
    .in("client_user_id", userIds);

  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") {
      return {};
    }

    throw error;
  }

  const map: Record<string, number[]> = {};

  for (const row of data || []) {
    const userId = String(row.client_user_id);
    const storeId = Number(row.store_id);

    if (!Number.isFinite(storeId) || storeId <= 0) continue;

    if (!map[userId]) {
      map[userId] = [];
    }

    map[userId].push(storeId);
  }

  for (const userId of Object.keys(map)) {
    map[userId] = [...new Set(map[userId])].sort((a, b) => a - b);
  }

  return map;
}

export async function replaceClientUserAssignedStores(
  supabase: SupabaseClient,
  clientUserId: string,
  storeIds: number[]
): Promise<void> {
  const normalizedStoreIds = [...new Set(normalizeStoreIdList(storeIds))];

  const { error: deleteError } = await supabase
    .from("client_user_stores")
    .delete()
    .eq("client_user_id", clientUserId);

  if (deleteError) {
    throw deleteError;
  }

  if (normalizedStoreIds.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from("client_user_stores").insert(
    normalizedStoreIds.map((storeId) => ({
      client_user_id: clientUserId,
      store_id: storeId,
    }))
  );

  if (insertError) {
    throw insertError;
  }
}

export function resolveEffectiveStoreIds(
  assignedStoreIds: number[],
  legacyAccessLevel: string,
  legacyStoreIds: number[]
): number[] {
  if (assignedStoreIds.length > 0) {
    return assignedStoreIds;
  }

  if (legacyAccessLevel === "stores" && legacyStoreIds.length > 0) {
    return legacyStoreIds;
  }

  return [];
}
