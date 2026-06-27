import { createClient } from "@supabase/supabase-js";
import type { ClientUserRecord } from "@/lib/clientPortals/clientUserAccess";
import {
  findDemoClientUser,
  findDemoClientUserById,
  filterDemoStoreIds,
  getDemoClientUserId,
  type DemoClientUserDefinition,
} from "@/lib/clientPortals/demoClientUsers";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import {
  normalizeClientAccessLevel,
  normalizeClientUserStoreIds,
} from "@/lib/clientPortals/clientUserAccess";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type RpcLoginUser = {
  id: string;
  client_portal_id: string;
  full_name: string;
  username: string;
  email: string;
  role: string;
  access_level: string;
  store_ids: unknown;
};

export type ValidatedClientLoginUser = {
  id: string;
  clientPortalId: string;
  fullName: string;
  username: string;
  role: string;
  accessLevel: ReturnType<typeof normalizeClientAccessLevel>;
  storeIds: number[];
};

function mapRpcUser(row: RpcLoginUser): ValidatedClientLoginUser {
  const accessLevel = normalizeClientAccessLevel(row.access_level);

  return {
    id: row.id,
    clientPortalId: row.client_portal_id,
    fullName: row.full_name,
    username: row.username,
    role: row.role,
    accessLevel,
    storeIds:
      accessLevel === "stores"
        ? normalizeClientUserStoreIds(row.store_ids)
        : [],
  };
}

function isMissingSchemaError(code?: string) {
  return code === "PGRST202" || code === "PGRST205";
}

async function validateWithRpc(
  slug: string,
  username: string,
  password: string
) {
  const { data, error } = await supabase.rpc("validate_client_portal_login", {
    p_portal_slug: slug,
    p_username: username,
    p_password: password,
  });

  if (error) {
    return {
      user: null,
      error,
      missingSchema: isMissingSchemaError(error.code),
    };
  }

  const row = (data as RpcLoginUser[] | null)?.[0];

  return {
    user: row ? mapRpcUser(row) : null,
    error: null,
    missingSchema: false,
  };
}

async function validateWithAdminQuery(
  slug: string,
  username: string,
  password: string
) {
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return null;
  }

  const { data: portal, error: portalError } = await admin
    .from("client_portals")
    .select("id, slug, active")
    .ilike("slug", slug.trim().toLowerCase())
    .eq("active", true)
    .maybeSingle();

  if (portalError || !portal) {
    return null;
  }

  const { data: users, error: userError } = await admin
    .from("client_users")
    .select(
      "id, client_portal_id, full_name, username, email, role, access_level, store_ids, password, active"
    )
    .eq("client_portal_id", portal.id)
    .eq("active", true)
    .ilike("username", username.trim());

  if (userError || !users?.length) {
    return null;
  }

  const matched = users.find(
    (user) =>
      typeof user.password === "string" &&
      user.password === password &&
      user.username?.trim().toLowerCase() === username.trim().toLowerCase()
  );

  if (!matched) {
    return null;
  }

  return mapRpcUser({
    id: matched.id,
    client_portal_id: matched.client_portal_id,
    full_name: matched.full_name,
    username: matched.username || matched.email,
    email: matched.email,
    role: matched.role,
    access_level: matched.access_level,
    store_ids: matched.store_ids,
  });
}

async function resolveDemoStoreIds(
  companyName: string,
  storeScope: DemoClientUserDefinition["storeScope"]
) {
  if (storeScope.type === "company") {
    return [];
  }

  const { data: stores } = await supabase
    .from("stores")
    .select("id, store_name")
    .eq("company_name", companyName);

  return (stores || [])
    .filter((store) => filterDemoStoreIds(store.store_name, storeScope))
    .map((store) => Number(store.id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

async function validateWithDemoUsers(
  slug: string,
  username: string,
  password: string,
  portalId: string,
  companyName: string
) {
  const demoUser = findDemoClientUser(slug, username, password);

  if (!demoUser) {
    return null;
  }

  const storeIds =
    demoUser.accessLevel === "stores"
      ? await resolveDemoStoreIds(companyName, demoUser.storeScope)
      : [];

  return {
    id: getDemoClientUserId(demoUser.username),
    clientPortalId: portalId,
    fullName: demoUser.fullName,
    username: demoUser.username,
    role: demoUser.role,
    accessLevel: demoUser.accessLevel,
    storeIds,
  } satisfies ValidatedClientLoginUser;
}

export async function validateClientLogin(
  slug: string,
  username: string,
  password: string,
  portal?: { id: string; company_name: string } | null
): Promise<
  | { user: ValidatedClientLoginUser; error: null }
  | { user: null; error: { message: string; code?: string } }
> {
  const normalizedSlug = slug.trim().toLowerCase();
  const normalizedUsername = username.trim();
  const normalizedPassword = password.trim();

  let rpcResult = await validateWithRpc(
    normalizedSlug,
    normalizedUsername,
    normalizedPassword
  );

  if (rpcResult.user) {
    return { user: rpcResult.user, error: null };
  }

  if (rpcResult.error && !rpcResult.missingSchema) {
    return {
      user: null,
      error: {
        message: rpcResult.error.message,
        code: rpcResult.error.code,
      },
    };
  }

  const adminUser = await validateWithAdminQuery(
    normalizedSlug,
    normalizedUsername,
    normalizedPassword
  );

  if (adminUser) {
    return { user: adminUser, error: null };
  }

  if (portal) {
    const demoUser = await validateWithDemoUsers(
      normalizedSlug,
      normalizedUsername,
      normalizedPassword,
      portal.id,
      portal.company_name
    );

    if (demoUser) {
      if (rpcResult.missingSchema) {
        console.warn(
          "[client auth] using demo user fallback; apply supabase/apply_client_auth.sql"
        );
      }

      return { user: demoUser, error: null };
    }
  }

  return {
    user: null,
    error: rpcResult.error
      ? {
          message: rpcResult.error.message,
          code: rpcResult.error.code,
        }
      : { message: "Invalid username or password" },
  };
}

export async function getClientPortalUserById(
  slug: string,
  userId: string
): Promise<ClientUserRecord | null> {
  const normalizedSlug = slug.trim().toLowerCase();

  const { data, error } = await supabase.rpc("get_client_portal_user", {
    p_portal_slug: normalizedSlug,
    p_user_id: userId,
  });

  if (!error) {
    const row = (data as RpcLoginUser[] | null)?.[0];

    if (row) {
      return {
        id: row.id,
        client_portal_id: row.client_portal_id,
        full_name: row.full_name,
        username: row.username || row.email,
        email: row.email,
        role: row.role,
        access_level: normalizeClientAccessLevel(row.access_level),
        store_ids: normalizeClientUserStoreIds(row.store_ids),
        active: true,
        created_at: "",
      };
    }
  } else if (!isMissingSchemaError(error.code)) {
    console.error("[client auth] get_client_portal_user failed:", error);
    return null;
  }

  const admin = getSupabaseAdminClient();

  let portal:
    | { id: string; company_name: string }
    | null
    | undefined = null;

  if (admin) {
    const { data } = await admin
      .from("client_portals")
      .select("id, company_name")
      .ilike("slug", normalizedSlug)
      .eq("active", true)
      .maybeSingle();

    portal = data;
  }

  if (!portal) {
    const { data } = await supabase
      .from("client_portals")
      .select("id, company_name")
      .ilike("slug", normalizedSlug)
      .eq("active", true)
      .maybeSingle();

    portal = data;
  }

  if (!portal) {
    return null;
  }

  if (admin) {
    const { data: user } = await admin
      .from("client_users")
      .select(
        "id, client_portal_id, full_name, username, email, role, access_level, store_ids, active, created_at"
      )
      .eq("id", userId)
      .eq("client_portal_id", portal.id)
      .eq("active", true)
      .maybeSingle();

    if (user) {
      return {
        id: user.id,
        client_portal_id: user.client_portal_id,
        full_name: user.full_name,
        username: user.username || user.email,
        email: user.email,
        role: user.role,
        access_level: normalizeClientAccessLevel(user.access_level),
        store_ids: normalizeClientUserStoreIds(user.store_ids),
        active: user.active,
        created_at: user.created_at || "",
      };
    }
  }

  const demoUser = findDemoClientUserById(normalizedSlug, userId);

  if (!demoUser) {
    return null;
  }

  const storeIds =
    demoUser.accessLevel === "stores"
      ? await resolveDemoStoreIds(portal.company_name, demoUser.storeScope)
      : [];

  return {
    id: getDemoClientUserId(demoUser.username),
    client_portal_id: portal.id,
    full_name: demoUser.fullName,
    username: demoUser.username,
    email: demoUser.email,
    role: demoUser.role,
    access_level: demoUser.accessLevel,
    store_ids: storeIds,
    active: true,
    created_at: "",
  };
}
