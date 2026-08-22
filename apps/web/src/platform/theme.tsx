"use client";

import { useEffect } from "react";
import { useStore } from "@squares/domain/store";
import type { ThemePreference } from "@squares/domain/types";

export type ResolvedTheme = "light" | "dark";

/** Dark is the designed theme; light is a port. */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/**
 * Paint the chosen Theme onto the document.
 *
 * This is the web's alone — there is no `documentElement` on the phone — so it
 * sits beside the store rather than inside it (ADR 0007). It renders nothing
 * and lives under `StoreProvider` because the preference is part of the record.
 * The first frame is already correct without it: `layout.tsx` inlines a
 * bootstrap script that sets `data-theme` before React hydrates.
 */
export function ApplyTheme() {
  const { data } = useStore();
  const preference = data.theme;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const resolved = resolveTheme(preference);
      document.documentElement.dataset.theme = resolved;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", resolved === "light" ? "#ffffff" : "#1c211b");
    };
    apply();
    if (preference !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference]);

  return null;
}
