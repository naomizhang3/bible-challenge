"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../src/lib/supabase/client";

// Detects the browser's timezone and saves it to the user's profile when it
// differs, so server-side "today"/deadline math matches the user. Renders nothing.
export default function TimezoneSync() {
  const router = useRouter();

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
        const { error } = await supabase
          .from("profiles")
          .update({ timezone: tz })
          .eq("id", user.id);
        // Re-render server components so "today"/deadlines recompute in the
        // corrected zone (otherwise the stale UTC render can be a day off).
        if (!error) router.refresh();
      }
    })();
  }, [router]);

  return null;
}
