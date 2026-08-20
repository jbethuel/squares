"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tail } from "./Tail";
import { longLabel, type DateKey } from "@/domain/date";
import { chainOf, dateAt, isTicked, tickCountOf } from "@/domain/selectors";
import type { AppData, Habit } from "@/domain/types";

/** The spring is 260ms; the pulse is released just after it lands. */
const PULSE_MS = 300;

interface HabitRowProps {
  habit: Habit;
  data: AppData;
  today: DateKey;
  elapsed: number;
  /** 0 for today's row, 1 for the yesterday section. */
  offset: number;
  onTick: (habitId: string, date: DateKey, turnedOn: boolean) => void;
  onOpen?: (habitId: string) => void;
}

export function HabitRow({ habit, data, today, elapsed, offset, onTick, onOpen }: HabitRowProps) {
  const [pressed, setPressed] = useState(false);
  const [pulse, setPulse] = useState<"tick" | "untick" | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const date = dateAt(today, offset);
  const ticked = isTicked(data, habit.id, date);

  const commit = useCallback(() => {
    const turningOn = !ticked;
    onTick(habit.id, date, turningOn);
    setPulse(turningOn ? "tick" : "untick");
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
  }, [ticked, onTick, habit.id, date]);

  const chain = chainOf(data, habit.id, today);
  const subtitle =
    offset > 0
      ? "yesterday"
      : !habit.chained
        ? `${tickCountOf(data, habit.id, today)} ticks · unchained`
        : chain > 0
          ? `chain ${chain} day${chain === 1 ? "" : "s"}`
          : elapsed === 1
            ? "no chain yet"
            : "chain broken";

  return (
    <div className={`row${offset > 0 ? " row-yesterday" : ""}`} data-ticked={ticked} data-pressed={pressed || undefined}>
      {/*
        The tick target is the row, 56px tall, with no dialog and no second
        screen. Nothing else on Home is tappable at this size, so the thumb
        cannot miss. The chevron is a separate, deliberately small target.
      */}
      <button
        type="button"
        className="row-tick"
        aria-pressed={ticked}
        aria-label={`${habit.name}, ${ticked ? "ticked" : "not ticked"} for ${longLabel(date)}`}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onClick={commit}
      >
        <span className="stack" style={{ flex: 1, minWidth: 0 }}>
          <span className="row-name">{habit.name}</span>
          <span className="row-sub" data-chained={ticked && habit.chained}>
            {subtitle}
          </span>
        </span>
        <Tail
          base={offset}
          elapsed={elapsed}
          isTicked={(o) => isTicked(data, habit.id, dateAt(today, o))}
          chained={habit.chained}
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
