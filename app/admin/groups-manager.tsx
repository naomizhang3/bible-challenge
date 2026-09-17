"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../src/lib/supabase/client";

type Group = { id: string; name: string };

export default function GroupsManager({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("groups")
      .insert({ name: n, sort_order: groups.length + 1 });
    setBusy(false);
    if (error) {
      return setError(
        error.code === "23505" ? "That group already exists." : error.message
      );
    }
    setName("");
    router.refresh();
  }

  async function rename(id: string, current: string) {
    const next = window.prompt("Rename group", current);
    if (!next || next.trim() === current) return;
    const { error } = await supabase
      .from("groups")
      .update({ name: next.trim() })
      .eq("id", id);
    if (!error) router.refresh();
  }

  async function remove(id: string, gname: string) {
    if (
      !window.confirm(
        `Delete "${gname}"? Members in it will become ungrouped, and challenges targeting it will become visible to everyone.`
      )
    )
      return;
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (!error) router.refresh();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="flex gap-2">
        <input
          value={name}
          placeholder="New group name"
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-hair bg-background px-3 py-2 text-sm text-content placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <ul className="divide-y divide-hair">
        {groups.map((g) => (
          <li
            key={g.id}
            className="flex items-center justify-between py-2 text-sm"
          >
            <span className="text-content">{g.name}</span>
            <span className="flex gap-3">
              <button
                onClick={() => rename(g.id, g.name)}
                className="text-xs text-muted hover:text-heading"
              >
                Rename
              </button>
              <button
                onClick={() => remove(g.id, g.name)}
                className="text-xs text-red-600 hover:underline"
              >
                Delete
              </button>
            </span>
          </li>
        ))}
        {groups.length === 0 && (
          <li className="py-2 text-sm text-muted">No groups yet.</li>
        )}
      </ul>
    </div>
  );
}
