import { createClient } from "./supabase/server";

// Resolves the current viewer and whether they are a global admin.
// Returns the same server client so callers can reuse it in the request.
export async function getViewer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, isAdmin: false };

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return { supabase, user, isAdmin: Boolean(data?.is_admin) };
}
