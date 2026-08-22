"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tail } from "./Tail";
import { longLabel, type DateKey } from "@squares/domain/date";
import { streakOf, dateAt, isLogged, logCountOf } from "@squares/domain/selectors";
import type { AppData, Habit } from "@squares/domain/types";

/** The spring is 260ms; the pulse is released just after it lands. */
const PULSE_MS = 300;

interface HabitRowProps {
  habit: Habit;
  data: AppData;
  today: DateKey;
  elapsed: number;
  /** Always 0: ADR 0002 leaves no Day but today to Log. */
  offset: number;
  onLog: (habitId: string, date: DateKey, turnedOn: boolean) => void;
  onOpen?: (habitId: string) => void;
}

export function HabitRow({ habit, data, today, elapsed, offset, onLog, onOpen }: HabitRowProps) {
  const [pressed, setPressed] = useState(false);
  const [pulse, setPulse] = useState<"log" | "unlog" | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const date = dateAt(today, offset);
  const logged = isLogged(data, habit.id, date);

  const commit = useCallback(() => {
    const turningOn = !logged;
    onLog(habit.id, date, turningOn);
    setPulse(turningOn ? "log" : "unlog");
    // One 8ms haptic on commit, and only on the tap that adds. Correcting a
    // mistake should feel administrative.
    if (turningOn && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(8);
      } catch {
        // Vibration is a nicety; some browsers throw outside a user gesture.
      }
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPulse(null), PULSE_MS);
  }, [logged, onLog, habit.id, date]);

  const streak = streakOf(data, habit.id, today);
  const count = logCountOf(data, habit.id, today);
  const subtitle = !habit.streaks
    ? `${count} log${count === 1 ? "" : "s"}`
    : streak > 0
      ? `streak ${streak} day${streak === 1 ? "" : "s"}`
      : elapsed === 1
        ? "no streak yet"
        : "streak broken";

  return (
    <div className="row" data-logged={logged} data-pressed={pressed || undefined}>
      {/*
        The Log target is the row, 56px tall, with no dialog and no second
        screen. Nothing else on Home is tappable at this size, so the thumb
        cannot miss. The chevron is a separate, deliberately small target.
      */}
      <button
        type="button"
        className="row-log"
        aria-pressed={logged}
        aria-label={`${habit.name}, ${logged ? "logged" : "not logged"} for ${longLabel(date)}`}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onClick={commit}
      >
        <span className="stack" style={{ flex: 1, minWidth: 0 }}>
          <span className="row-name">{habit.name}</span>
          <span className="row-sub" data-streaks={logged && habit.streaks}>
            {subtitle}
          </span>
        </span>
        <Tail
          base={offset}
          elapsed={elapsed}
          isLogged={(o) => isLogged(data, habit.id, dateAt(today, o))}
          streaks={habit.streaks}
          pressed={pressed}
          pulse={pulse}
        />
      </button>
      {onOpen ? (
        <button
          type="button"
          className="row-open"
          aria-label={`Open ${habit.name}`}
          onClick={() => onOpen(habit.id)}
        >
          ›
        </button>
      ) : null}
    </div>
  );
}
