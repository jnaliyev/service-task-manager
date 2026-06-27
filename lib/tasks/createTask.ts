import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type CreateTaskPayload = {
  store: string;
  company_name: string;
  location?: string;
  store_id?: number | null;
  issue: string;
  status: string;
  category: string;
  department: string;
  priority: string;
  due_date?: string | null;
  employee_id?: string | null;
  technician?: string;
  created_by: string;
};

export async function createTask(payload: CreateTaskPayload) {
  const { data, error } = await supabase
    .from("tasks")
    .insert([payload])
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data;
}