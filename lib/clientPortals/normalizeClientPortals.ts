import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deduplicateClientPortals,
  hasNumericSlugSuffix,
  stripNumericSlugSuffix,
  type ClientPortalRow,
  type ClientPortalSummary,
} from "@/lib/clientPortals/deduplicateClientPortals";
import { slugifyClientName } from "@/lib/clientPortals/slugifyClientName";

async function resolveClientIdForPortal(
  supabase: SupabaseClient,
  portal: Pick<ClientPortalRow, "client_id" | "company_name" | "slug">
): Promise<string | null> {
  if (portal.client_id != null) {
    return String(portal.client_id);
  }

  const companyName = (portal.company_name || "").trim();

  if (companyName) {
    const { data: byClientName, error: byClientNameError } = await supabase
      .from("clients")
      .select("id, client_name, company_name")
      .ilike("client_name", companyName)
      .limit(1);

    if (byClientNameError) {
      throw byClientNameError;
    }

    if (byClientName?.[0]) {
      return String(byClientName[0].id);
    }

    const { data: byCompanyName, error: byCompanyNameError } = await supabase
      .from("clients")
      .select("id, client_name, company_name")
      .ilike("company_name", companyName)
      .limit(1);

    if (byCompanyNameError) {
      throw byCompanyNameError;
    }

    if (byCompanyName?.[0]) {
      return String(byCompanyName[0].id);
    }
  }

  const baseSlug = stripNumericSlugSuffix(portal.slug);
  const { data: allClients, error: allClientsError } = await supabase
    .from("clients")
    .select("id, client_name, company_name");

  if (allClientsError) {
    throw allClientsError;
  }

  const matchedBySlug = (allClients || []).find((client) => {
    const name = client.client_name?.trim() || client.company_name?.trim() || "";
    return slugifyClientName(name) === baseSlug;
  });

  return matchedBySlug ? String(matchedBySlug.id) : null;
}

async function loadClientPortalSummaries(
  supabase: SupabaseClient
): Promise<ClientPortalSummary[]> {
  const { data, error } = await supabase
    .from("client_portals")
    .select("id, slug, active, client_id")
    .not("client_id", "is", null);

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((portal) => portal.client_id != null)
    .map((portal) => ({
      id: String(portal.id),
      slug: portal.slug,
      active: Boolean(portal.active),
      client_id: String(portal.client_id),
    }));
}

export async function normalizePortalsWithNumericSuffixes(
  supabase: SupabaseClient
): Promise<ClientPortalSummary[]> {
  const { data: allPortals, error } = await supabase
    .from("client_portals")
    .select("id, slug, client_id, company_name, active, created_at");

  if (error) {
    throw error;
  }

  const normalizedClientIds = new Set<string>();
  const slugFamilies = new Map<string, ClientPortalRow[]>();

  for (const portal of allPortals || []) {
    const baseSlug = stripNumericSlugSuffix(portal.slug);

    if (!slugFamilies.has(baseSlug)) {
      slugFamilies.set(baseSlug, []);
    }

    slugFamilies.get(baseSlug)!.push(portal as ClientPortalRow);

    if (hasNumericSlugSuffix(portal.slug)) {
      const resolvedClientId = await resolveClientIdForPortal(
        supabase,
        portal as ClientPortalRow
      );

      if (resolvedClientId) {
        normalizedClientIds.add(resolvedClientId);
      }
    }
  }

  for (const [, portals] of slugFamilies.entries()) {
    const baseSlug = stripNumericSlugSuffix(portals[0]?.slug || "");

    if (portals.length > 1 || portals.some((portal) => portal.slug !== baseSlug)) {
      for (const portal of portals) {
        const resolvedClientId = await resolveClientIdForPortal(
          supabase,
          portal
        );

        if (resolvedClientId) {
          normalizedClientIds.add(resolvedClientId);
        }
      }
    }
  }

  const groupedByClient = new Map<string, ClientPortalRow[]>();

  for (const portal of allPortals || []) {
    if (!portal.client_id) continue;

    const clientId = String(portal.client_id);

    if (!groupedByClient.has(clientId)) {
      groupedByClient.set(clientId, []);
    }

    groupedByClient.get(clientId)!.push(portal as ClientPortalRow);
  }

  for (const [clientId, portals] of groupedByClient.entries()) {
    if (portals.length > 1) {
      normalizedClientIds.add(clientId);
    }
  }

  for (const clientId of normalizedClientIds) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, client_name, company_name")
      .eq("id", clientId)
      .maybeSingle();

    if (clientError) {
      throw clientError;
    }

    const clientName =
      client?.client_name?.trim() || client?.company_name?.trim() || undefined;

    await deduplicateClientPortals(supabase, clientId, clientName);
  }

  return loadClientPortalSummaries(supabase);
}
