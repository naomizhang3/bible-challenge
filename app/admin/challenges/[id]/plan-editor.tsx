"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/client";
import type { PlanReading } from "../../../../src/lib/bible";
import PlanBuilder from "../../plan-builder";

type Summary = {
  count: number;
  first: string;
  last: string;
  firstDate: string;
  lastDate: string;
} | null;

export default function PlanEditor({
  challengeId,
  defaultStartDate,
  summary,
}: {
  challengeId: string;
  defaultStartDate: string;
  summary: Summary;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPlan = (summary?.count ?? 0) > 0;

  async function replace(plan: PlanReading[], startDate: string) {
    if (
      hasPlan &&
      !window.confirm(
        `Replace the current plan (${summary!.count} readings)? The existing readings will be removed.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    const { error: dErr } = await supabase
      .from("readings")
      .delete()
      .eq("challenge_id", challengeId);
    if (dErr) {
      setBusy(false);
      return setError(
        dErr.code === "23503"
          ? "Can't replace: some readings already have logged progress."
          : dErr.message
      );
    }

    const rows = plan.map((p) => ({ challenge_id: challengeId, ...p }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error: iErr } = await supabase
        .from("readings")
        .insert(rows.slice(i, i + 500));
      if (iErr) {
        setBusy(false);
        return setError(iErr.message);
      }
    }

    await supabase
      .from("challenges")
      .update({ start_date: startDate, end_date: plan[plan.length - 1].date })
      .eq("id", challengeId);

    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {hasPlan ? (
        <div className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-content">
          <span className="font-semibold text-heading">{summary!.count}</span>{" "}
          readings · {summary!.first} → {summary!.last} ·{" "}
          {summary!.firstDate} to {summary!.lastDate}
        </div>
      ) : (
        <p className="text-sm text-muted">No reading plan yet.</p>
      )}

      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg border border-hair px-4 py-2 text-sm font-medium text-heading"
        >
          {hasPlan ? "Replace plan" : "Create plan"}
        </button>
      ) : (
        <div className="rounded-xl border border-hair p-4">
          <PlanBuilder
            defaultStartDate={defaultStartDate}
            submitLabel={hasPlan ? "Replace plan" : "Create plan"}
            busy={busy}
            error={error}
            onSubmit={replace}
          />
          <button
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            className="mt-3 text-sm text-muted hover:text-heading"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
