"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/client";

type Progress = { id: string; read_with_someone: boolean } | null;

export default function MarkComplete({
  participantId,
  readingId,
  readingLabel,
  initialProgress,
  companionUsedThisWeek,
}: {
  participantId: string;
  readingId: string;
  readingLabel: string;
  initialProgress: Progress;
  companionUsedThisWeek: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [open, setOpen] = useState(false);
  const [withSomeone, setWithSomeone] = useState(false);
  const [reflection, setReflection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const points = withSomeone ? (companionUsedThisWeek ? 1 : 2) : 1;

  async function confirm() {
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from("reading_progress")
      .insert({
        participant_id: participantId,
        reading_id: readingId,
        read_with_someone: withSomeone,
        reflection: reflection.trim() || null,
      })
      .select("id, read_with_someone")
      .single();

    setBusy(false);
    if (error) return setError(error.message);
    setProgress(data);
    setOpen(false);
    router.refresh();
  }

  if (progress) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-600/40 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
        <Check />
        Completed
        {progress.read_with_someone
          ? " — read with someone (bonus claimed)"
          : " — read on your own"}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-medium text-white"
      >
        Mark as Complete
        <span aria-hidden>›</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative text-center">
              <h2 className="font-serif text-2xl font-bold text-heading">
                {readingLabel}
              </h2>
              <p className="mt-0.5 text-sm text-muted">How did you read today?</p>
              <button
                onClick={() => setOpen(false)}
                className="absolute right-0 top-0 text-muted hover:text-heading"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Option
                selected={!withSomeone}
                onClick={() => setWithSomeone(false)}
                icon={<PersonIcon />}
                title="Read Alone"
                sub="+1 point"
              />
              <Option
                selected={withSomeone}
                onClick={() => setWithSomeone(true)}
                icon={<PeopleIcon />}
                title="With Someone"
                sub={
                  companionUsedThisWeek ? "+1 (bonus used)" : "+2 points (once/week)"
                }
              />
            </div>

            <div className="mt-4 rounded-xl bg-surface-muted p-4">
              <div className="text-xs text-muted">Points earned now</div>
              <div className="mt-1 font-serif text-2xl font-bold text-heading">
                +{points}
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm text-muted">
                Reflection <span className="text-xs">(optional)</span>
              </span>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="What stood out to you in this chapter?"
                rows={3}
                className="w-full rounded-xl border border-hair bg-background px-3 py-2 text-sm text-content placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </label>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <button
              onClick={confirm}
              disabled={busy}
              className="mt-5 w-full rounded-xl bg-brand px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              {busy
                ? "Saving…"
                : `Confirm — +${points} point${points === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Option({
  selected,
  onClick,
  icon,
  title,
  sub,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition " +
        (selected
          ? "border-brand ring-1 ring-brand/30 bg-brand/[0.04]"
          : "border-hair hover:border-brand/50")
      }
    >
      <span className="text-brand">{icon}</span>
      <span className="mt-1 font-semibold text-heading">{title}</span>
      <span className="text-xs text-muted">{sub}</span>
    </button>
  );
}

function PersonIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 21a6.5 6.5 0 0 1 13 0M16 5.5a3.5 3.5 0 0 1 0 6.9M18 21a6.5 6.5 0 0 0-3-5.5" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
