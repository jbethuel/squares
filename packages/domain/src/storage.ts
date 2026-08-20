import { isDateKey, todayKey, type DateKey } from "./date";
import {
  type AppData,
  type DayRecord,
  type Habit,
  type Span,
  type ThemePreference,
} from "./types";

/**
 * ADR 0002: everything lives on the device. There is no account, no sync and no
 * analytics — which also means clearing site data clears the year, so export
 * exists in v1 rather than as a power-user feature.
 */
/**
 * The key stays `squares.v1` through the ADR 0005 bump to `version: 2`. It names
 * the slot, not the schema — renaming it would orphan every record already on a
 * device, which is the one thing this app cannot do.
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

function parseSpans(value: unknown): Span[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const spans: Span[] = [];
  for (const entry of value) {
    const raw = asRecord(entry);
    if (!raw || !isDateKey(raw.from)) return null;
    if (raw.to !== null && raw.to !== undefined && !isDateKey(raw.to)) return null;
    spans.push({ from: raw.from, to: isDateKey(raw.to) ? raw.to : null });
  }
  return spans;
}

/**
 * A v1 Habit carried `createdOn` and a nullable `archivedOn`, which is exactly
 * one Span. Migrating rather than refusing is not optional: an Export is the
 * only copy of the record that survives this app's storage being cleared, so a
 * rejected file is a destroyed backup.
 */
function migratedSpans(raw: Record<string, unknown>): Span[] | null {
  const { createdOn, archivedOn } = raw;
  if (!isDateKey(createdOn)) return null;
  if (archivedOn !== null && archivedOn !== undefined && !isDateKey(archivedOn)) return null;
  return [{ from: createdOn, to: isDateKey(archivedOn) ? archivedOn : null }];
}

function parseHabit(value: unknown): Habit | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const { id, name } = raw;
  if (typeof id !== "string" || !id) return null;
  if (typeof name !== "string" || !name.trim()) return null;
  const spans = parseSpans(raw.spans) ?? migratedSpans(raw);
  if (!spans) return null;
  return {
    id,
    name: name.trim(),
    spans,
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
  // v1 files are read and migrated; only a version we have never written is
  // refused. See ADR 0005.
  if (raw.version !== 1 && raw.version !== 2) return null;
  if (!isDateKey(raw.installedOn)) return null;

  const habits = Array.isArray(raw.habits)
    ? raw.habits.map(parseHabit).filter((h): h is Habit => h !== null)
    : [];
  const habitIds = new Set(habits.map((h) => h.id));
  const theme = THEMES.includes(raw.theme as ThemePreference)
    ? (raw.theme as ThemePreference)
    : "system";

  return {
    version: 2,
    installedOn: raw.installedOn,
    habits,
    days: parseDays(raw.days, habitIds),
    theme,
  };
}

export function serialise(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function exportFilename(today: DateKey = todayKey()): string {
  return `squares-${today}.json`;
}
