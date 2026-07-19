"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/client";

export default function LeaveChallengeButton({
  participantId,
}: {
  participantId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    const ok = window.confirm(
      "Leave this challenge? Your progress, points, and team membership for it will be removed. This can't be undone."
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("challenge_participants")
      .delete()
      .eq("id", participantId);

    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }

    router.replace("/challenges");
    router.refresh();
  }

  return (
    <div className="pt-2">
      <button
        onClick={leave}
        disabled={busy}
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {busy ? "Leaving…" : "Leave challenge"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
