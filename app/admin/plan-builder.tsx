"use client";

import { useMemo, useState } from "react";
import {
  BIBLE_BOOKS,
  BOOK_BY_NAME,
  BOOK_PRESETS,
  generatePlanFromSegments,
  totalChaptersInSegments,
  type PlanReading,
  type Segment,
} from "../../src/lib/bible";

function wholeBook(name: string): Segment {
  return { book: name, from: 1, to: BOOK_BY_NAME.get(name)?.chapters ?? 1 };
}

export default function PlanBuilder({
  defaultStartDate,
  submitLabel,
  busy,
  error,
  onSubmit,
}: {
  defaultStartDate?: string;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  onSubmit: (plan: PlanReading[], startDate: string) => void;
}) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [perDay, setPerDay] = useState(1);
  const [startDate, setStartDate] = useState(defaultStartDate ?? "");

  const plan = useMemo(
    () =>
      segments.length && startDate
        ? generatePlanFromSegments(segments, perDay, startDate)
        : [],
    [segments, perDay, startDate]
  );
  const totalChapters = totalChaptersInSegments(segments);

  function applyPreset(books: string[]) {
    setSegments(books.map(wholeBook));
  }
  function addBook(name: string) {
    if (!name || segments.some((s) => s.book === name)) return;
    setSegments((prev) => [...prev, wholeBook(name)]);
  }
  function updateSegment(i: number, patch: Partial<Segment>) {
    setSegments((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    );
  }
  function removeSegment(i: number) {
    setSegments((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      {/* Presets — quick "whole book(s)" */}
      <div className="flex flex-wrap gap-2">
        {BOOK_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.books)}
            className="rounded-full border border-hair px-3 py-1 text-xs text-muted hover:text-heading"
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSegments([])}
          className="rounded-full border border-hair px-3 py-1 text-xs text-muted hover:text-heading"
        >
          Clear
        </button>
      </div>

      {/* Add a single book */}
      <select
        value=""
        onChange={(e) => addBook(e.target.value)}
        className="w-full rounded-lg border border-hair bg-background px-3 py-2 text-sm text-content"
      >
        <option value="">+ Add a book…</option>
        {BIBLE_BOOKS.map((b) => (
          <option key={b.name} value={b.name}>
            {b.name} ({b.chapters})
          </option>
        ))}
      </select>

      {/* Chosen segments with chapter ranges */}
      {segments.length > 0 && (
        <ul className="space-y-2">
          {segments.map((s, i) => {
            const max = BOOK_BY_NAME.get(s.book)?.chapters ?? 1;
            return (
              <li
                key={s.book}
                className="flex items-center gap-2 rounded-lg border border-hair px-3 py-2 text-sm"
              >
                <span className="flex-1 truncate font-medium text-heading">
                  {s.book}
                </span>
                <span className="text-xs text-muted">Ch</span>
                <input
                  type="number"
                  min={1}
                  max={max}
                  value={s.from}
                  onChange={(e) =>
                    updateSegment(i, {
                      from: clamp(Number(e.target.value), 1, max),
                    })
                  }
                  className="w-14 rounded-md border border-hair bg-background px-2 py-1 text-content"
                />
                <span className="text-xs text-muted">–</span>
                <input
                  type="number"
                  min={1}
                  max={max}
                  value={s.to}
                  onChange={(e) =>
                    updateSegment(i, {
                      to: clamp(Number(e.target.value), 1, max),
                    })
                  }
                  className="w-14 rounded-md border border-hair bg-background px-2 py-1 text-content"
                />
                <button
                  type="button"
                  onClick={() => removeSegment(i)}
                  className="pl-1 text-muted hover:text-red-600"
                  aria-label={`Remove ${s.book}`}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pace + start */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted">
          Chapters / day
          <input
            type="number"
            min={1}
            value={perDay}
            onChange={(e) => setPerDay(Math.max(1, Number(e.target.value)))}
            className="mt-1 w-20 rounded-lg border border-hair bg-background px-2 py-1.5 text-sm text-content"
          />
        </label>
        <label className="text-xs text-muted">
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 rounded-lg border border-hair bg-background px-2 py-1.5 text-sm text-content"
          />
        </label>
      </div>

      {/* Summary — no day-by-day list */}
      {plan.length > 0 ? (
        <div className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-content">
          <span className="font-semibold text-heading">{totalChapters}</span>{" "}
          chapters over{" "}
          <span className="font-semibold text-heading">{plan.length}</span> day
          {plan.length === 1 ? "" : "s"} · {plan[0].display_text} →{" "}
          {plan[plan.length - 1].display_text} · ends{" "}
          {plan[plan.length - 1].date}
        </div>
      ) : (
        <p className="text-xs text-muted">
          Add at least one book and a start date to preview the plan.
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={() => onSubmit(plan, startDate)}
        disabled={busy || plan.length === 0}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

function clamp(n: number, lo: number, hi: number) {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
