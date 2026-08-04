import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { addDays, type DateKey } from "@/domain/date";
import { sealDays } from "@/domain/mutations";
import { STORAGE_KEY } from "@/domain/storage";
import { StoreProvider } from "@/domain/store";
import { emptyData, type AppData } from "@/domain/types";

/** A Monday, so the weekday row of a Square is predictable. */
export const TODAY: DateKey = "2026-08-03";
export const YESTERDAY = addDays(TODAY, -1);
/** Outside the Grace Window, permanently. */
export const CLOSED = addDays(TODAY, -2);

interface AccountSpec {
  /** Days on file, day one counting as 1. */
  age?: number;
  habits?: string[];
  /** Habit name -> the Day offsets it was Ticked on. 0 is today. */
  ticks?: Record<string, number[]>;
}

export function idOf(data: AppData, name: string): string {
  const habit = data.habits.find((h) => h.name === name);
  if (!habit) throw new Error(`no habit named ${name}`);
  return habit.id;
}

/** Tick straight into the record, bypassing the Grace Window, to build history. */
export function seed(data: AppData, habitId: string, offsets: number[]): AppData {
  const days = { ...data.days };
  for (const offset of offsets) {
    const date = addDays(TODAY, -offset);
    const record = days[date];
    if (!record) throw new Error(`no record for ${date}`);
    if (!record.ticked.includes(habitId)) {
      days[date] = { ...record, ticked: [...record.ticked, habitId] };
    }
  }
  return { ...data, days };
}

/**
 * An account installed `age` Days ago, with every Habit created that Day, then
 * sealed up to today. Habits are built directly rather than through addHabit so
 * that the seal happens exactly once, at today.
 */
export function account({ age = 30, habits = [], ticks = {} }: AccountSpec = {}): AppData {
  const installedOn = addDays(TODAY, -(age - 1));
  let data = sealDays(
    {
      ...emptyData(installedOn),
      habits: habits.map((name, index) => ({
        id: `h${index + 1}`,
        name,
        createdOn: installedOn,
        archivedOn: null,
        chained: false,
        sharedName: false,
      })),
    },
    TODAY,
  );
  for (const [name, offsets] of Object.entries(ticks)) {
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

export function withStore(children: ReactNode) {
  return <StoreProvider>{children}</StoreProvider>;
}

/** Render a screen against whatever account is currently on the device. */
export function renderWithStore(ui: ReactElement): RenderResult {
  return render(withStore(ui));
}
