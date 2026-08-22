import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { addDays, type DateKey } from "@squares/domain/date";
import { STORAGE_KEY } from "@squares/domain/storage";
import { StoreProvider } from "@squares/domain/store";
import { webStorage } from "@/platform/storage";
import { ApplyTheme } from "@/platform/theme";
import { emptyData, type AppData } from "@squares/domain/types";

/** A Monday, so the weekday row of a Square is predictable. */
export const TODAY: DateKey = "2026-08-03";
export const YESTERDAY = addDays(TODAY, -1);
/** Closed, like every Day but today. */
export const CLOSED = addDays(TODAY, -2);

interface AccountSpec {
  /** Days on file, day one counting as 1. */
  age?: number;
  habits?: string[];
  /** Habit name -> the Day offsets it was Logged on. 0 is today. */
  logs?: Record<string, number[]>;
  /** Habits whose Span was closed at today, so they read as Hidden. */
  hidden?: string[];
}

export function idOf(data: AppData, name: string): string {
  const habit = data.habits.find((h) => h.name === name);
  if (!habit) throw new Error(`no habit named ${name}`);
  return habit.id;
}

/** Write Logs straight into the record, past ADR 0002, to build history. */
export function seed(data: AppData, habitId: string, offsets: number[]): AppData {
  const days = { ...data.days };
  for (const offset of offsets) {
    const date = addDays(TODAY, -offset);
    const logged = days[date]?.logged ?? [];
    if (!logged.includes(habitId)) days[date] = { date, logged: [...logged, habitId] };
  }
  return { ...data, days };
}

/**
 * An account installed `age` Days ago, with every Habit taken up that Day.
 * Habits are built directly rather than through addHabit so that their ids are
 * predictable.
 */
export function account({
  age = 30,
  habits = [],
  logs = {},
  hidden = [],
}: AccountSpec = {}): AppData {
  const installedOn = addDays(TODAY, -(age - 1));
  let data: AppData = {
    ...emptyData(installedOn),
    habits: habits.map((name, index) => ({
      id: `h${index + 1}`,
      name,
      spans: [{ from: installedOn, to: hidden.includes(name) ? TODAY : null }],
      streaks: false,
      sharedName: false,
    })),
  };
  for (const [name, offsets] of Object.entries(logs)) {
    data = seed(data, idOf(data, name), offsets);
  }
  return data;
}

/** Put an account on the device, as a previous session would have left it. */
export function onDevice(data: AppData): AppData {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

export function storedData(): AppData {
  const blob = localStorage.getItem(STORAGE_KEY);
  if (!blob) throw new Error("nothing stored");
  return JSON.parse(blob) as AppData;
}

/**
 * The app's own wiring, so a screen under test sees what it sees in the app:
 * the shared store over the web's localStorage, with the Theme painted onto the
 * document by the same component `page.tsx` mounts.
 */
export function withStore(children: ReactNode) {
  return (
    <StoreProvider storage={webStorage}>
      <ApplyTheme />
      {children}
    </StoreProvider>
  );
}

/** Render a screen against whatever account is currently on the device. */
export function renderWithStore(ui: ReactElement): RenderResult {
  return render(withStore(ui));
}
