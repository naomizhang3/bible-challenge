"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../src/lib/supabase/client";

// Convert a base64url VAPID public key to the Uint8Array the Push API expects.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushToggle() {
  const supabase = createClient();
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // iOS only allows web push from an installed (home-screen) PWA.
  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari exposes this non-standard flag.
      (navigator as unknown as { standalone?: boolean }).standalone === true);

  useEffect(() => {
    (async () => {
      const ok =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      setSupported(ok);
      if (ok) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          setSubscribed(!!sub);
        } catch {
          // ignore
        }
      }
      setReady(true);
    })();
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notifications are blocked. Enable them in your settings.");
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
      const json = sub.toJSON();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");
      // Upsert on user_id so one person keeps a single subscription (re-enabling
      // on another browser/device replaces the old one instead of duplicating).
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;
      setSubscribed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't enable notifications.");
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't turn off notifications.");
    }
    setBusy(false);
  }

  if (!ready) return null;

  if (!supported) {
    return (
      <p className="text-sm text-muted">
        This browser doesn&apos;t support notifications.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-heading">
            Push notifications
          </div>
          <div className="text-xs text-muted">
            {subscribed
              ? "On for this device."
              : "Get reminders and updates on this device."}
          </div>
        </div>
        <button
          onClick={subscribed ? disable : enable}
          disabled={busy}
          className={
            "shrink-0 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 " +
            (subscribed
              ? "border border-hair text-muted"
              : "bg-brand text-white")
          }
        >
          {busy ? "…" : subscribed ? "Turn off" : "Turn on"}
        </button>
      </div>

      {isIOS && !isStandalone && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          On iPhone/iPad, add this app to your Home Screen first (Share → “Add to
          Home Screen”), then open it from there to enable notifications.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
