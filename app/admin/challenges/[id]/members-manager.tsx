"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/client";

type Member = { id: string; displayName: string };

export default function MembersManager({ members }: { members: Member[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [busyId, setBusyId] = useState<string | null>(null);

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
    return <p className="text-sm text-muted">No participants yet.</p>;
  }

  return (
    <ul className="divide-y divide-hair">
      {members.map((m) => (
        <li
          key={m.id}
          className="flex items-center justify-between gap-3 py-2 text-sm"
        >
          <span className="flex-1 truncate text-content">{m.displayName}</span>
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
