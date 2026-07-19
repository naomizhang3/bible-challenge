"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../src/lib/supabase/client";

export default function JoinButton({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("challenge_participants")
      .insert({ challenge_id: challengeId, user_id: user.id });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    // Reveal the "Open" link for the now-joined challenge.
    router.refresh();
  }

  return (
    <div className="shrink-0 text-right">
      <button
        onClick={join}
        disabled={loading}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Joining…" : "Join"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
