import { weekdayOf, type DateKey } from "./date";
import { gridGeometry, gridHeight, type Frame } from "./grid";
import { lensFrame, lensRows, type Lens } from "./lens";
import { dateAt, intensityAt, isHidden, totalLogsIn } from "./selectors";
import type { AppData, Intensity } from "./types";

/**
 * What a Share Card is allowed to contain: a year of shape, one number, and —
 * only if each Habit was individually opted in — a single line of names.
 *
 * No dates, no handle, no per-Habit breakdown, and nothing that identifies the
 * device. The card is anonymous by default because people track "took my meds"
 * and "no drinking", and a card that leaks a name is the one unforgivable bug.
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
  /** Named Habits only. Empty unless the user opted a Habit in by hand. */
  names: string[];
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
    // so it reaches no card whatever its opt-in says.
    names: data.habits
      .filter((habit) => habit.sharedName && !isHidden(habit, today))
      .map((habit) => habit.name.trim().toLowerCase()),
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
  return (
    PAD +
    gridHeight(cardGeometry(model)) +
    GRID_TO_TOTAL +
    TOTAL_SIZE +
    5 +
    CAPTION_SIZE +
    names +
    PAD
  );
}

export function cardSize(model: ShareCardModel, scale: number) {
  return { width: Math.round(CARD_WIDTH * scale), height: Math.round(cardHeight(model) * scale) };
}
