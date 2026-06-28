import type { SupabaseClient } from "@supabase/supabase-js";

type StoreOwnershipRow = {
  id: number;
  company_name: string | null;
  client_id: number | string | null;
};

type ClientRow = {
  id: number | string;
  client_name: string | null;
  company_name: string | null;
  client_code: string | null;
};

export type RestoreClientAssignmentsResult = {
  createdClients: number;
  assignedStores: number;
  companyCount: number;
};

function normalizeClientId(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function parseClientId(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function generateClientCode(companyName: string, existingCodes: Set<string>) {
  const base =
    companyName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "CLIENT";

  let code = base;
  let suffix = 1;

  while (existingCodes.has(code)) {
    code = `${base}_${suffix}`;
    suffix += 1;
  }

  existingCodes.add(code);
  return code;
}

function getClientLookupName(client: ClientRow) {
  return (client.client_name || client.company_name || "").trim().toLowerCase();
}

export async function restoreClientAssignmentsFromCompanyName(
  supabase: SupabaseClient
): Promise<RestoreClientAssignmentsResult> {
  const { data: storeRows, error: storesError } = await supabase
    .from("stores")
    .select("id, company_name, client_id");

  if (storesError) {
    throw storesError;
  }

  const companyNames = new Map<string, string>();

  for (const store of (storeRows || []) as StoreOwnershipRow[]) {
    const companyName = (store.company_name || "").trim();
    if (!companyName) continue;

    const key = companyName.toLowerCase();
    if (!companyNames.has(key)) {
      companyNames.set(key, companyName);
    }
  }

  const { data: existingClients, error: clientsError } = await supabase
    .from("clients")
    .select("id, client_name, company_name, client_code");

  if (clientsError) {
    throw clientsError;
  }

  const clientIdByCompany = new Map<string, number>();
  const usedCodes = new Set<string>();

  for (const client of (existingClients || []) as ClientRow[]) {
    const lookupName = getClientLookupName(client);
    const clientId = parseClientId(normalizeClientId(client.id));

    if (lookupName && clientId) {
      clientIdByCompany.set(lookupName, clientId);
    }

    const code = (client.client_code || "").trim().toUpperCase();
    if (code) usedCodes.add(code);
  }

  let createdClients = 0;

  for (const [key, companyName] of companyNames) {
    if (clientIdByCompany.has(key)) continue;

    const clientCode = generateClientCode(companyName, usedCodes);
    const { data: newClient, error: insertError } = await supabase
      .from("clients")
      .insert([
        {
          client_code: clientCode,
          client_name: companyName,
          company_name: companyName,
          status: "Active",
        },
      ])
      .select("id")
      .single();

    if (insertError || !newClient) {
      console.error(insertError);
      throw insertError ?? new Error(`Failed to create client for "${companyName}"`);
    }

    const clientId = parseClientId(normalizeClientId(newClient.id));
    if (!clientId) {
      throw new Error(`Invalid client id for "${companyName}"`);
    }

    clientIdByCompany.set(key, clientId);
    createdClients += 1;
  }

  let assignedStores = 0;

  for (const [key, companyName] of companyNames) {
    const clientId = clientIdByCompany.get(key);
    if (!clientId) continue;

    const storeIds = ((storeRows || []) as StoreOwnershipRow[])
      .filter((store) => (store.company_name || "").trim().toLowerCase() === key)
      .map((store) => store.id);

    if (storeIds.length === 0) continue;

    const { error: updateError } = await supabase
      .from("stores")
      .update({ client_id: clientId })
      .in("id", storeIds);

    if (updateError) {
      console.error(updateError);
      throw updateError;
    }

    assignedStores += storeIds.length;
  }

  return {
    createdClients,
    assignedStores,
    companyCount: companyNames.size,
  };
}
