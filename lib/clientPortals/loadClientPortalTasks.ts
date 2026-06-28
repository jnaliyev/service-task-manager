import { createClient } from "@supabase/supabase-js";
import type { ClientUserAccess } from "@/lib/clientPortals/clientUserAccess";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const taskSelect =
  "id, store, store_id, location, issue, status, department, category, priority, created_at, attachments, company_name";

type PortalTaskRow = {
  id: number;
  store?: string | null;
  store_id?: number | string | null;
  location?: string | null;
  issue?: string | null;
  status?: string | null;
  department?: string | null;
  category?: string | null;
  priority?: string | null;
  created_at?: string | null;
  attachments?: string[] | string | null;
  company_name?: string | null;
};

function dedupeTasksById(tasks: PortalTaskRow[]) {
  const seen = new Set<number>();

  return tasks.filter((task) => {
    if (seen.has(task.id)) {
      return false;
    }

    seen.add(task.id);
    return true;
  });
}

export async function loadClientPortalTasks(
  companyName: string,
  access: ClientUserAccess
) {
  const baseQuery = () =>
    supabase
      .from("tasks")
      .select(taskSelect)
      .like("created_by", "Client Portal%")
      .order("created_at", { ascending: false });

  if (access.portalStoreIds.length > 0) {
    const { data: storeTasks, error: storeTasksError } = await baseQuery()
      .in("store_id", access.portalStoreIds);

    if (storeTasksError) {
      throw storeTasksError;
    }

    const { data: companyTasks, error: companyTasksError } = await supabase
      .from("tasks")
      .select(taskSelect)
      .eq("company_name", companyName)
      .like("created_by", "Client Portal%")
      .order("created_at", { ascending: false });

    if (companyTasksError) {
      throw companyTasksError;
    }

    return dedupeTasksById([
      ...((storeTasks || []) as PortalTaskRow[]),
      ...((companyTasks || []) as PortalTaskRow[]),
    ]);
  }

  const { data, error } = await baseQuery().eq("company_name", companyName);

  if (error) {
    throw error;
  }

  return (data || []) as PortalTaskRow[];
}
