"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/client";

type Progress = { id: string; read_with_someone: boolean } | null;

export default function MarkComplete({
  participantId,
  readingId,
  initialProgress,
  companionUsedThisWeek,
}: {
  participantId: string;
  readingId: string;
  initialProgress: Progress;
  companionUsedThisWeek: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete(withSomeone: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from("reading_progress")
      .insert({
        participant_id: participantId,
        reading_id: readingId,
        read_with_someone: withSomeone,
      })
      .select("id, read_with_someone")
      .single();

    setBusy(false);
    if (error) return setError(error.message);
    setProgress(data); // locks the UI — no editing after committing
    router.refresh();
  }

  // Already completed today: show a locked confirmation, no way to change it.
  if (progress) {
    return (
      <div className="rounded-md border border-green-600 px-4 py-3 text-sm text-green-700 dark:text-green-400">
        ✓ Completed
        {progress.read_with_someone
          ? " — read with someone (bonus claimed)"
          : " — read on your own"}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => complete(false)}
          disabled={busy}
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          Read yourself <span className="opacity-70">+1</span>
        </button>
        <button
          onClick={() => complete(true)}
          disabled={busy}
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          Read with someone{" "}
          <span className="opacity-70">{companionUsedThisWeek ? "+1" : "+2"}</span>
        </button>
      </div>
      {companionUsedThisWeek && (
        <p className="text-xs text-black/50 dark:text-white/50">
          You&apos;ve already claimed this week&apos;s read-with-someone bonus,
          so this counts as +1.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
