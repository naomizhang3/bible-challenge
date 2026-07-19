"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/client";

export default function DeleteChallengeButton({
  challengeId,
  challengeName,
}: {
  challengeId: string;
  challengeName: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    const ok = window.confirm(
      `Delete "${challengeName}"? This permanently removes the challenge, its readings, teams, members, and everyone's progress. This can't be undone.`
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("delete_challenge", {
      cid: challengeId,
    });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={del}
        disabled={busy}
        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete challenge"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
