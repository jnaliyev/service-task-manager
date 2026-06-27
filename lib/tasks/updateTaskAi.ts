import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type UpdateTaskAiPayload = {
  ai_category: string;
  ai_priority: string;
  ai_summary: string;
  ai_confidence: number;
};

export async function updateTaskAi(
  taskId: number,
  payload: UpdateTaskAiPayload
) {
  const { data, error } = await supabase
    .from("tasks")
    .update({
      ai_category: payload.ai_category,
      ai_priority: payload.ai_priority,
      ai_summary: payload.ai_summary,
      ai_confidence: payload.ai_confidence,
    })
    .eq("id", taskId)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
