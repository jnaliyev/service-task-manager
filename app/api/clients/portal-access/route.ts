import { NextResponse } from "next/server";
import {
  extractRawClientId,
  parseNumericClientId,
} from "@/lib/clientPortals/parseClientId";
import {
  generateClientPortalAccess,
  getClientPortalAccessInfo,
} from "@/lib/clientPortals/generateClientPortalAccess";
import { deduplicateClientPortals } from "@/lib/clientPortals/deduplicateClientPortals";
import { mapPortalUserError } from "@/lib/clientPortals/portalAccessErrors";
import { getPortalWriteClient } from "@/lib/clientPortals/getPortalWriteClient";

async function loadClientById(clientId: number | string) {
  const supabase = getPortalWriteClient();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError) {
    throw clientError;
  }

  return { supabase, client };
}

function getClientName(client: Record<string, unknown>) {
  return (
    (typeof client.client_name === "string" ? client.client_name.trim() : "") ||
    (typeof client.company_name === "string" ? client.company_name.trim() : "")
  );
}

function getClientLogoUrl(client: Record<string, unknown>) {
  return typeof client.logo_url === "string" && client.logo_url.trim()
    ? client.logo_url.trim()
    : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawClientId = searchParams.get("clientId");
    const clientId = parseNumericClientId(rawClientId);

    if (clientId == null) {
      return NextResponse.json(
        { error: "A numeric clientId is required" },
        { status: 400 }
      );
    }

    const { supabase, client } = await loadClientById(clientId);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const resolvedClientId = String(client.id);
    const clientName = getClientName(client);
    const logoUrl = getClientLogoUrl(client);

    await deduplicateClientPortals(supabase, resolvedClientId, clientName);

    const info = await getClientPortalAccessInfo(
      supabase,
      resolvedClientId,
      clientName,
      logoUrl
    );

    if (!info) {
      return NextResponse.json({ error: "Portal not configured" }, { status: 404 });
    }

    return NextResponse.json(info);
  } catch (error) {
    console.error("[portal-access] GET error:", error);

    return NextResponse.json(
      { error: mapPortalUserError(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let payload: {
    clientId?: unknown;
    id?: unknown;
    client_id?: unknown;
  } = {};

  try {
    payload = (await request.json()) as typeof payload;
    const rawClientId = extractRawClientId(payload);
    const clientId = parseNumericClientId(rawClientId);

    if (clientId == null) {
      console.error("[portal-access] Invalid client id in payload:", payload);
      return NextResponse.json(
        { error: "A numeric clientId is required" },
        { status: 400 }
      );
    }

    const { supabase, client } = await loadClientById(clientId);

    if (!client) {
      console.error("[portal-access] Client not found:", {
        payload,
        clientId,
        lookup: `select * from clients where id = ${clientId}`,
      });

      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const clientName = getClientName(client);

    if (!clientName) {
      return NextResponse.json(
        { error: "Client name is required to generate portal access" },
        { status: 400 }
      );
    }

    const resolvedClientId =
      typeof client.id === "number" || typeof client.id === "string"
        ? String(client.id)
        : String(clientId);

    await deduplicateClientPortals(supabase, resolvedClientId, clientName);

    const result = await generateClientPortalAccess(supabase, {
      clientId: resolvedClientId,
      clientName,
      contactPerson:
        typeof client.contact_person === "string" ? client.contact_person : null,
      email: typeof client.email === "string" ? client.email : null,
      logoUrl: getClientLogoUrl(client),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[portal-access] POST error:", { payload, error });

    return NextResponse.json(
      { error: mapPortalUserError(error) },
      { status: 500 }
    );
  }
}
