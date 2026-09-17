"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../src/lib/supabase/client";

type Group = { id: string; name: string };

export default function OnboardingForm({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return setError("Not signed in.");
    }
    const { error } = await supabase
      .from("profiles")
      .update({ group_id: selected })
      .eq("id", user.id);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setSelected(g.id)}
            className={
              "w-full rounded-2xl border p-4 text-left font-serif text-lg font-semibold transition " +
              (selected === g.id
                ? "border-brand bg-brand/[0.05] text-heading ring-1 ring-brand/30"
                : "border-hair bg-surface text-heading hover:border-brand/50")
            }
          >
            {g.name}
          </button>
        ))}
        {groups.length === 0 && (
          <p className="text-sm text-muted">
            No groups are set up yet. Please check back soon.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={save}
        disabled={!selected || busy}
        className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
