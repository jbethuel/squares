"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heatmap } from "@/components/Heatmap";
import { HabitRow } from "@/components/HabitRow";
import { Total } from "@/components/Total";
import { longLabel, monthYearLabel, weekdayOf, type DateKey } from "@/domain/date";
import { toggleTick } from "@/domain/mutations";
import {
  dateAt,
  elapsedDays,
  intensityAt,
  liveHabits,
  stillOpenYesterday,
  totalTicks,
} from "@/domain/selectors";
import { useStore } from "@/domain/store";

const ECHO_MS = 300;

interface HomeScreenProps {
  onOpenHabit: (habitId: string) => void;
  onNewHabit: () => void;
  onSettings: () => void;
  onShare: () => void;
}

export function HomeScreen({ onOpenHabit, onNewHabit, onSettings, onShare }: HomeScreenProps) {
  const { data, today, update } = useStore();
  const [echo, setEcho] = useState(false);
  const [graceOpen, setGraceOpen] = useState(false);
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

  const rangeStart =
    elapsed === 1
      ? "installed today"
      : elapsed < 40
        ? `${elapsed} days on file`
        : monthYearLabel(dateAt(today, elapsed - 1));

  return (
    <>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <Total value={totalTicks(data, today)} />
          <div className="caption">
            {elapsed === 1 ? "ticks · the year is one day old" : `ticks · last ${elapsed} days`}
          </div>
        </div>
        {/*
          Two chips is all the chrome Home gets. Share earns one because
          posting the card is the only channel this app has, and it sits next
          to the Total because the Total is what it shares.
        */}
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="btn-chip" onClick={onShare}>
            share
          </button>
          <button type="button" className="btn-chip" onClick={onSettings}>
            settings
          </button>
        </div>
      </header>

      <Heatmap
        elapsed={elapsed}
        weekday={weekdayOf(today)}
        levelFor={(offset) => intensityAt(data, dateAt(today, offset))}
        titleFor={(offset) => longLabel(dateAt(today, offset))}
        ariaLabel={`Overview heatmap: ${totalTicks(data, today)} ticks across ${elapsed} days`}
        markToday
        echo={echo}
      />

      <div className="legend">
        <span>{rangeStart}</span>
        <span>{elapsed === 365 ? "53 weeks, no scrolling" : "the grid widens as the year does"}</span>
        <span>today</span>
      </div>

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
              yesterday · {openYesterday.length} still open · closes at midnight
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

      {habits.length === 0 ? (
        <p className="note" style={{ textAlign: "center", marginTop: 20, color: "var(--dim)" }}>
          two or three is the honest ceiling. start with one.
        </p>
      ) : elapsed === 1 ? (
        <p className="note" style={{ textAlign: "center", marginTop: 20, color: "var(--dim)" }}>
          tap a square. that is the whole app.
        </p>
      ) : null}
    </>
  );
}
