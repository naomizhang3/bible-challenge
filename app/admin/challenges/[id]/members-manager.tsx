"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/client";

type Member = { id: string; teamId: string | null; displayName: string };
type Team = { id: string; name: string };

export default function MembersManager({
  members,
  teams,
}: {
  members: Member[];
  teams: Team[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function assign(participantId: string, teamId: string | null) {
    setBusyId(participantId);
    const { error } = await supabase
      .from("challenge_participants")
      .update({ team_id: teamId })
      .eq("id", participantId);
    setBusyId(null);
    if (!error) router.refresh();
  }

  async function remove(participantId: string) {
    setBusyId(participantId);
    const { error } = await supabase
      .from("challenge_participants")
      .delete()
      .eq("id", participantId);
    setBusyId(null);
    if (!error) router.refresh();
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">
        No participants yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-black/5 dark:divide-white/10">
      {members.map((m) => (
        <li
          key={m.id}
          className="flex items-center justify-between gap-3 py-2 text-sm"
        >
          <span className="flex-1 truncate">{m.displayName}</span>
          <select
            value={m.teamId ?? ""}
            disabled={busyId === m.id}
            onChange={(e) => assign(m.id, e.target.value || null)}
            className="rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
          >
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => remove(m.id)}
            disabled={busyId === m.id}
            className="text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
