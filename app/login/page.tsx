"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../src/lib/supabase/client";
import ThemeToggle from "../theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName || undefined } },
          });

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
        {/* Brand hero */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="relative flex flex-col items-center">
            <Rays />
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/20">
              <BookOpen />
            </span>
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold text-heading">
            Bible Reading Challenge
          </h1>
          <p className="mt-1 font-serif text-[15px] italic text-muted">
            Read the Word, together.
          </p>
        </div>

        {/* Card */}
        <div className="space-y-4 rounded-2xl border border-hair bg-surface p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-heading">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-hair bg-surface px-3 py-2.5 text-sm font-medium text-content transition hover:bg-surface-muted disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-hair" />
            or
            <span className="h-px flex-1 bg-hair" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
              />
            )}
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : "Sign up"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="w-full text-sm text-muted hover:text-heading"
          >
            {mode === "signin"
              ? "Need an account? Sign up"
              : "Have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}

// Amber sunburst echoing the logo's rays.
function Rays() {
  return (
    <svg
      width="120"
      height="40"
      viewBox="0 0 120 40"
      className="absolute -top-9 text-amber-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M60 4v10M40 9l4 9M80 9l-4 9M22 20l7 6M98 20l-7 6" />
    </svg>
  );
}

function BookOpen() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 6.5A6 6 0 0 0 6 4c-1 0-2 .2-3 .5v13A6 6 0 0 1 6 17c2.2 0 4 .8 6 2m0-12.5A6 6 0 0 1 18 4c1 0 2 .2 3 .5v13A6 6 0 0 0 18 17a6 6 0 0 0-6 2m0-12.5V19" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22 22-9.8 22-22c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 15.9 2 8.8 6.6 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 46c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5c-2 1.5-4.7 2.5-7.6 2.5-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C8.7 41.3 15.8 46 24 46z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.5 5.5c-.5.4 7.3-5.3 7.3-15 0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
