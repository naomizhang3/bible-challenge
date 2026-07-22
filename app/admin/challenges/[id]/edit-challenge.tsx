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
};

export default function EditChallenge({ challenge }: { challenge: Challenge }) {
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-xs text-muted dark:text-white/60">
          Start
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            className="mt-1 w-full rounded-md border border-hair px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          />
        </label>
        <label className="text-xs text-muted dark:text-white/60">
          End
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => set("end_date", e.target.value)}
            className="mt-1 w-full rounded-md border border-hair px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          />
        </label>
        <label className="text-xs text-muted dark:text-white/60">
          Status
          <select
            value={form.status}
            onChange={(e) =>
              set("status", e.target.value as Challenge["status"])
            }
            className="mt-1 w-full rounded-md border border-hair px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          >
            {CHALLENGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
