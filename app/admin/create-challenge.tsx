"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../src/lib/supabase/client";
import { CHALLENGE_STATUSES } from "../../src/lib/challenge-status";
import type { PlanReading } from "../../src/lib/bible";
import PlanBuilder from "./plan-builder";

export default function CreateChallenge() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] =
    useState<(typeof CHALLENGE_STATUSES)[number]>("active");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(plan: PlanReading[], startDate: string) {
    if (!name.trim()) return setError("Give the challenge a name.");
    if (!plan.length) return setError("Add at least one book to the plan.");
    setBusy(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return setError("Not signed in.");
    }

    // Challenge dates come straight from the plan.
    const { data: challenge, error: cErr } = await supabase
      .from("challenges")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        status,
        start_date: startDate,
        end_date: plan[plan.length - 1].date,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (cErr) {
      setBusy(false);
      return setError(cErr.message);
    }

    const rows = plan.map((p) => ({ challenge_id: challenge.id, ...p }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error: rErr } = await supabase
        .from("readings")
        .insert(rows.slice(i, i + 500));
      if (rErr) {
        setBusy(false);
        return setError(rErr.message);
      }
    }

    router.push(`/admin/challenges/${challenge.id}`);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
      >
        + New challenge
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-hair bg-surface p-5 shadow-sm">
      <h2 className="font-serif text-lg font-semibold text-heading">
        New challenge
      </h2>

      <input
        required
        placeholder="Challenge name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-hair bg-background px-3 py-2 text-sm text-content placeholder:text-muted"
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-lg border border-hair bg-background px-3 py-2 text-sm text-content placeholder:text-muted"
      />
      <label className="block text-xs text-muted">
        Status
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as (typeof CHALLENGE_STATUSES)[number])
          }
          className="mt-1 block w-40 rounded-lg border border-hair bg-background px-3 py-2 text-sm text-content"
        >
          {CHALLENGE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <div className="border-t border-hair pt-4">
        <h3 className="mb-3 text-sm font-semibold text-heading">
          Reading plan
        </h3>
        <PlanBuilder
          submitLabel="Create challenge"
          busy={busy}
          error={error}
          disabled={!name.trim()}
          onSubmit={create}
        />
        {!name.trim() && (
          <p className="text-xs text-muted">Add a name above to create.</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-sm text-muted hover:text-heading"
      >
        Cancel
      </button>
    </div>
  );
}
