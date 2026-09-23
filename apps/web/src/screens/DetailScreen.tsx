"use client";

import { useEffect, useState } from "react";
import { Heatmap } from "@/components/Heatmap";
import { LensPicker } from "@/components/LensPicker";
import { ToggleRow } from "@/components/Toggle";
import { longLabel, weekdayOf } from "@squares/domain/date";
import {
  DEFAULT_LENS,
  lensFrame,
  lensMonths,
  lensNoun,
  lensRows,
  lensScrolls,
  type Lens,
} from "@squares/domain/lens";
import { renameHabit, setHidden, setStreaks } from "@squares/domain/mutations";
import {
  streakOf,
  dateAt,
  isHidden,
  isLogged,
  longestStreakOf,
  logCountIn,
  logCountOf,
} from "@squares/domain/selectors";
import { useStore } from "@squares/domain/store";

export function DetailScreen({
  habitId,
  onShare,
}: {
  habitId: string;
  onShare: (habitId: string) => void;
}) {
  const { data, today, update } = useStore();
  // Declared above the missing-Habit guard: a hook may not sit behind a return.
  const [lens, setLens] = useState<Lens>(DEFAULT_LENS);
  const [draft, setDraft] = useState<string | null>(null);
  const habit = data.habits.find((h) => h.id === habitId);

  // The draft is dropped whenever the stored name changes under it, so the
  // field cannot go on showing a name the record no longer holds.
  useEffect(() => setDraft(null), [habit?.name]);

  if (!habit) return null;

  const hidden = isHidden(habit, today);
  const frame = lensFrame(lens, today);
  const logs = logCountOf(data, habitId, today);

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
        A Habit with no Streak has one number, not three — the Log count as the
        hero, and nothing under a label that reads as something that failed to
        load.

        A Hidden Habit is shown no current Streak even when it is a Streak
        Habit: a Streak counts back from today, and a Habit that cannot be
        Logged today would read 0 forever. Its Longest Streak cannot fall, so
        that one is shown, and it is what the Screen is for — deciding whether
        to bring the Habit back.
      */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 26, margin: "22px 0 24px" }}>
        <div>
          <div className="stat-value stat-hero" data-streaks={habit.streaks && !hidden}>
            {habit.streaks && !hidden ? streakOf(data, habitId, today) : logs}
          </div>
          <div className="stat-label">{habit.streaks && !hidden ? "streak" : "logs"}</div>
        </div>
        {habit.streaks ? (
          <>
            <div>
              <div className="stat-value">{longestStreakOf(data, habitId, today)}</div>
              <div className="stat-label">longest streak</div>
            </div>
            {hidden ? null : (
              <div>
                <div className="stat-value">{logs}</div>
                <div className="stat-label">logs</div>
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
        your logs for {lensNoun(lens)}
      </p>
      <div style={{ marginBottom: 8 }}>
        <LensPicker value={lens} onChange={setLens} label="days to show" />
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
        levelFor={(offset) => (isLogged(data, habitId, dateAt(today, offset)) ? 3 : 0)}
        titleFor={(offset) => longLabel(dateAt(today, offset))}
        ariaLabel={`${habit.name}: ${logCountIn(data, habitId, today, frame.back)} logs in ${lensNoun(lens)}`}
        markToday
      />

      {/*
        While a Habit is Hidden its Streak does not apply, so the control for
        it is not on the Screen — a switch that sits on and provably does
        nothing is worse than no switch. It comes back holding its remembered
        state when the Habit does.

        No Reminder toggle here: ADR 0008 says the web has no Reminder and
        cannot have one. The Habit Card below has no toggle either — ADR 0010
        has it always name every visible Habit, with no control to withhold
        one — but it does get a link: ADR 0011 gives that link to this Habit's
        own Screen, positioned here because the switch above it decides
        whether the card it opens can carry a Streak at all.
      */}
      {hidden ? null : (
        <div className="stack" style={{ gap: 7, marginTop: 22 }}>
          <ToggleRow
            label="show streak"
            on={habit.streaks}
            onToggle={() => update((current) => setStreaks(current, habitId, !habit.streaks))}
          />
          <button type="button" className="btn-list" onClick={() => onShare(habitId)}>
            make a share card ›
          </button>
        </div>
      )}

      {/* No note under the switches. What a Streak is, the stats say the moment
          it is on: a count that stands next to a longest, and falls back to one
          the day it breaks. */}

      {/*
        Hide sits below a rule and last, because it is the only switch here that
        changes what Home shows — and by ADR 0001 it changes the Overview and
        the Total with it. It asks nothing first: it destroys nothing and it is
        reversible, and a switch that can be moved back needs no confirmation.
      */}
      <hr className="divider" style={{ margin: "20px 0" }} />
      <ToggleRow
        label="hide"
        hint={
          hidden
            ? "hidden from home, logs kept. turn off to bring it back."
            : "takes this habit off home. nothing is deleted."
        }
        on={hidden}
        onToggle={() => update((current) => setHidden(current, habitId, !hidden, today))}
      />
    </>
  );
}
