import { createClient } from "@supabase/supabase-js";
import type { Store } from "@/app/client/types/store";
import type { ClientPortalRecord } from "@/app/client/types/portal";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const portalSelect =
  "id, slug, company_name, store_id, token, active, created_at, client_id";

export async function getClientPortalBySlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();

  console.log("[client_portals] lookup slug:", normalizedSlug);

  const { data, error } = await supabase
    .from("client_portals")
    .select(portalSelect)
    .ilike("slug", normalizedSlug)
    .eq("active", true)
    .maybeSingle();

  console.log("[client_portals] query result:", data);
  console.log("[client_portals] query error:", error);

  if (!data && !error) {
    const inactiveLookup = await supabase
      .from("client_portals")
      .select("slug, active")
      .ilike("slug", normalizedSlug);

    console.log(
      "[client_portals] inactive-or-missing lookup result:",
      inactiveLookup.data
    );
    console.log(
      "[client_portals] inactive-or-missing lookup error:",
      inactiveLookup.error
    );
  }

  if (error) {
    console.log("[client_portals] maybeSingle error details:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    const { data: rows, error: rowsError } = await supabase
      .from("client_portals")
      .select(portalSelect)
      .ilike("slug", normalizedSlug)
      .eq("active", true)
      .limit(2);

    console.log("[client_portals] fallback rows result:", rows);
    console.log("[client_portals] fallback rows error:", rowsError);

    if (rowsError) {
      throw rowsError;
    }

    if (rows && rows.length === 1) {
      return rows[0] as ClientPortalRecord;
    }

    throw error;
  }

  return data as ClientPortalRecord | null;
}

export async function getCompanyStores(companyName: string) {
  const { data, error } = await supabase
    .from("stores")
    .select("id, company_name, store_name, location, store_code, client_id")
    .eq("company_name", companyName)
    .order("store_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((store) => (store.store_name || "").trim() !== "") as Store[];
}

export async function getClientStores(clientId: string) {
  const { data, error } = await supabase
    .from("stores")
    .select("id, company_name, store_name, location, store_code, client_id")
    .eq("client_id", clientId)
    .order("store_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((store) => (store.store_name || "").trim() !== "") as Store[];
}

export async function resolvePortalCompanyName(portal: ClientPortalRecord) {
  const branding = await resolvePortalClientBranding(portal);
  return branding.companyName;
}

export async function resolvePortalClientBranding(portal: ClientPortalRecord) {
  if (portal.client_id) {
    const { data: client, error } = await supabase
      .from("clients")
      .select("client_name, company_name, logo_url")
      .eq("id", portal.client_id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const companyName =
      client?.client_name?.trim() ||
      client?.company_name?.trim() ||
      portal.company_name;

    return {
      companyName,
      logoUrl: client?.logo_url?.trim() || null,
    };
  }

  return {
    companyName: portal.company_name,
    logoUrl: null,
  };
}

export async function getPortalStores(portal: ClientPortalRecord) {
  if (portal.client_id) {
    return getClientStores(String(portal.client_id));
  }

  return getCompanyStores(portal.company_name);
}

export async function getClientPortalContext(slug: string) {
  const portal = await getClientPortalBySlug(slug);

  if (!portal) {
    console.log(
      "[client_portals] getClientPortalContext returned null for slug:",
      slug
    );
    return null;
  }

  const [stores, branding] = await Promise.all([
    getPortalStores(portal),
    resolvePortalClientBranding(portal),
  ]);

  return {
    portal,
    stores,
    companyName: branding.companyName,
    logoUrl: branding.logoUrl,
  };
}
