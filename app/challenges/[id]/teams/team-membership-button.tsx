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
        "shrink-0 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 " +
        (isCurrent
          ? "border border-hair text-muted"
          : "bg-brand text-white")
      }
    >
      {busy ? "…" : isCurrent ? "Leave" : "Join"}
    </button>
  );
}
