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
import type { AppData } from "./types";

interface Store {
  data: AppData;
  /** Today, re-resolved while the app is open so a Day rolls over under it. */
  today: DateKey;
  update: (change: (data: AppData) => AppData) => void;
  replace: (data: AppData) => void;
}

/**
 * Where the record is kept. Injected rather than imported, because the engine
 * differs by platform — localStorage on the web, an app-private store on the
 * phone — while everything below has to be identical on both (ADR 0007). The
 * rollover effect below decides which Day is open, and by ADR 0002 that is the
 * only Day that can be Logged, so two copies of it could disagree about the one
 * thing the user is allowed to do.
 */
export interface StorageAdapter {
  load: (today: DateKey) => AppData;
  save: (data: AppData) => void;
}

const StoreContext = createContext<Store | null>(null);

/** How often the clock is re-read while the app is open. */
const ROLLOVER_POLL_MS = 30_000;

export function StoreProvider({
  storage,
  children,
}: {
  storage: StorageAdapter;
  children: ReactNode;
}) {
  const [today, setToday] = useState<DateKey>(() => todayKey());
  // Storage is only readable on the client, so the first paint is deliberately
  // blank rather than a skeleton of data that may not exist.
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    const now = todayKey();
    setToday(now);
    setData(storage.load(now));
    // The adapter is a module constant on both platforms; re-running this on a
    // new identity would reload the record over unsaved state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bare `setInterval`, not `window.setInterval`: there is no window on the
  // phone. A backgrounded app stops getting these, so a native shell has to
  // re-read the clock on resume as well — see ADR 0007.
  useEffect(() => {
    const id = setInterval(() => {
      setToday((previous) => {
        const now = todayKey();
        return previous === now ? previous : now;
      });
    }, ROLLOVER_POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (data) storage.save(data);
  }, [data, storage]);

  const update = useCallback((change: (data: AppData) => AppData) => {
    setData((previous) => (previous ? change(previous) : previous));
  }, []);

  const replace = useCallback((next: AppData) => setData(next), []);

  const value = useMemo(
    () => (data ? { data, today, update, replace } : null),
    [data, today, update, replace],
  );

  if (!value) return null;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside a StoreProvider");
  return store;
}
