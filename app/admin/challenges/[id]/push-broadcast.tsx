"use client";

import { useState } from "react";

export default function PushBroadcast({ challengeId }: { challengeId: string }) {
  const [title, setTitle] = useState("Bible Reading Challenge");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!body.trim()) return setError("Write a message first.");
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, title, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send.");
      setResult(
        `Sent to ${data.sent} device${data.sent === 1 ? "" : "s"}` +
          (data.failed ? ` · ${data.failed} failed` : "")
      );
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Send a push notification to everyone in this challenge who has turned on
        notifications.
      </p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full rounded-lg border border-hair bg-background px-3 py-2 text-sm text-content placeholder:text-muted"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message"
        rows={3}
        className="w-full rounded-lg border border-hair bg-background px-3 py-2 text-sm text-content placeholder:text-muted"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={send}
          disabled={busy || !body.trim()}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send notification"}
        </button>
        {result && <span className="text-sm text-emerald-600">{result}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
