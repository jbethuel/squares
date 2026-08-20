"use client";

import { useEffect } from "react";

/** ADR 0002: the app has to open and work with no network at all. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline is a nicety here, not a requirement for the app to run.
    });
  }, []);
  return null;
}
