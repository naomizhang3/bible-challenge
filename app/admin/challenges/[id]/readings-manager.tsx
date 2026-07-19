"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/client";

type Reading = {
  id: string;
  day_number: number;
  date: string;
  display_text: string;
};

export default function ReadingsManager({
  challengeId,
  readings,
}: {
  challengeId: string;
  readings: Reading[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [dayNumber, setDayNumber] = useState("");
  const [date, setDate] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addReading(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("readings").insert({
      challenge_id: challengeId,
      day_number: Number(dayNumber),
      date,
      display_text: displayText.trim(),
    });
    setBusy(false);
    if (error) {
      return setError(
        error.code === "23505"
          ? "That day number or date already exists."
          : error.message
      );
    }
    setDayNumber("");
    setDate("");
    setDisplayText("");
    router.refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("readings").delete().eq("id", id);
    if (!error) router.refresh();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={addReading} className="flex flex-wrap gap-2">
        <input
          required
          type="number"
          min={1}
          placeholder="Day"
          value={dayNumber}
          onChange={(e) => setDayNumber(e.target.value)}
          className="w-16 rounded-md border border-hair px-2 py-2 text-sm dark:border-white/20 dark:bg-transparent"
        />
        <input
          required
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-hair px-2 py-2 text-sm dark:border-white/20 dark:bg-transparent"
        />
        <input
          required
          placeholder="Passage (e.g. Hebrews 1)"
          value={displayText}
          onChange={(e) => setDisplayText(e.target.value)}
          className="flex-1 rounded-md border border-hair px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <ul className="divide-y divide-hair dark:divide-white/10">
        {readings.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between py-2 text-sm"
          >
            <span>
              <span className="text-muted dark:text-white/50">
                Day {r.day_number} · {r.date}
              </span>{" "}
              — {r.display_text}
            </span>
            <button
              onClick={() => remove(r.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
        {readings.length === 0 && (
          <li className="py-2 text-sm text-muted dark:text-white/60">
            No readings yet.
          </li>
        )}
      </ul>
    </div>
  );
}
