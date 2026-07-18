"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/client";

export default function TeamMembershipButton({
  participantId,
  teamId,
  isCurrent,
}: {
  participantId: string;
  teamId: string;
  isCurrent: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  async function setTeam(next: string | null) {
    setBusy(true);
    const { error } = await supabase
      .from("challenge_participants")
      .update({ team_id: next })
      .eq("id", participantId);
    setBusy(false);
    if (!error) router.refresh();
  }

  return (
    <button
      onClick={() => setTeam(isCurrent ? null : teamId)}
      disabled={busy}
      className={
        "shrink-0 rounded-md px-3 py-1.5 text-sm disabled:opacity-50 " +
        (isCurrent
          ? "border border-black/15 dark:border-white/20"
          : "bg-foreground text-background")
      }
    >
      {busy ? "…" : isCurrent ? "Leave" : "Join"}
    </button>
  );
}
