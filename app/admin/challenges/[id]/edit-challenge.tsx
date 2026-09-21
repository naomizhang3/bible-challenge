"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/client";
import { CHALLENGE_STATUSES } from "../../../../src/lib/challenge-status";

type Challenge = {
  id: string;
  name: string;
  description: string | null;
  status: (typeof CHALLENGE_STATUSES)[number];
  start_date: string;
  end_date: string;
  group_id: string | null;
  weekly_bonus_enabled: boolean;
  collect_group_preferences: boolean;
};

export default function EditChallenge({
  challenge,
  groups,
}: {
  challenge: Challenge;
  groups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState(challenge);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Challenge>(key: K, value: Challenge[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    const { error } = await supabase
      .from("challenges")
      .update({
        name: form.name.trim(),
        description: form.description?.trim() || null,
        status: form.status,
        start_date: form.start_date,
        end_date: form.end_date,
        group_id: form.group_id,
        weekly_bonus_enabled: form.weekly_bonus_enabled,
        collect_group_preferences: form.collect_group_preferences,
      })
      .eq("id", challenge.id);
    if (error) {
      setStatus("idle");
      return setError(error.message);
    }
    setStatus("saved");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <input
        required
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        className="w-full rounded-md border border-hair px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
      />
      <textarea
        value={form.description ?? ""}
        placeholder="Description"
        onChange={(e) => set("description", e.target.value)}
        className="w-full rounded-md border border-hair px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
      />
      <div className="space-y-3">
        <label className="block text-xs text-muted dark:text-white/60">
          Start
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            className="mt-1 block w-full min-w-0 rounded-md border border-hair px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          />
        </label>
        <label className="block text-xs text-muted dark:text-white/60">
          End
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => set("end_date", e.target.value)}
            className="mt-1 block w-full min-w-0 rounded-md border border-hair px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          />
        </label>
        <label className="block text-xs text-muted dark:text-white/60">
          Status
          <select
            value={form.status}
            onChange={(e) =>
              set("status", e.target.value as Challenge["status"])
            }
            className="mt-1 block w-full rounded-md border border-hair px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          >
            {CHALLENGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-muted dark:text-white/60">
          Visible to
          <select
            value={form.group_id ?? ""}
            onChange={(e) => set("group_id", e.target.value || null)}
            className="mt-1 block w-full rounded-md border border-hair px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          >
            <option value="">Everyone</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-start gap-2 text-sm text-content">
          <input
            type="checkbox"
            checked={form.weekly_bonus_enabled}
            onChange={(e) => set("weekly_bonus_enabled", e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Weekly bonus
            <span className="block text-xs text-muted dark:text-white/60">
              Double a week&apos;s points for completing all 7 days on time. Turn
              off to track streaks only, with no weekly bonus.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-content">
          <input
            type="checkbox"
            checked={form.collect_group_preferences}
            onChange={(e) =>
              set("collect_group_preferences", e.target.checked)
            }
            className="mt-0.5"
          />
          <span>
            Ask for grouping preferences
            <span className="block text-xs text-muted dark:text-white/60">
              Prompt participants to name who they&apos;d like to be grouped
              with. Their answers appear below.
            </span>
          </span>
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save"}
      </button>
    </form>
  );
}
