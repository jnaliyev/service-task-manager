import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPortalUrl } from "@/lib/clientPortals/getAppBaseUrl";
import {
  getPrimaryPortalForClient,
  resolvePortalSlugForNewClient,
} from "@/lib/clientPortals/deduplicateClientPortals";
import {
  loadAssignedStoreIdsByUserIds,
  replaceClientUserAssignedStores,
} from "@/lib/clientPortals/clientUserStores";
import { generatePortalPassword } from "@/lib/clientPortals/portalPassword";

export type PortalAccessUser = {
  id: string;
  fullName: string;
  username: string;
  password: string;
  storeIds: number[];
};

export type ClientPortalAccessInfo = {
  portalId: string;
  slug: string;
  portalUrl: string;
  active: boolean;
  users: PortalAccessUser[];
  username: string;
  password: string;
  clientName: string;
  logoUrl: string | null;
  createdPortal: boolean;
  createdUser: boolean;
};

export type GenerateClientPortalAccessInput = {
  clientId: string;
  clientName: string;
  contactPerson?: string | null;
  email?: string | null;
  logoUrl?: string | null;
};

async function loadPortalUsers(
  supabase: SupabaseClient,
  portalId: string
): Promise<PortalAccessUser[]> {
  const { data, error } = await supabase
    .from("client_users")
    .select("id, full_name, username, password, active")
    .eq("client_portal_id", portalId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const userIds = (data || []).map((user) => String(user.id));
  const assignedByUserId = await loadAssignedStoreIdsByUserIds(supabase, userIds);

  return (data || []).map((user) => ({
    id: String(user.id),
    fullName: user.full_name,
    username: user.username || "",
    password: user.password || "",
    storeIds: assignedByUserId[String(user.id)] || [],
  }));
}

function withPrimaryUserCredentials(
  info: Omit<ClientPortalAccessInfo, "username" | "password">
): ClientPortalAccessInfo {
  const primaryUser = info.users[0];

  return {
    ...info,
    username: primaryUser?.username || "",
    password: primaryUser?.password || "",
  };
}

async function buildPortalAccessInfo(
  supabase: SupabaseClient,
  portal: { id: string; slug: string; active: boolean },
  clientName: string,
  logoUrl: string | null,
  flags: { createdPortal: boolean; createdUser: boolean }
): Promise<ClientPortalAccessInfo> {
  const users = await loadPortalUsers(supabase, portal.id);

  return withPrimaryUserCredentials({
    portalId: portal.id,
    slug: portal.slug,
    portalUrl: buildPortalUrl(portal.slug),
    active: Boolean(portal.active),
    users,
    clientName,
    logoUrl,
    createdPortal: flags.createdPortal,
    createdUser: flags.createdUser,
  });
}

export async function getClientPortalAccessInfo(
  supabase: SupabaseClient,
  clientId: string,
  clientName?: string,
  logoUrl?: string | null
): Promise<ClientPortalAccessInfo | null> {
  const primaryPortal = await getPrimaryPortalForClient(
    supabase,
    clientId,
    clientName
  );

  if (!primaryPortal) {
    return null;
  }

  const resolvedName = clientName || primaryPortal.company_name;

  return buildPortalAccessInfo(
    supabase,
    primaryPortal,
    resolvedName,
    logoUrl ?? null,
    { createdPortal: false, createdUser: false }
  );
}

export async function generateClientPortalAccess(
  supabase: SupabaseClient,
  input: GenerateClientPortalAccessInput
): Promise<ClientPortalAccessInfo> {
  const clientName = input.clientName.trim();

  if (!clientName) {
    throw new Error("Client name is required");
  }

  const existingInfo = await getClientPortalAccessInfo(
    supabase,
    input.clientId,
    clientName,
    input.logoUrl ?? null
  );

  if (existingInfo) {
    return {
      ...existingInfo,
      createdPortal: false,
      createdUser: false,
    };
  }

  const slug = await resolvePortalSlugForNewClient(
    supabase,
    input.clientId,
    clientName
  );

  const { data: createdPortalRow, error: createPortalError } = await supabase
    .from("client_portals")
    .insert({
      slug,
      company_name: clientName,
      client_id: input.clientId,
      active: true,
    })
    .select("id, slug, active")
    .single();

  if (createPortalError) {
    if (createPortalError.code === "23505") {
      const recovered = await getClientPortalAccessInfo(
        supabase,
        input.clientId,
        clientName,
        input.logoUrl ?? null
      );

      if (recovered) {
        return recovered;
      }

      throw new Error("Portal already exists.");
    }

    throw createPortalError;
  }

  const portalSlug = createdPortalRow.slug;
  const username = `${portalSlug}_portal`;
  const password = generatePortalPassword();
  const contactName = input.contactPerson?.trim() || `${clientName} Portal`;
  const email =
    input.email?.trim() ||
    `${portalSlug.replace(/[^a-z0-9-]/g, "")}@portal.local`;

  const { error: createUserError } = await supabase.from("client_users").insert({
    client_portal_id: createdPortalRow.id,
    client_id: input.clientId,
    full_name: contactName,
    email,
    username,
    password,
    role: "manager",
    access_level: "company",
    store_ids: [],
    active: true,
  });

  if (createUserError) {
    throw createUserError;
  }

  return buildPortalAccessInfo(
    supabase,
    createdPortalRow,
    clientName,
    input.logoUrl ?? null,
    { createdPortal: true, createdUser: true }
  );
}

export async function createClientPortalUser(
  supabase: SupabaseClient,
  input: {
    clientId: string;
    fullName: string;
    username?: string;
    storeIds?: number[];
  }
): Promise<PortalAccessUser> {
  const portalInfo = await getClientPortalAccessInfo(supabase, input.clientId);

  if (!portalInfo) {
    throw new Error("Portal access must be created before adding users");
  }

  const fullName = input.fullName.trim();

  if (!fullName) {
    throw new Error("User name is required");
  }

  const usernameBase =
    input.username?.trim() ||
    `${portalInfo.slug}-${fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

  let username = usernameBase;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase
      .from("client_users")
      .select("id")
      .eq("client_portal_id", portalInfo.portalId)
      .ilike("username", username)
      .limit(1);

    if (error) {
      throw error;
    }

    if (!data?.length) {
      break;
    }

    username = `${usernameBase}-${suffix}`;
    suffix += 1;
  }

  const password = generatePortalPassword();
  const email = `${username.replace(/[^a-z0-9-]/g, "")}@portal.local`;

  const { data: createdUser, error: createUserError } = await supabase
    .from("client_users")
    .insert({
      client_portal_id: portalInfo.portalId,
      client_id: input.clientId,
      full_name: fullName,
      email,
      username,
      password,
      role: "user",
      access_level: input.storeIds?.length ? "stores" : "company",
      store_ids: input.storeIds || [],
      active: true,
    })
    .select("id, full_name, username, password")
    .single();

  if (createUserError) {
    throw createUserError;
  }

  if (input.storeIds?.length) {
    await replaceClientUserAssignedStores(
      supabase,
      createdUser.id,
      input.storeIds
    );
  }

  const assignedByUserId = await loadAssignedStoreIdsByUserIds(supabase, [
    createdUser.id,
  ]);

  return {
    id: createdUser.id,
    fullName: createdUser.full_name,
    username: createdUser.username || username,
    password: createdUser.password || password,
    storeIds: assignedByUserId[createdUser.id] || [],
  };
}
