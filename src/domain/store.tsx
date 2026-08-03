"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { todayKey, type DateKey } from "./date";
import { sealDays } from "./mutations";
import { loadData, saveData } from "./storage";
import type { AppData, ThemePreference } from "./types";

interface Store {
  data: AppData;
  /** Today, re-resolved while the app is open so a Day rolls over under it. */
  today: DateKey;
  update: (change: (data: AppData) => AppData) => void;
  replace: (data: AppData) => void;
}

const StoreContext = createContext<Store | null>(null);

export type ResolvedTheme = "light" | "dark";

/** Dark is the designed theme; light is a port. */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState<DateKey>(() => todayKey());
  // Storage is only readable on the client, so the first paint is deliberately
  // blank rather than a skeleton of data that may not exist.
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    const now = todayKey();
    setToday(now);
    setData(loadData(now));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setToday((previous) => {
        const now = todayKey();
        return previous === now ? previous : now;
      });
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  // A rollover seals yesterday and opens today. sealDays returns the same
  // object when there is nothing to do, so this cannot loop.
  useEffect(() => {
    setData((previous) => (previous ? sealDays(previous, today) : previous));
  }, [today]);

  useEffect(() => {
    if (data) saveData(data);
  }, [data]);

  const update = useCallback((change: (data: AppData) => AppData) => {
    setData((previous) => (previous ? change(previous) : previous));
  }, []);

  const replace = useCallback((next: AppData) => setData(next), []);

  const value = useMemo(
    () => (data ? { data, today, update, replace } : null),
    [data, today, update, replace],
  );

  useApplyTheme(data?.theme ?? "system");

  if (!value) return null;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function useApplyTheme(preference: ThemePreference) {
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
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside a StoreProvider");
  return store;
}
