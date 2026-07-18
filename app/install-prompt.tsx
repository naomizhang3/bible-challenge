"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Minimal type for the (non-standard) beforeinstallprompt event.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Stable no-op subscribe for values that don't change during a session.
const subscribeNever = () => () => {};

function useClientFlag(getClient: () => boolean) {
  return useSyncExternalStore(subscribeNever, getClient, () => false);
}

export default function InstallPrompt() {
  const isIOS = useClientFlag(
    () =>
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window)
  );
  const isStandalone = useClientFlag(
    () => window.matchMedia("(display-mode: standalone)").matches
  );

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  // Already installed — nothing to show.
  if (isStandalone) return null;

  // Chromium/Android/desktop: a real install button once eligible.
  if (deferred) {
    return (
      <button
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
        className="rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/20"
      >
        Install app
      </button>
    );
  }

  // iOS Safari has no install event — show instructions instead.
  if (isIOS) {
    return (
      <p className="max-w-xs text-center text-xs text-black/50 dark:text-white/50">
        To install: tap Share <span aria-hidden>⎋</span> then “Add to Home
        Screen”.
      </p>
    );
  }

  return null;
}
