import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../../types/database";

// Browser (Client Component) Supabase client.
// Reads/writes the auth session from cookies so it stays in sync with the server.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
