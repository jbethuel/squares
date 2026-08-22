import type { DateKey } from "./date";
import { activeOn, dateAt, elapsedDays, isArchived, isOpen } from "./selectors";
import type { AppData, Habit, Span, ThemePreference } from "./types";

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * Materialise the Day Records for every elapsed Day.
 *
 * Open Days (today, yesterday) have their Active set refreshed, so a Habit
 * added today counts toward today's Intensity. A closed Day is written once —
 * with whatever was Active and nothing Ticked if it was never opened — and is
 * then never touched again.
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
    spans: [{ from: today, to: null }],
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

/** Close every open Span at today: the Habit is Active up to, but not on, today. */
function closeSpans(spans: Span[], today: DateKey): Span[] {
  return spans.map((span) => (span.to === null ? { ...span, to: today } : span));
}

/**
 * Reopen the Habit from today forward.
 *
 * Archiving and changing your mind on the same Day is an undo, not a new Span —
 * otherwise every mis-tap would leave a zero-length Span in the record forever.
 * On any later Day the old Span stays closed and a new one opens, so the Days
 * spent Archived remain a gap.
 */
function openSpan(spans: Span[], today: DateKey): Span[] {
  const last = spans[spans.length - 1];
  if (last && last.to === today) return [...spans.slice(0, -1), { ...last, to: null }];
  return [...spans, { from: today, to: null }];
}

/**
 * Archive a Habit or take it back out, from today forward either way.
 *
 * Every past Tick stays in the year and in the Total; the Day Records that
 * counted it are untouched, and the Days it spends Archived are never
 * backdated away. There is no delete. See ADR 0003.
 */
export function setArchived(
  data: AppData,
  id: string,
  archived: boolean,
  today: DateKey,
): AppData {
  const habit = data.habits.find((h) => h.id === id);
  if (!habit || isArchived(habit, today) === archived) return data;
  const spans = archived ? closeSpans(habit.spans, today) : openSpan(habit.spans, today);
  return sealDays(patchHabit(data, id, { spans }), today);
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
