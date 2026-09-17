import { cache } from "react";
import { createClient } from "./supabase/server";

// Request-scoped memoization: when a layout and its page both need the current
// user/profile, React's cache() ensures the underlying Supabase calls run once
// per request instead of once per component.

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getSessionProfile = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, timezone, is_admin")
    .eq("id", user.id)
    .single();
  return data;
});

// The current user's participation in a challenge (request-cached so the
// layout and the tab page don't both query it).
export const getMembership = cache(async (challengeId: string) => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("challenge_participants")
    .select("id, team_id")
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
});
