import { createClient } from "@supabase/supabase-js";
import { getClientPortalBySlug } from "@/lib/clientPortals/getClientPortal";
import type { ClientUserAccess, ClientTaskAccessTarget } from "@/lib/clientPortals/clientUserAccess";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type ClientTaskRecord = {
  id: number;
  store?: string | null;
  location?: string | null;
  issue?: string | null;
  client_description?: string | null;
  status?: string | null;
  department?: string | null;
  category?: string | null;
  priority?: string | null;
  created_at?: string | null;
  attachments?: string[] | string | null;
  store_id?: number | string | null;
  company_name?: string | null;
  technician?: string | null;
  created_by?: string | null;
  client_chat_read_at?: string | null;
  erp_chat_read_at?: string | null;
};

export type ClientRequestPermissions = {
  canEdit: boolean;
  canDelete: boolean;
  canCancel: boolean;
  canComment: boolean;
  canUploadPhoto: boolean;
};

function normalizeStatus(status?: string | null) {
  return (status || "Open").trim().toLowerCase();
}

export function getClientRequestPermissions(task: {
  status?: string | null;
  technician?: string | null;
}): ClientRequestPermissions {
  const status = normalizeStatus(task.status);
  const hasTechnician = Boolean(task.technician?.trim());

  if (status === "cancelled" || status === "canceled") {
    return {
      canEdit: false,
      canDelete: false,
      canCancel: false,
      canComment: false,
      canUploadPhoto: false,
    };
  }

  const preWorkStatuses = ["open", "waiting assignment"];
  const lockedStatuses = ["assigned", "in progress", "completed"];

  const canEdit = preWorkStatuses.includes(status) && !hasTechnician;

  return {
    canEdit,
    canDelete: canEdit,
    canCancel: canEdit,
    canComment: lockedStatuses.includes(status) || hasTechnician,
    canUploadPhoto: lockedStatuses.includes(status) || hasTechnician,
  };
}

export async function verifyClientTaskAccess(
  slug: string,
  taskId: number,
  select = "*",
  access?: ClientUserAccess | null
) {
  const portal = await getClientPortalBySlug(slug);

  if (!portal) {
    return { portal: null, task: null as ClientTaskRecord | null };
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .select(select)
    .eq("id", taskId)
    .like("created_by", "Client Portal%")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (task && access && !access.canAccessTask(task as ClientTaskAccessTarget)) {
    return { portal, task: null };
  }

  return { portal, task: (task as ClientTaskRecord | null) ?? null };
}
