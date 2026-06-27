import { createClient } from "@supabase/supabase-js";
import type { Store } from "@/app/client/components/RequestForm";
import type { ClientPortalRecord } from "@/app/client/types/portal";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getClientPortalBySlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();

  console.log("[client_portals] lookup slug:", normalizedSlug);

  const { data, error } = await supabase
    .from("client_portals")
    .select("id, slug, company_name, store_id, token, active, created_at")
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
      .select("id, slug, company_name, store_id, token, active, created_at")
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
    .select("id, company_name, store_name, location, store_code")
    .eq("company_name", companyName)
    .order("store_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((store) => (store.store_name || "").trim() !== "") as Store[];
}

export async function getClientPortalContext(slug: string) {
  const portal = await getClientPortalBySlug(slug);

  if (!portal) {
    console.log("[client_portals] getClientPortalContext returned null for slug:", slug);
    return null;
  }

  const stores = await getCompanyStores(portal.company_name);

  return {
    portal,
    stores,
  };
}
