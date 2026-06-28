import { NextResponse } from "next/server";
import {
  extractRawClientId,
  parseNumericClientId,
} from "@/lib/clientPortals/parseClientId";
import {
  createClientPortalUser,
  getClientPortalAccessInfo,
} from "@/lib/clientPortals/generateClientPortalAccess";
import {
  deleteClientPortalUser,
  resetClientPortalUserPassword,
  updateClientPortalUser,
} from "@/lib/clientPortals/portalUserManagement";
import { mapPortalUserError } from "@/lib/clientPortals/portalAccessErrors";
import { getPortalWriteClient } from "@/lib/clientPortals/getPortalWriteClient";

function parseUserId(payload: { userId?: unknown; id?: unknown }) {
  const raw = payload.userId ?? payload.id;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

async function loadClientRecord(clientId: number | string) {
  const supabase = getPortalWriteClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, client_name, company_name, logo_url")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return { supabase, client };
}

export async function POST(request: Request) {
  let payload: {
    clientId?: unknown;
    id?: unknown;
    client_id?: unknown;
    fullName?: unknown;
    username?: unknown;
    storeIds?: unknown;
  } = {};

  try {
    payload = (await request.json()) as typeof payload;
    const clientId = parseNumericClientId(extractRawClientId(payload));

    if (clientId == null) {
      return NextResponse.json(
        { error: "A numeric clientId is required" },
        { status: 400 }
      );
    }

    const fullName =
      typeof payload.fullName === "string" ? payload.fullName.trim() : "";

    if (!fullName) {
      return NextResponse.json({ error: "User name is required" }, { status: 400 });
    }

    const storeIds = Array.isArray(payload.storeIds)
      ? payload.storeIds
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
      : [];

    const { supabase, client } = await loadClientRecord(clientId);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const resolvedClientId = String(client.id);

    const user = await createClientPortalUser(supabase, {
      clientId: resolvedClientId,
      fullName,
      username:
        typeof payload.username === "string" ? payload.username.trim() : undefined,
      storeIds,
    });

    const clientName =
      client.client_name?.trim() || client.company_name?.trim() || "";
    const logoUrl = client.logo_url?.trim() || null;

    const portal = await getClientPortalAccessInfo(
      supabase,
      resolvedClientId,
      clientName,
      logoUrl
    );

    return NextResponse.json({ user, portal });
  } catch (error) {
    console.error("[portal-users] POST error:", { payload, error });

    return NextResponse.json(
      { error: mapPortalUserError(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  let payload: {
    clientId?: unknown;
    userId?: unknown;
    fullName?: unknown;
    storeIds?: unknown;
  } = {};

  try {
    payload = (await request.json()) as typeof payload;
    const clientId = parseNumericClientId(extractRawClientId(payload));
    const userId = parseUserId(payload);

    if (clientId == null || !userId) {
      return NextResponse.json(
        { error: "clientId and userId are required" },
        { status: 400 }
      );
    }

    const fullName =
      typeof payload.fullName === "string" ? payload.fullName.trim() : "";

    if (!fullName) {
      return NextResponse.json({ error: "User name is required" }, { status: 400 });
    }

    const storeIds = Array.isArray(payload.storeIds)
      ? payload.storeIds
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
      : [];

    const { supabase, client } = await loadClientRecord(clientId);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const resolvedClientId = String(client.id);

    const user = await updateClientPortalUser(supabase, {
      clientId: resolvedClientId,
      userId,
      fullName,
      storeIds,
    });

    const clientName =
      client.client_name?.trim() || client.company_name?.trim() || "";
    const logoUrl = client.logo_url?.trim() || null;

    const portal = await getClientPortalAccessInfo(
      supabase,
      resolvedClientId,
      clientName,
      logoUrl
    );

    return NextResponse.json({ user, portal });
  } catch (error) {
    console.error("[portal-users] PATCH error:", { payload, error });

    return NextResponse.json(
      { error: mapPortalUserError(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  let payload: {
    clientId?: unknown;
    userId?: unknown;
  } = {};

  try {
    payload = (await request.json()) as typeof payload;
    const clientId = parseNumericClientId(extractRawClientId(payload));
    const userId = parseUserId(payload);

    if (clientId == null || !userId) {
      return NextResponse.json(
        { error: "clientId and userId are required" },
        { status: 400 }
      );
    }

    const { supabase, client } = await loadClientRecord(clientId);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const resolvedClientId = String(client.id);

    await deleteClientPortalUser(supabase, {
      clientId: resolvedClientId,
      userId,
    });

    const clientName =
      client.client_name?.trim() || client.company_name?.trim() || "";
    const logoUrl = client.logo_url?.trim() || null;

    const portal = await getClientPortalAccessInfo(
      supabase,
      resolvedClientId,
      clientName,
      logoUrl
    );

    return NextResponse.json({ portal });
  } catch (error) {
    console.error("[portal-users] DELETE error:", { payload, error });

    return NextResponse.json(
      { error: mapPortalUserError(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  let payload: {
    clientId?: unknown;
    userId?: unknown;
  } = {};

  try {
    payload = (await request.json()) as typeof payload;
    const clientId = parseNumericClientId(extractRawClientId(payload));
    const userId = parseUserId(payload);

    if (clientId == null || !userId) {
      return NextResponse.json(
        { error: "clientId and userId are required" },
        { status: 400 }
      );
    }

    const { supabase, client } = await loadClientRecord(clientId);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const resolvedClientId = String(client.id);

    const user = await resetClientPortalUserPassword(supabase, {
      clientId: resolvedClientId,
      userId,
    });

    const clientName =
      client.client_name?.trim() || client.company_name?.trim() || "";
    const logoUrl = client.logo_url?.trim() || null;

    const portal = await getClientPortalAccessInfo(
      supabase,
      resolvedClientId,
      clientName,
      logoUrl
    );

    return NextResponse.json({ user, portal });
  } catch (error) {
    console.error("[portal-users] PUT error:", { payload, error });

    return NextResponse.json(
      { error: mapPortalUserError(error) },
      { status: 500 }
    );
  }
}
