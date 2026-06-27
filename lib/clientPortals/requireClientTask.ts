import { NextResponse } from "next/server";
import type { ClientUserRecord } from "@/lib/clientPortals/clientUserAccess";
import type { ClientUserAccess } from "@/lib/clientPortals/clientUserAccess";
import { resolveClientUser } from "@/lib/clientPortals/resolveClientUser";
import type { ClientPortalRecord } from "@/app/client/types/portal";
import {
  type ClientTaskRecord,
  verifyClientTaskAccess,
} from "@/lib/clientPortals/verifyClientTask";

export async function requireClientTask(
  request: Request,
  slug: string,
  taskId: number,
  select = "*"
): Promise<
  | {
      error: null;
      task: ClientTaskRecord;
      access: ClientUserAccess;
      portal: ClientPortalRecord;
      user: ClientUserRecord;
    }
  | {
      error: NextResponse;
      task: null;
      access: null;
      portal: null;
      user: null;
    }
> {
  const resolved = await resolveClientUser(request, slug);

  if (resolved.error) {
    return {
      error: resolved.error,
      task: null,
      access: null,
      portal: null,
      user: null,
    };
  }

  const { portal, user, access } = resolved.context;
  const { task } = await verifyClientTaskAccess(
    slug,
    taskId,
    select,
    access
  );

  if (!portal) {
    return {
      error: NextResponse.json({ error: "Portal not found" }, { status: 404 }),
      task: null,
      access: null,
      portal: null,
      user: null,
    };
  }

  if (!task) {
    return {
      error: NextResponse.json({ error: "Request not found" }, { status: 404 }),
      task: null,
      access: null,
      portal: null,
      user: null,
    };
  }

  return { error: null, task, access, portal, user };
}
