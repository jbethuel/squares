"use client";

import { useEffect, useState } from "react";
import { Heatmap } from "@/components/Heatmap";
import { LensPicker } from "@/components/LensPicker";
import { ToggleRow } from "@/components/Toggle";
import { longLabel, weekdayOf } from "@/domain/date";
import {
  DEFAULT_LENS,
  lensFrame,
  lensMonths,
  lensNoun,
  lensRows,
  lensScrolls,
  type Lens,
} from "@/domain/lens";
import { renameHabit, setArchived, setChained, setSharedName } from "@/domain/mutations";
import {
  chainOf,
  dateAt,
  isArchived,
  isTicked,
  longestChainOf,
  tickCountIn,
  tickCountOf,
} from "@/domain/selectors";
import { useStore } from "@/domain/store";

export function DetailScreen({ habitId }: { habitId: string }) {
  const { data, today, update } = useStore();
  // Declared above the missing-Habit guard: a hook may not sit behind a return.
  const [lens, setLens] = useState<Lens>(DEFAULT_LENS);
  const [draft, setDraft] = useState<string | null>(null);
  const habit = data.habits.find((h) => h.id === habitId);

  // The draft is dropped whenever the stored name changes under it, so the
  // field cannot go on showing a name the record no longer holds.
  useEffect(() => setDraft(null), [habit?.name]);

  if (!habit) return null;

  const archived = isArchived(habit, today);
  const frame = lensFrame(lens, today);
  const ticks = tickCountOf(data, habitId, today);

  // Blank reverts rather than rejects: there is no error to show and no button
  // to disable, because there is no save.
  const commitName = () => {
    if (draft === null) return;
    update((current) => renameHabit(current, habitId, draft));
    setDraft(null);
  };

  return (
    <>
      {/* The name leads the Screen and is the field that changes it. The way out
          is the bar at the bottom. */}
      <h1 style={{ margin: 0 }}>
        <input
          className="title-field"
          aria-label="habit name"
          value={draft ?? habit.name}
          maxLength={40}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") setDraft(null);
          }}
        />
      </h1>

      {/*
        An unchained Habit has one number, not three. It used to show the Tick
        count as the hero and again in the third slot, with an em dash where the
        longest Chain would go — the same figure under two labels, next to a
        stat that reads as something that failed to load.

        An Archived Habit is shown no current Chain even when Chained: a Chain
        counts back from today, and a Habit that cannot be Ticked today would
        read 0 forever. What it did, and its longest run, are still true.
      */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 26, margin: "22px 0 24px" }}>
        <div>
          <div className="stat-value stat-hero" data-chained={habit.chained && !archived}>
            {habit.chained && !archived ? chainOf(data, habitId, today) : ticks}
          </div>
          <div className="stat-label">{habit.chained && !archived ? "chain" : "ticks"}</div>
        </div>
        {habit.chained ? (
          <>
            <div>
              <div className="stat-value">{longestChainOf(data, habitId, today)}</div>
              <div className="stat-label">longest</div>
            </div>
            {archived ? null : (
              <div>
                <div className="stat-value">{ticks}</div>
                <div className="stat-label">ticks</div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/*
        The picker sits on its own line above the grid, as it does on Home,
        rather than sharing one with the label: at 350px the label wraps if it
        has to share, and a two-line caption above a grid reads as a fault.
      */}
      <p className="label" style={{ margin: "0 0 9px" }}>
        every day of {lensNoun(lens)} · ticked or not
      </p>
      <div style={{ marginBottom: 8 }}>
        <LensPicker value={lens} onChange={setLens} label={`how much of ${habit.name} to draw`} />
      </div>
      {/*
        A Habit Heatmap is binary and uses level 3 only. A gradient here would
        be a lie — there is nothing to be partial about.

        Today is ringed here as well as on Home. Under the Week and the Month
        the frame runs on past today, so without the ring there is no way to
        tell a Day that was missed from one that has not happened.
      */}
      <Heatmap
        frame={frame}
        weekday={weekdayOf(today)}
        rows={lensRows(lens)}
        scrolls={lensScrolls(lens)}
        today={today}
        months={lensMonths(lens)}
        levelFor={(offset) => (isTicked(data, habitId, dateAt(today, offset)) ? 3 : 0)}
        titleFor={(offset) => longLabel(dateAt(today, offset))}
        ariaLabel={`${habit.name}: ${tickCountIn(data, habitId, today, frame.back)} ticks across ${lensNoun(lens)}`}
        markToday
      />

      {/*
        While a Habit is Archived neither the Card nor the Chain applies to it,
        so the controls for them are not on the Screen — a switch that sits on
        and provably does nothing is worse than no switch. Both come back
        holding their remembered state when the Habit does.
      */}
      {archived ? null : (
        <div className="stack" style={{ gap: 7, marginTop: 22 }}>
          <ToggleRow
            label="count a chain"
            on={habit.chained}
            onToggle={() => update((current) => setChained(current, habitId, !habit.chained))}
          />
          {/* The label says what it puts where. "share" alone would not say
              that the thing being shared is the name. */}
          <ToggleRow
            label="name on share card"
            on={habit.sharedName}
            onToggle={() => update((current) => setSharedName(current, habitId, !habit.sharedName))}
          />
        </div>
      )}

      {/* No note under the switches. What a Chain is, the stats say the moment it
          is on: a count that stands next to a longest, and falls back to one
          the day it breaks. */}

      {/*
        Archive sits below a rule and last, because it is the only switch here
        that changes what Home shows. It asks nothing first: it is reversible
        now, and a switch that can be moved back does not need a confirmation.
      */}
      <hr className="divider" style={{ margin: "20px 0" }} />
      <ToggleRow
        label="archive"
        hint={archived ? "off home. past ticks stay." : "stops counting today"}
        on={archived}
        onToggle={() => update((current) => setArchived(current, habitId, !archived, today))}
      />
    </>
  );
}
