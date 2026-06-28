import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";

export function getPortalWriteClient(): SupabaseClient {
  const admin = getSupabaseAdminClient();

  if (admin) {
    return admin;
  }

  throw new Error(
    "Supabase service role is not configured (SUPABASE_SERVICE_ROLE_KEY)"
  );
}
