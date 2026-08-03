import { isDateKey, todayKey, type DateKey } from "./date";
import { sealDays } from "./mutations";
import { emptyData, type AppData, type DayRecord, type Habit, type ThemePreference } from "./types";

/**
 * ADR 0002: everything lives on the device. There is no account, no sync and no
 * analytics — which also means clearing site data clears the year, so export
 * exists in v1 rather than as a power-user feature.
 */
export const STORAGE_KEY = "squares.v1";

const THEMES: ThemePreference[] = ["system", "light", "dark"];

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function parseHabit(value: unknown): Habit | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const { id, name, createdOn, archivedOn } = raw;
  if (typeof id !== "string" || !id) return null;
  if (typeof name !== "string" || !name.trim()) return null;
  if (!isDateKey(createdOn)) return null;
  if (archivedOn !== null && archivedOn !== undefined && !isDateKey(archivedOn)) return null;
  return {
    id,
    name: name.trim(),
    createdOn,
    archivedOn: isDateKey(archivedOn) ? archivedOn : null,
    chained: raw.chained === true,
    sharedName: raw.sharedName === true,
  };
}

function parseDays(value: unknown, habitIds: Set<string>): Record<DateKey, DayRecord> {
  const raw = asRecord(value);
  if (!raw) return {};
  const days: Record<DateKey, DayRecord> = {};
  for (const [date, entry] of Object.entries(raw)) {
    if (!isDateKey(date)) continue;
    const record = asRecord(entry);
    if (!record) continue;
    const active = asStringArray(record.active).filter((id) => habitIds.has(id));
    const ticked = asStringArray(record.ticked).filter((id) => active.includes(id));
    if (active.length === 0) continue;
    days[date] = { date, active, ticked };
  }
  return days;
}

/**
 * Parse a file or a localStorage blob into AppData, discarding anything that
 * does not typecheck rather than trusting it. An import that half-succeeds is
 * worse than one that fails, so a missing or malformed root is rejected.
 */
export function parseAppData(value: unknown): AppData | null {
  const raw = asRecord(value);
  if (!raw) return null;
  if (raw.version !== 1) return null;
  if (!isDateKey(raw.installedOn)) return null;

  const habits = Array.isArray(raw.habits)
    ? raw.habits.map(parseHabit).filter((h): h is Habit => h !== null)
    : [];
  const habitIds = new Set(habits.map((h) => h.id));
  const theme = THEMES.includes(raw.theme as ThemePreference)
    ? (raw.theme as ThemePreference)
    : "system";

  return {
    version: 1,
    installedOn: raw.installedOn,
    habits,
    days: parseDays(raw.days, habitIds),
    theme,
  };
}

export function loadData(today: DateKey = todayKey()): AppData {
  if (typeof localStorage === "undefined") return emptyData(today);
  let parsed: AppData | null = null;
  try {
    const blob = localStorage.getItem(STORAGE_KEY);
    parsed = blob ? parseAppData(JSON.parse(blob)) : null;
  } catch {
    parsed = null;
  }
  return sealDays(parsed ?? emptyData(today), today);
}

export function saveData(data: AppData): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // A full or blocked store must not take the app down mid-Tick. The Tick is
    // still in memory; the next write will retry.
  }
}

export function serialise(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function exportFilename(today: DateKey = todayKey()): string {
  return `squares-${today}.json`;
}
