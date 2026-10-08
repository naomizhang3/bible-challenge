import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database";

// Service-role client for trusted server-only jobs (e.g. cron). Bypasses RLS,
// so it must NEVER be imported into client code or exposed to the browser.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
