"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/client";
import {
  BIBLE_BOOKS,
  BOOK_PRESETS,
  generatePlan,
} from "../../../../src/lib/bible";

export default function PlanGenerator({
  challengeId,
  defaultStartDate,
  hasReadings,
}: {
  challengeId: string;
  defaultStartDate: string;
  hasReadings: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [perDay, setPerDay] = useState(1);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const selectedList = useMemo(
    () => BIBLE_BOOKS.filter((b) => selected.has(b.name)).map((b) => b.name),
    [selected]
  );

  const plan = useMemo(
    () =>
      selectedList.length && startDate
        ? generatePlan(selectedList, perDay, startDate)
        : [],
    [selectedList, perDay, startDate]
  );

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    setDone(null);
  }

  function applyPreset(books: string[]) {
    setSelected(new Set(books));
    setDone(null);
  }

  async function generate() {
    if (!plan.length) return;
    setBusy(true);
    setError(null);
    setDone(null);

    if (replace && hasReadings) {
      const { error: delErr } = await supabase
        .from("readings")
        .delete()
        .eq("challenge_id", challengeId);
      if (delErr) {
        setBusy(false);
        return setError(
          delErr.code === "23503"
            ? "Can't replace: some readings already have logged progress."
            : delErr.message
        );
      }
    }

    const rows = plan.map((p) => ({ challenge_id: challengeId, ...p }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error: insErr } = await supabase
        .from("readings")
        .insert(rows.slice(i, i + 500));
      if (insErr) {
        setBusy(false);
        return setError(
          insErr.code === "23505"
            ? "A day number or date already exists. Tick “Replace existing plan”."
            : insErr.message
        );
      }
    }

    setBusy(false);
    setDone(rows.length);
    setSelected(new Set());
    router.refresh();
  }

  const ot = BIBLE_BOOKS.filter((b) => b.testament === "OT");
  const nt = BIBLE_BOOKS.filter((b) => b.testament === "NT");

  return (
    <div className="space-y-4 rounded-xl border border-black/10 p-5 dark:border-white/15">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {BOOK_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.books)}
            className="rounded-full border border-black/15 px-3 py-1 text-xs dark:border-white/20"
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => applyPreset([])}
          className="rounded-full border border-black/15 px-3 py-1 text-xs dark:border-white/20"
        >
          Clear
        </button>
      </div>

      {/* Book checklist */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { title: "Old Testament", books: ot },
          { title: "New Testament", books: nt },
        ].map((col) => (
          <div key={col.title}>
            <div className="mb-1 text-xs font-medium text-black/50 dark:text-white/50">
              {col.title}
            </div>
            <div className="max-h-56 overflow-y-auto pr-1">
              {col.books.map((b) => (
                <label
                  key={b.name}
                  className="flex items-center gap-2 py-0.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(b.name)}
                    onChange={() => toggle(b.name)}
                  />
                  <span className="flex-1">{b.name}</span>
                  <span className="text-xs text-black/40 dark:text-white/40">
                    {b.chapters}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Options */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-black/60 dark:text-white/60">
          Chapters / day
          <input
            type="number"
            min={1}
            value={perDay}
            onChange={(e) => setPerDay(Math.max(1, Number(e.target.value)))}
            className="mt-1 w-20 rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-transparent"
          />
        </label>
        <label className="text-xs text-black/60 dark:text-white/60">
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-transparent"
          />
        </label>
        {hasReadings && (
          <label className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
            />
            Replace existing plan
          </label>
        )}
      </div>

      {/* Preview + action */}
      {plan.length > 0 && (
        <p className="text-sm text-black/70 dark:text-white/70">
          {plan.length} day{plan.length === 1 ? "" : "s"} · {plan[0].display_text}{" "}
          → {plan[plan.length - 1].display_text} · ends{" "}
          {plan[plan.length - 1].date}
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {done !== null && (
        <p className="text-xs text-green-600">Created {done} readings.</p>
      )}

      <button
        type="button"
        onClick={generate}
        disabled={busy || plan.length === 0}
        className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
      >
        {busy ? "Generating…" : "Generate plan"}
      </button>
    </div>
  );
}
