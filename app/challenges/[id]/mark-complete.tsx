"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/client";

type Progress = { id: string; read_with_someone: boolean } | null;

export default function MarkComplete({
  participantId,
  readingId,
  initialProgress,
  companionUsedThisWeek,
}: {
  participantId: string;
  readingId: string;
  initialProgress: Progress;
  companionUsedThisWeek: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [reflection, setReflection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete(withSomeone: boolean) {
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
    setProgress(data); // locks — no editing after committing
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
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <OptionButton
          onClick={() => complete(false)}
          disabled={busy}
          icon={<PersonIcon />}
          title="Read Alone"
          points="+1 point"
        />
        <OptionButton
          onClick={() => complete(true)}
          disabled={busy}
          icon={<PeopleIcon />}
          title="With Someone"
          points={companionUsedThisWeek ? "+1 (bonus used)" : "+2 points"}
        />
      </div>
      {companionUsedThisWeek && (
        <p className="text-xs text-muted">
          You&apos;ve already claimed this week&apos;s read-with-someone bonus,
          so this counts as +1.
        </p>
      )}

      <label className="block pt-1">
        <span className="mb-1 block text-xs font-medium text-muted">
          Reflection <span className="font-normal">(optional)</span>
        </span>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="What stood out to you in this chapter?"
          rows={2}
          className="w-full rounded-xl border border-hair bg-background px-3 py-2 text-sm text-content placeholder:text-muted focus:border-brand focus:outline-none"
        />
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function OptionButton({
  onClick,
  disabled,
  icon,
  title,
  points,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  title: string;
  points: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-start gap-1 rounded-xl border border-hair bg-surface p-4 text-left transition hover:border-brand hover:bg-brand/[0.03] disabled:opacity-50"
    >
      <span className="text-heading">{icon}</span>
      <span className="mt-1 font-semibold text-heading">{title}</span>
      <span className="text-xs text-muted">{points}</span>
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
