"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/client";

type Team = { id: string; name: string; memberCount: number };

export default function TeamsManager({
  challengeId,
  teams,
}: {
  challengeId: string;
  teams: Team[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return setError("Not signed in.");
    }

    const { error } = await supabase.from("teams").insert({
      challenge_id: challengeId,
      name: trimmed,
      created_by: user.id,
    });
    setBusy(false);
    if (error) {
      return setError(
        error.code === "23505"
          ? "A team with that name already exists."
          : error.message
      );
    }
    setName("");
    router.refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (!error) router.refresh();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={create} className="flex gap-2">
        <input
          value={name}
          placeholder="New team name"
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          Create
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <ul className="divide-y divide-black/5 dark:divide-white/10">
        {teams.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between py-2 text-sm"
          >
            <span>
              {t.name}{" "}
              <span className="text-black/50 dark:text-white/50">
                · {t.memberCount} member{t.memberCount === 1 ? "" : "s"}
              </span>
            </span>
            <button
              onClick={() => remove(t.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
        {teams.length === 0 && (
          <li className="py-2 text-sm text-black/60 dark:text-white/60">
            No teams yet.
          </li>
        )}
      </ul>
    </div>
  );
}
