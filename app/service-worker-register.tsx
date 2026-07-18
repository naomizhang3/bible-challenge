"use client";

import { useEffect } from "react";

// Registers the service worker so the app is installable and push-ready.
// Renders nothing.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // Registration failures are non-fatal (e.g. unsupported/HTTP dev).
        });
    }
  }, []);

  return null;
}
