import type { DateKey } from "./date";
import { isActiveOn, isHidden, isToday } from "./selectors";
import type { AppData, Habit, Span, ThemePreference } from "./types";

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
    streaks: false,
    sharedName: false,
  };
  return { ...data, habits: [...data.habits, habit] };
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
 * Hiding and changing your mind on the same Day is an undo, not a new Span —
 * otherwise every mis-tap would leave a zero-length Span in the record forever.
 * On any later Day the old Span stays closed and a new one opens, so the Days
 * spent Hidden remain a gap.
 */
function openSpan(spans: Span[], today: DateKey): Span[] {
  const last = spans[spans.length - 1];
  if (last && last.to === today) return [...spans.slice(0, -1), { ...last, to: null }];
  return [...spans, { from: today, to: null }];
}

/**
 * Hide a Habit or bring it back, from today forward either way.
 *
 * ADR 0001: every Log the Habit ever made stays in the record, but a Hidden
 * Habit is out of the Overview and out of the Total, so Hiding re-shades the
 * year behind it. Bringing it back restores those Squares. The Days it spent
 * Hidden are never backdated away. See ADR 0003. There is no delete.
 */
export function setHidden(data: AppData, id: string, hidden: boolean, today: DateKey): AppData {
  const habit = data.habits.find((h) => h.id === id);
  if (!habit || isHidden(habit, today) === hidden) return data;
  const spans = hidden ? closeSpans(habit.spans, today) : openSpan(habit.spans, today);
  return patchHabit(data, id, { spans });
}

export function setStreaks(data: AppData, id: string, streaks: boolean): AppData {
  return patchHabit(data, id, { streaks });
}

export function setSharedName(data: AppData, id: string, sharedName: boolean): AppData {
  return patchHabit(data, id, { sharedName });
}

export function setTheme(data: AppData, theme: ThemePreference): AppData {
  return { ...data, theme };
}

/**
 * The Log. Binary, and only ever on today, on a Habit that is Active today.
 *
 * ADR 0002 is enforced here rather than in the interface: the past is not
 * editable, and neither is the future. Un-logging today stays possible right up
 * to local midnight, because today is not yet a record.
 *
 * A Day with no Logs keeps no record — an empty one would carry nothing, now
 * that the Active set is derived rather than stored.
 */
export function toggleLog(data: AppData, habitId: string, date: DateKey, today: DateKey): AppData {
  if (!isToday(date, today)) return data;
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit || !isActiveOn(habit, date)) return data;

  const record = data.days[date];
  const logged = record?.logged ?? [];
  const next = logged.includes(habitId)
    ? logged.filter((id) => id !== habitId)
    : [...logged, habitId];

  const days = { ...data.days };
  if (next.length === 0) delete days[date];
  else days[date] = { date, logged: next };
  return { ...data, days };
}
