import type { DateKey } from "./date";
import { activeOn, dateAt, elapsedDays, isOpen } from "./selectors";
import type { AppData, Habit, ThemePreference } from "./types";

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * Materialise the Day Records for every elapsed Day.
 *
 * Open Days (today, yesterday) have their Active set refreshed, so a Habit
 * added today counts toward today's Intensity. A closed Day is written once —
 * with whatever was Active and nothing Ticked if it was never opened — and is
 * then never touched again. That is the whole of ADR 0001 in one loop.
 */
export function sealDays(data: AppData, today: DateKey): AppData {
  const span = elapsedDays(data, today);
  const days = { ...data.days };
  let changed = false;

  for (let offset = 0; offset < span; offset++) {
    const date = dateAt(today, offset);
    const active = activeOn(data.habits, date);
    const existing = days[date];

    if (isOpen(date, today)) {
      const ticked = existing ? existing.ticked.filter((id) => active.includes(id)) : [];
      if (active.length === 0) {
        if (existing) {
          delete days[date];
          changed = true;
        }
        continue;
      }
      if (!existing || !sameSet(existing.active, active) || !sameSet(existing.ticked, ticked)) {
        days[date] = { date, active, ticked };
        changed = true;
      }
    } else if (!existing && active.length > 0) {
      days[date] = { date, active, ticked: [] };
      changed = true;
    }
  }

  return changed ? { ...data, days } : data;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function addHabit(data: AppData, name: string, today: DateKey): AppData {
  const trimmed = name.trim();
  if (!trimmed) return data;
  const habit: Habit = {
    id: newId(),
    name: trimmed,
    createdOn: today,
    archivedOn: null,
    chained: false,
    sharedName: false,
  };
  return sealDays({ ...data, habits: [...data.habits, habit] }, today);
}

function patchHabit(data: AppData, id: string, patch: Partial<Habit>): AppData {
  return { ...data, habits: data.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) };
}

export function renameHabit(data: AppData, id: string, name: string): AppData {
  const trimmed = name.trim();
  if (!trimmed) return data;
  return patchHabit(data, id, { name: trimmed });
}

/**
 * Retire a Habit from today forward. Every past Tick stays in the year and in
 * the Total; the Day Records that counted it are untouched. There is no delete.
 */
export function archiveHabit(data: AppData, id: string, today: DateKey): AppData {
  const habit = data.habits.find((h) => h.id === id);
  if (!habit || habit.archivedOn !== null) return data;
  return sealDays(patchHabit(data, id, { archivedOn: today }), today);
}

export function setChained(data: AppData, id: string, chained: boolean): AppData {
  return patchHabit(data, id, { chained });
}

export function setSharedName(data: AppData, id: string, sharedName: boolean): AppData {
  return patchHabit(data, id, { sharedName });
}

export function setTheme(data: AppData, theme: ThemePreference): AppData {
  return { ...data, theme };
}

/**
 * The Tick. Binary, and only ever on a Day inside the Grace Window on which the
 * Habit was Active — the past is not editable, and neither is the future.
 */
export function toggleTick(data: AppData, habitId: string, date: DateKey, today: DateKey): AppData {
  if (!isOpen(date, today)) return data;
  const record = data.days[date];
  if (!record || !record.active.includes(habitId)) return data;
  const ticked = record.ticked.includes(habitId)
    ? record.ticked.filter((id) => id !== habitId)
    : [...record.ticked, habitId];
  return { ...data, days: { ...data.days, [date]: { ...record, ticked } } };
}
