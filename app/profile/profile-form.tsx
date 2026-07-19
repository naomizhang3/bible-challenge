"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../src/lib/supabase/client";

type Props = {
  initialDisplayName: string;
  initialAvatarUrl: string;
};

export default function ProfileForm({
  initialDisplayName,
  initialAvatarUrl,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const dirty =
    displayName !== initialDisplayName || avatarUrl !== initialAvatarUrl;

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
        avatar_url: avatarUrl.trim() || null,
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
      {avatarUrl.trim() && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt="Avatar preview"
          className="h-16 w-16 rounded-full object-cover"
        />
      )}

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
          className="w-full rounded-md border border-hair px-3 py-2 dark:border-white/20 dark:bg-transparent"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Avatar URL</span>
        <input
          type="url"
          placeholder="https://…"
          value={avatarUrl}
          onChange={(e) => {
            setAvatarUrl(e.target.value);
            setStatus("idle");
          }}
          className="w-full rounded-md border border-hair px-3 py-2 dark:border-white/20 dark:bg-transparent"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {status === "saved" && (
        <p className="text-sm text-green-600">Saved.</p>
      )}

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
