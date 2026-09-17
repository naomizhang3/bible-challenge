"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../src/lib/supabase/client";

type Group = { id: string; name: string };

export default function ProfileForm({
  initialDisplayName,
  initialGroupId,
  groups,
}: {
  initialDisplayName: string;
  initialGroupId: string;
  groups: Group[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [groupId, setGroupId] = useState(initialGroupId);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const dirty =
    displayName.trim() !== initialDisplayName || groupId !== initialGroupId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("saving");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStatus("error");
      setError("Not signed in.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        group_id: groupId || null,
      })
      .eq("id", user.id);

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }

    setStatus("saved");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Display name</span>
        <input
          type="text"
          required
          maxLength={80}
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setStatus("idle");
          }}
          className="w-full rounded-lg border border-hair bg-background px-3 py-2 text-content"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Group</span>
        <select
          value={groupId}
          onChange={(e) => {
            setGroupId(e.target.value);
            setStatus("idle");
          }}
          className="w-full rounded-lg border border-hair bg-background px-3 py-2 text-content"
        >
          <option value="">No group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {status === "saved" && <p className="text-sm text-green-600">Saved.</p>}

      <button
        type="submit"
        disabled={!dirty || !displayName.trim() || status === "saving"}
        className="rounded-lg bg-brand px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {status === "saving" ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
