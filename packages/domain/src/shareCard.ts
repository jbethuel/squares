import { weekdayOf, type DateKey } from "./date";
import { gridGeometry, gridHeight, type Frame } from "./grid";
import { lensFrame, lensRows, type Lens } from "./lens";
import {
  dateAt,
  intensityAt,
  isHidden,
  isLogged,
  logCountIn,
  streakOf,
  totalLogsIn,
} from "./selectors";
import type { AppData, Intensity } from "./types";

/**
 * What a Share Card is allowed to contain: a year of shape, one number, and a
 * line naming every Habit it draws from.
 *
 * No dates, no handle, no per-Habit breakdown, and nothing that identifies the
 * device. ADR 0010: naming is unconditional — Hide is the only way to keep a
 * Habit off a card at all. One shape serves both kinds (ADR 0011): an Overview
 * Card and a Habit Card differ only in how `levels`, `tally`, `names` and
 * `streak` are filled in, not in what the geometry and drawing code expect.
 */
export interface ShareCardModel {
  /** How much of the record this card draws. Chosen on the card's own Screen. */
  lens: Lens;
  frame: Frame;
  /** Rows the frame is drawn in: one for the Week, seven otherwise. */
  rows: number;
  weekday: number;
  /**
   * Intensity by offset; index 0 is today. A Day still to come has a negative
   * offset and is simply absent, which reads as Intensity 0 — which is what it
   * is, and what the Overview draws it at too.
   */
  levels: Intensity[];
  /**
   * The Tally: Logs inside the Frame drawn. This is *not* the Total — under
   * the Week or the Month it counts a handful of Days and can be zero. A number
   * that can fall may not be called a Total; see CONTEXT.md.
   */
  tally: number;
  /** Every Habit this card draws from, named. See ADR 0010: there is no opt-out. */
  names: string[];
  /**
   * Set only by a Habit Card, and only if that Habit is a Streak Habit — the
   * same gate that Habit's own Screen uses. Always null on an Overview Card,
   * which has no one Habit to keep a Streak for. See ADR 0011.
   */
  streak: number | null;
}

export function shareCardModel(data: AppData, today: DateKey, lens: Lens): ShareCardModel {
  const frame = lensFrame(lens, today);
  const levels: Intensity[] = [];
  for (let offset = 0; offset < frame.back; offset++) {
    levels.push(intensityAt(data, dateAt(today, offset), today));
  }
  return {
    lens,
    frame,
    rows: lensRows(lens),
    weekday: weekdayOf(today),
    levels,
    tally: totalLogsIn(data, today, frame.back),
    // ADR 0001: a Hidden Habit is not in the Overview this card is drawn from,
    // so it reaches no card. Every other Habit is named — ADR 0010.
    names: data.habits
      .filter((habit) => !isHidden(habit, today))
      .map((habit) => habit.name.trim().toLowerCase()),
    streak: null,
  };
}

/**
 * ADR 0011: a Habit Card is still a Share Card, so a Hidden Habit gets none —
 * this returns null exactly where that Habit's own Screen would have nothing
 * to share from.
 */
export function habitCardModel(
  data: AppData,
  habitId: string,
  today: DateKey,
  lens: Lens,
): ShareCardModel | null {
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit || isHidden(habit, today)) return null;

  const frame = lensFrame(lens, today);
  const levels: Intensity[] = [];
  for (let offset = 0; offset < frame.back; offset++) {
    // A Habit Heatmap is binary and uses level 3 only — the same rule the
    // Habit's own Screen draws by. A gradient here would be a lie: there is
    // nothing to be partial about.
    levels.push(isLogged(data, habitId, dateAt(today, offset)) ? 3 : 0);
  }
  return {
    lens,
    frame,
    rows: lensRows(lens),
    weekday: weekdayOf(today),
    levels,
    tally: logCountIn(data, habitId, today, frame.back),
    names: [habit.name.trim().toLowerCase()],
    streak: habit.streaks ? streakOf(data, habitId, today) : null,
  };
}

/**
 * Card geometry, in card units. The exported PNG is this times `scale`.
 *
 * Exported because the drawing forks by platform (ADR 0007) while these do not:
 * a Share Card whose measurements differ between web and phone is a Share Card
 * nobody can trust.
 */
export const CARD_WIDTH = 320;
export const PAD = 22;
export const RADIUS = 14;
export const GRID_TO_TOTAL = 18;
export const TOTAL_SIZE = 30;
export const CAPTION_SIZE = 9.5;
export const NAMES_SIZE = 9.5;
export const MARK_SIZE = 9;

export const FONT = '"Hack", ui-monospace, SFMono-Regular, Menlo, monospace';

/**
 * The card draws the Lens's Frame exactly as the Overview does — the whole
 * Week, the whole Month, the whole Year — including Days still to come and Days
 * from before the account existed, all at Intensity 0.
 *
 * It used to trim to the Days that had happened, on the grounds that a card is a
 * record rather than a screen. That stopped working the moment the card had a
 * Lens: a Week card made on a Wednesday would be four Squares, and four Squares
 * do not read as a week. One rule for all three Lenses, and the shape of a card
 * no longer depends on the day you made it.
 */
export function cardGeometry(model: ShareCardModel) {
  return gridGeometry(CARD_WIDTH - PAD * 2, model.frame, model.weekday, model.rows);
}

export function cardHeight(model: ShareCardModel): number {
  const names = model.names.length > 0 ? NAMES_SIZE + 6 : 0;
  const streak = model.streak !== null ? NAMES_SIZE + 6 : 0;
  return (
    PAD +
    gridHeight(cardGeometry(model)) +
    GRID_TO_TOTAL +
    TOTAL_SIZE +
    5 +
    CAPTION_SIZE +
    names +
    streak +
    PAD
  );
}

export function cardSize(model: ShareCardModel, scale: number) {
  return { width: Math.round(CARD_WIDTH * scale), height: Math.round(cardHeight(model) * scale) };
}
