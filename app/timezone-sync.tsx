"use client";

import { useEffect } from "react";
import { createClient } from "../src/lib/supabase/client";

// Detects the browser's timezone and saves it to the user's profile when it
// differs, so server-side "today"/deadline math matches the user. Renders nothing.
export default function TimezoneSync() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;

    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", user.id)
        .single();

      if (profile && profile.timezone !== tz) {
        await supabase.from("profiles").update({ timezone: tz }).eq("id", user.id);
      }
    })();
  }, []);

  return null;
}
