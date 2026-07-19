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

const ORDER = new Map(BIBLE_BOOKS.map((b, i) => [b.name, i]));
const OT = BIBLE_BOOKS.filter((b) => b.testament === "OT");
const NT = BIBLE_BOOKS.filter((b) => b.testament === "NT");

function wholeBook(name: string): Segment {
  return { book: name, from: 1, to: BOOK_BY_NAME.get(name)?.chapters ?? 1 };
}
function byOrder(a: Segment, b: Segment) {
  return (ORDER.get(a.book) ?? 0) - (ORDER.get(b.book) ?? 0);
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

  const selected = useMemo(
    () => new Set(segments.map((s) => s.book)),
    [segments]
  );
  const plan = useMemo(
    () =>
      segments.length && startDate
        ? generatePlanFromSegments(segments, perDay, startDate)
        : [],
    [segments, perDay, startDate]
  );
  const totalChapters = totalChaptersInSegments(segments);

  function applyPreset(books: string[]) {
    setSegments(books.map(wholeBook).sort(byOrder));
  }
  function toggleBook(name: string) {
    setSegments((prev) =>
      prev.some((s) => s.book === name)
        ? prev.filter((s) => s.book !== name)
        : [...prev, wholeBook(name)].sort(byOrder)
    );
  }
  function updateSegment(book: string, patch: Partial<Segment>) {
    setSegments((prev) =>
      prev.map((s) => (s.book === book ? { ...s, ...patch } : s))
    );
  }

  return (
    <div className="space-y-4">
      {/* Presets */}
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

      {/* Multi-select book checklist */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { title: "Old Testament", books: OT },
          { title: "New Testament", books: NT },
        ].map((col) => (
          <div key={col.title}>
            <div className="mb-1 text-xs font-medium text-muted">
              {col.title}
            </div>
            <div className="max-h-48 overflow-y-auto pr-1">
              {col.books.map((b) => (
                <label
                  key={b.name}
                  className="flex items-center gap-2 py-0.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(b.name)}
                    onChange={() => toggleBook(b.name)}
                  />
                  <span className="flex-1 text-content">{b.name}</span>
                  <span className="text-xs text-muted">{b.chapters}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Chapter ranges for the selected books */}
      {segments.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-medium text-muted">
            Chapters to read
          </div>
          <ul className="space-y-2">
            {segments.map((s) => {
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
                      updateSegment(s.book, {
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
                      updateSegment(s.book, {
                        to: clamp(Number(e.target.value), 1, max),
                      })
                    }
                    className="w-14 rounded-md border border-hair bg-background px-2 py-1 text-content"
                  />
                  <button
                    type="button"
                    onClick={() => toggleBook(s.book)}
                    className="pl-1 text-muted hover:text-red-600"
                    aria-label={`Remove ${s.book}`}
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
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

      {/* Summary */}
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
          Pick at least one book and a start date to preview the plan.
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
