"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/client";

export default function GroupPreferencePrompt({
  challengeId,
  userId,
  hasResponded,
  initialNames,
}: {
  challengeId: string;
  userId: string;
  hasResponded: boolean;
  initialNames: string[];
}) {
  const router = useRouter();
  const supabase = createClient();
  // Auto-open the first time (no response yet); otherwise open on demand.
  const [open, setOpen] = useState(!hasResponded);
  const [names, setNames] = useState<string[]>(initialNames);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addDraft() {
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setNames((prev) => {
      const seen = new Set(prev.map((n) => n.toLowerCase()));
      const next = [...prev];
      for (const p of parts) {
        if (!seen.has(p.toLowerCase())) {
          seen.add(p.toLowerCase());
          next.push(p);
        }
      }
      return next;
    });
    setDraft("");
  }

  function remove(name: string) {
    setNames((prev) => prev.filter((n) => n !== name));
  }

  async function save() {
    // Fold any un-added text into the list before saving.
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const seen = new Set(names.map((n) => n.toLowerCase()));
    const finalNames = [...names];
    for (const p of parts) {
      if (!seen.has(p.toLowerCase())) {
        seen.add(p.toLowerCase());
        finalNames.push(p);
      }
    }

    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("challenge_group_preferences")
      .upsert(
        {
          challenge_id: challengeId,
          user_id: userId,
          names: finalNames,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "challenge_id,user_id" }
      );
    setBusy(false);
    if (error) return setError(error.message);
    setNames(finalNames);
    setDraft("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-hair bg-surface px-5 py-4 text-left shadow-sm hover:border-brand/50"
      >
        <span>
          <span className="block font-serif text-base font-semibold text-heading">
            Grouping preferences
          </span>
          <span className="block text-sm text-muted">
            {names.length > 0
              ? `You picked ${names.length} ${
                  names.length === 1 ? "person" : "people"
                } · Edit`
              : "Tell us who you'd like to be grouped with"}
          </span>
        </span>
        <span aria-hidden className="text-muted">
          ›
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !busy && setOpen(false)}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative text-center">
          <h2 className="font-serif text-2xl font-bold text-heading">
            Who would you like to be grouped with?
          </h2>
          <p className="mt-1 text-sm text-muted">
            Type the names of young people you&apos;d like on your team. We&apos;ll
            do our best to honor requests.
          </p>
          <button
            onClick={() => setOpen(false)}
            className="absolute right-0 top-0 text-muted hover:text-heading"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-5">
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addDraft();
                }
              }}
              placeholder="Type a name and press Enter"
              className="flex-1 rounded-xl border border-hair bg-background px-3 py-2 text-sm text-content placeholder:text-muted focus:border-brand focus:outline-none"
            />
            <button
              type="button"
              onClick={addDraft}
              disabled={!draft.trim()}
              className="rounded-xl border border-hair px-4 py-2 text-sm font-medium text-heading disabled:opacity-40"
            >
              Add
            </button>
          </div>

          {names.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {names.map((n) => (
                <span
                  key={n}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-sm text-content"
                >
                  {n}
                  <button
                    onClick={() => remove(n)}
                    className="text-muted hover:text-heading"
                    aria-label={`Remove ${n}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setOpen(false)}
            disabled={busy}
            className="flex-1 rounded-xl border border-hair px-4 py-3 text-sm font-medium text-muted hover:text-heading disabled:opacity-50"
          >
            Maybe later
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
