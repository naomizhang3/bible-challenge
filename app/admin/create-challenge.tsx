"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../src/lib/supabase/client";
import { CHALLENGE_STATUSES } from "../../src/lib/challenge-status";

export default function CreateChallenge() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [status, setStatus] =
    useState<(typeof CHALLENGE_STATUSES)[number]>("draft");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return setError("Not signed in.");
    }

    const { data, error } = await supabase
      .from("challenges")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        status,
        start_date: startDate,
        // Provisional until a reading plan is generated, which sets the real end.
        end_date: startDate,
        created_by: user.id,
      })
      .select("id")
      .single();

    setBusy(false);
    if (error) return setError(error.message);
    router.push(`/admin/challenges/${data.id}`);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-white"
      >
        + New challenge
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-hair p-5 dark:border-white/15"
    >
      <input
        required
        placeholder="Challenge name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-hair px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-md border border-hair px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
      />
      <div className="flex gap-3">
        <label className="flex-1 text-xs text-muted dark:text-white/60">
          Start
          <input
            required
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-hair px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          />
        </label>
        <label className="flex-1 text-xs text-muted dark:text-white/60">
          Status
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as (typeof CHALLENGE_STATUSES)[number])
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
      <p className="text-xs text-muted">
        The end date is set automatically when you generate a reading plan.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-hair px-4 py-2 text-sm dark:border-white/20"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
