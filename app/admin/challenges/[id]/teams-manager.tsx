"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/client";

type Team = { id: string; name: string };
type Member = { id: string; displayName: string; teamId: string | null };

export default function TeamsManager({
  challengeId,
  teams,
  members,
}: {
  challengeId: string;
  teams: Team[];
  members: Member[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return setError("Not signed in.");
    }
    const { error } = await supabase
      .from("teams")
      .insert({ challenge_id: challengeId, name: n, created_by: user.id });
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

  async function deleteTeam(id: string) {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (!error) router.refresh();
  }

  async function setTeam(participantIds: string[], teamId: string | null) {
    if (participantIds.length === 0) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("challenge_participants")
      .update({ team_id: teamId })
      .in("id", participantIds);
    setBusy(false);
    if (error) return setError(error.message);
    setSelected(new Set());
    setExpanded(null);
    router.refresh();
  }

  function toggleExpand(teamId: string) {
    setExpanded(expanded === teamId ? null : teamId);
    setSelected(new Set());
    setError(null);
  }
  function toggleSel(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={createTeam} className="flex gap-2">
        <input
          value={name}
          placeholder="New team name"
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-hair bg-background px-3 py-2 text-sm text-content placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Create team
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {teams.length === 0 && (
        <p className="text-sm text-muted">No teams yet.</p>
      )}

      <div className="space-y-3">
        {teams.map((t) => {
          const onTeam = members.filter((m) => m.teamId === t.id);
          const others = members.filter((m) => m.teamId !== t.id);
          return (
            <div
              key={t.id}
              className="rounded-xl border border-hair p-4"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-heading">
                  {t.name}{" "}
                  <span className="text-xs font-normal text-muted">
                    · {onTeam.length} member{onTeam.length === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  onClick={() => deleteTeam(t.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>

              {onTeam.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {onTeam.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-sm text-content"
                    >
                      {m.displayName}
                      <button
                        onClick={() => setTeam([m.id], null)}
                        className="text-muted hover:text-red-600"
                        aria-label={`Remove ${m.displayName}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={() => toggleExpand(t.id)}
                className="mt-3 text-sm font-medium text-heading hover:underline"
              >
                {expanded === t.id ? "Cancel" : "+ Add members"}
              </button>

              {expanded === t.id && (
                <div className="mt-2 rounded-lg border border-hair p-3">
                  {others.length === 0 ? (
                    <p className="text-sm text-muted">Everyone is on this team.</p>
                  ) : (
                    <>
                      <div className="max-h-56 space-y-0.5 overflow-y-auto">
                        {others.map((m) => (
                          <label
                            key={m.id}
                            className="flex items-center gap-2 py-0.5 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(m.id)}
                              onChange={() => toggleSel(m.id)}
                            />
                            <span className="flex-1 text-content">
                              {m.displayName}
                            </span>
                            {m.teamId && (
                              <span className="text-xs text-muted">
                                on {teamName.get(m.teamId) ?? "a team"}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={() => setTeam(Array.from(selected), t.id)}
                        disabled={busy || selected.size === 0}
                        className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Add {selected.size || ""} to team
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
