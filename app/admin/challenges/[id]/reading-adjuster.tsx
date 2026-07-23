"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/client";

type Member = { id: string; displayName: string };
type Reading = {
  id: string;
  day_number: number;
  date: string;
  display_text: string;
};

export default function ReadingAdjuster({
  members,
  readings,
}: {
  members: Member[];
  readings: Reading[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [memberId, setMemberId] = useState("");
  const [readingId, setReadingId] = useState("");
  const [withSomeone, setWithSomeone] = useState(false);
  const [onTime, setOnTime] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const ready = memberId && readingId;

  async function log() {
    if (!ready) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("admin_set_reading_done", {
      p_participant: memberId,
      p_reading: readingId,
      p_with_someone: withSomeone,
      p_on_time: onTime,
    });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setMsg({ ok: true, text: "Reading logged." });
    router.refresh();
  }

  async function remove() {
    if (!ready) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("admin_remove_reading", {
      p_participant: memberId,
      p_reading: readingId,
    });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setMsg({ ok: true, text: "Reading removed." });
    router.refresh();
  }

  const selectClass =
    "w-full rounded-lg border border-hair bg-background px-3 py-2 text-sm text-content";

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Record or remove a reading for a member — e.g. if they read while
        offline. Marking it on-time keeps their streak intact.
      </p>

      <label className="block text-xs text-muted">
        Member
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className={`mt-1 ${selectClass}`}
        >
          <option value="">Select a member…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-muted">
        Reading
        <select
          value={readingId}
          onChange={(e) => setReadingId(e.target.value)}
          className={`mt-1 ${selectClass}`}
        >
          <option value="">Select a reading…</option>
          {readings.map((r) => (
            <option key={r.id} value={r.id}>
              Day {r.day_number} · {r.display_text} · {r.date}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-4 text-sm text-content">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={withSomeone}
            onChange={(e) => setWithSomeone(e.target.checked)}
          />
          Read with someone
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={onTime}
            onChange={(e) => setOnTime(e.target.checked)}
          />
          Count on-time (keeps streak)
        </label>
      </div>

      {msg && (
        <p className={msg.ok ? "text-xs text-emerald-600" : "text-xs text-red-600"}>
          {msg.text}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={log}
          disabled={!ready || busy}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : "Log reading"}
        </button>
        <button
          onClick={remove}
          disabled={!ready || busy}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
