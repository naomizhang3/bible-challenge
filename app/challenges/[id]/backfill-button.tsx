"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/client";

// Backfill a missed day earlier this week. Flat +1 (the DB trigger enforces
// the window and forces read_with_someone = false). Commit-once, no editing.
export default function BackfillButton({
  participantId,
  readingId,
}: {
  participantId: string;
  readingId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function backfill() {
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("reading_progress")
      .insert({ participant_id: participantId, reading_id: readingId });
    setBusy(false);
    if (error) return setError(error.message);
    setDone(true);
    router.refresh();
  }

  if (done) {
    return <span className="text-xs text-green-700 dark:text-green-400">✓ done</span>;
  }

  return (
    <span className="text-right">
      <button
        onClick={backfill}
        disabled={busy}
        className="rounded-md border border-black/15 px-3 py-1 text-xs disabled:opacity-50 dark:border-white/20"
      >
        {busy ? "…" : "Backfill +1"}
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
