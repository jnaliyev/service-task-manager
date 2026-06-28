import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadAssignedStoreIdsByUserIds,
  replaceClientUserAssignedStores,
} from "@/lib/clientPortals/clientUserStores";
import { getClientPortalAccessInfo } from "@/lib/clientPortals/generateClientPortalAccess";
import { generatePortalPassword } from "@/lib/clientPortals/portalPassword";

export { generatePortalPassword } from "@/lib/clientPortals/portalPassword";

export async function updateClientPortalUser(
  supabase: SupabaseClient,
  input: {
    clientId: string;
    userId: string;
    fullName: string;
    storeIds: number[];
  }
) {
  const portalInfo = await getClientPortalAccessInfo(supabase, input.clientId);

  if (!portalInfo) {
    throw new Error("Portal access is not configured for this client.");
  }

  const fullName = input.fullName.trim();

  if (!fullName) {
    throw new Error("User name is required.");
  }

  const { data: user, error: userError } = await supabase
    .from("client_users")
    .select("id")
    .eq("id", input.userId)
    .eq("client_portal_id", portalInfo.portalId)
    .eq("active", true)
    .maybeSingle();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Portal user not found.");
  }

  const { error: updateError } = await supabase
    .from("client_users")
    .update({
      full_name: fullName,
      access_level: input.storeIds.length ? "stores" : "company",
      store_ids: input.storeIds,
    })
    .eq("id", input.userId);

  if (updateError) {
    throw updateError;
  }

  await replaceClientUserAssignedStores(supabase, input.userId, input.storeIds);

  const assignedByUserId = await loadAssignedStoreIdsByUserIds(supabase, [
    input.userId,
  ]);

  const { data: updatedUser, error: reloadError } = await supabase
    .from("client_users")
    .select("id, full_name, username, password")
    .eq("id", input.userId)
    .single();

  if (reloadError) {
    throw reloadError;
  }

  return {
    id: updatedUser.id,
    fullName: updatedUser.full_name,
    username: updatedUser.username || "",
    password: updatedUser.password || "",
    storeIds: assignedByUserId[input.userId] || [],
  };
}

export async function deleteClientPortalUser(
  supabase: SupabaseClient,
  input: {
    clientId: string;
    userId: string;
  }
) {
  const portalInfo = await getClientPortalAccessInfo(supabase, input.clientId);

  if (!portalInfo) {
    throw new Error("Portal access is not configured for this client.");
  }

  if (portalInfo.users.length <= 1) {
    throw new Error("This portal must always have at least one user.");
  }

  const { data: user, error: userError } = await supabase
    .from("client_users")
    .select("id")
    .eq("id", input.userId)
    .eq("client_portal_id", portalInfo.portalId)
    .eq("active", true)
    .maybeSingle();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Portal user not found.");
  }

  const { error: deleteStoresError } = await supabase
    .from("client_user_stores")
    .delete()
    .eq("client_user_id", input.userId);

  if (deleteStoresError && deleteStoresError.code !== "PGRST205") {
    throw deleteStoresError;
  }

  const { error: deleteError } = await supabase
    .from("client_users")
    .delete()
    .eq("id", input.userId);

  if (deleteError) {
    throw deleteError;
  }
}

export async function resetClientPortalUserPassword(
  supabase: SupabaseClient,
  input: {
    clientId: string;
    userId: string;
  }
) {
  const portalInfo = await getClientPortalAccessInfo(supabase, input.clientId);

  if (!portalInfo) {
    throw new Error("Portal access is not configured for this client.");
  }

  const { data: user, error: userError } = await supabase
    .from("client_users")
    .select("id, username")
    .eq("id", input.userId)
    .eq("client_portal_id", portalInfo.portalId)
    .eq("active", true)
    .maybeSingle();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Portal user not found.");
  }

  const password = generatePortalPassword();

  const { error: updateError } = await supabase
    .from("client_users")
    .update({ password })
    .eq("id", input.userId);

  if (updateError) {
    throw new Error("Unable to reset password.");
  }

  const assignedByUserId = await loadAssignedStoreIdsByUserIds(supabase, [
    input.userId,
  ]);

  const existingUser = portalInfo.users.find((item) => item.id === input.userId);

  return {
    id: input.userId,
    fullName: existingUser?.fullName || "",
    username: user.username || existingUser?.username || "",
    password,
    storeIds: assignedByUserId[input.userId] || existingUser?.storeIds || [],
  };
}
