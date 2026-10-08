"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/client";
import ThemeToggle from "../../theme-toggle";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The /auth/callback exchange should have set a recovery session already.
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setHasSession(!!user);
      setReady(true);
    })();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border border-hair bg-background px-3 py-2.5 text-content placeholder:text-muted focus:border-brand focus:outline-none";

  return (
    <main className="relative flex flex-1 items-center justify-center p-6">
      <div className="absolute right-5 top-5 text-muted">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="space-y-4 rounded-2xl border border-hair bg-surface p-6 shadow-sm">
          <h1 className="font-serif text-lg font-semibold text-heading">
            Set a new password
          </h1>

          {!ready ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : !hasSession ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                This reset link is invalid or has expired. Request a new one from
                the login page.
              </p>
              <button
                onClick={() => router.replace("/login")}
                className="w-full rounded-lg bg-brand px-3 py-2.5 text-sm font-medium text-white"
              >
                Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="password"
                required
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              <input
                type="password"
                required
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? "Saving…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
