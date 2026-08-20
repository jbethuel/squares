"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heatmap } from "@/components/Heatmap";
import { HabitRow } from "@/components/HabitRow";
import { LensPicker } from "@/components/LensPicker";
import { Total } from "@/components/Total";
import { longLabel, weekdayOf, type DateKey } from "@squares/domain/date";
import {
  DEFAULT_LENS,
  lensFrame,
  lensLegend,
  lensMonths,
  lensNoun,
  lensRows,
  lensScrolls,
  type Lens,
} from "@squares/domain/lens";
import { toggleTick } from "@squares/domain/mutations";
import {
  dateAt,
  elapsedDays,
  intensityAt,
  liveHabits,
  stillOpenYesterday,
  totalTicks,
  totalTicksIn,
} from "@squares/domain/selectors";
import { useStore } from "@squares/domain/store";

const ECHO_MS = 300;

interface HomeScreenProps {
  onOpenHabit: (habitId: string) => void;
  onNewHabit: () => void;
  onSettings: () => void;
}

export function HomeScreen({ onOpenHabit, onNewHabit, onSettings }: HomeScreenProps) {
  const { data, today, update } = useStore();
  const [echo, setEcho] = useState(false);
  const [graceOpen, setGraceOpen] = useState(false);
  const [lens, setLens] = useState<Lens>(DEFAULT_LENS);
  const echoTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(echoTimer.current), []);

  const elapsed = elapsedDays(data, today);
  const habits = liveHabits(data, today);
  const openYesterday = stillOpenYesterday(data, today);

  const handleTick = useCallback(
    (habitId: string, date: DateKey, turnedOn: boolean) => {
      update((current) => toggleTick(current, habitId, date, today));
      // The echo: in the same frame, today's Square in the Overview steps up
      // one Intensity level and flashes a ring in the top shade. Not staggered
      // — the same event happening in two places.
      if (turnedOn && date === today) {
        setEcho(true);
        window.clearTimeout(echoTimer.current);
        echoTimer.current = window.setTimeout(() => setEcho(false), ECHO_MS);
      }
    },
    [update, today],
  );

  const frame = lensFrame(lens, today);
  const legend = lensLegend(lens);

  return (
    <>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        {/*
          The Total is the year's under every Lens. A Total scoped to the week
          would fall to zero every Sunday, and nothing that can go to zero is on
          Home — the Lens redraws the grid, it does not rescore it.
        */}
        <div>
          <Total value={totalTicks(data, today)} />
          <div className="caption">
            {/* No span on day one: "last 1 days" is wrong and "last 1 day" is
                sad. On the first morning the word alone is the whole caption. */}
            {elapsed === 1 ? "ticks" : `ticks · last ${elapsed} days`}
          </div>
        </div>
        {/* One chip is all the chrome Home gets. The Share Card lives in
            settings, next to the name opt-ins that govern it. */}
        <button type="button" className="btn-chip" onClick={onSettings}>
          settings
        </button>
      </header>

      <div style={{ marginBottom: 8 }}>
        <LensPicker value={lens} onChange={setLens} label="how much of the record to draw" />
      </div>

      <Heatmap
        frame={frame}
        weekday={weekdayOf(today)}
        rows={lensRows(lens)}
        scrolls={lensScrolls(lens)}
        today={today}
        months={lensMonths(lens)}
        levelFor={(offset) => intensityAt(data, dateAt(today, offset))}
        titleFor={(offset) => longLabel(dateAt(today, offset))}
        // Ticks are counted over the part of the frame that has happened: the
        // rest of it has nothing in it yet by definition.
        ariaLabel={`Overview heatmap: ${totalTicksIn(data, today, frame.back)} ticks across ${lensNoun(lens)}`}
        markToday
        echo={echo}
      />

      {/*
        Only the Week keeps a legend. The Year and the Month now name their own
        edges above the grid, and two lines answering "where does this start"
        is one line too many. The Week's ends are the one thing the names on top
        cannot say: `mon wed fri` does not tell you the row runs Sunday to
        Saturday.
      */}
      {legend ? (
        <div className="legend">
          <span>{legend.start}</span>
          <span>{legend.note}</span>
          <span>{legend.end}</span>
        </div>
      ) : null}

      <hr className="divider" style={{ margin: "22px 0 16px" }} />

      {openYesterday.length > 0 ? (
        <>
          {/*
            Yesterday is still open, and says so without becoming a
            general-purpose calendar editor: one dashed strip, collapsed, that
            closes at midnight and then never comes back.
          */}
          <button
            type="button"
            className="grace"
            aria-expanded={graceOpen}
            onClick={() => setGraceOpen((open) => !open)}
            style={{ marginBottom: graceOpen ? 10 : 16 }}
          >
            <span>
              yesterday · {openYesterday.length} open · closes at midnight
            </span>
            <span style={{ color: "var(--muted)" }}>{graceOpen ? "−" : "+"}</span>
          </button>
          {graceOpen ? (
            <div className="stack" style={{ gap: 7, marginBottom: 16 }}>
              {openYesterday.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  data={data}
                  today={today}
                  elapsed={elapsed}
                  offset={1}
                  onTick={handleTick}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="stack" style={{ gap: 8 }}>
        {habits.map((habit) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            data={data}
            today={today}
            elapsed={elapsed}
            offset={0}
            onTick={handleTick}
            onOpen={onOpenHabit}
          />
        ))}
        <button type="button" className="row-add" onClick={onNewHabit}>
          {habits.length === 0 ? "name your first habit" : "+ new habit"}
        </button>
      </div>

      {/* The one line Home carries, and only while there is nothing else to
          read. Once a Habit exists the rows are the instructions. */}
      {habits.length === 0 ? (
        <p className="note" style={{ textAlign: "center", marginTop: 20, color: "var(--dim)" }}>
          three is the ceiling. start with one.
        </p>
      ) : null}
    </>
  );
}
