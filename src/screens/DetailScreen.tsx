"use client";

import { Heatmap } from "@/components/Heatmap";
import { Toggle } from "@/components/Toggle";
import { longLabel, weekdayOf } from "@/domain/date";
import { setChained } from "@/domain/mutations";
import {
  chainOf,
  dateAt,
  elapsedDays,
  isTicked,
  longestChainOf,
  tickCountOf,
} from "@/domain/selectors";
import { useStore } from "@/domain/store";

interface DetailScreenProps {
  habitId: string;
  onBack: () => void;
  onEdit: () => void;
}

export function DetailScreen({ habitId, onBack, onEdit }: DetailScreenProps) {
  const { data, today, update } = useStore();
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit) return null;

  const elapsed = elapsedDays(data, today);
  const ticks = tickCountOf(data, habitId, today);
  const chain = chainOf(data, habitId, today);

  return (
    <>
      <button type="button" className="btn-quiet" onClick={onBack} style={{ marginBottom: 20 }}>
        ‹ back
      </button>
      <h1 className="title" style={{ margin: 0 }}>
        {habit.name}
      </h1>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 26, margin: "22px 0 24px" }}>
        <div>
          <div className="stat-value stat-hero" data-chained={habit.chained}>
            {habit.chained ? chain : ticks}
          </div>
          <div className="stat-label">{habit.chained ? "current chain" : "total ticks"}</div>
        </div>
        <div>
          <div className="stat-value">{habit.chained ? longestChainOf(data, habitId, today) : "—"}</div>
          <div className="stat-label">longest</div>
        </div>
        <div>
          <div className="stat-value">{ticks}</div>
          <div className="stat-label">ticks</div>
        </div>
      </div>

      <p className="label" style={{ margin: "0 0 9px" }}>
        every day of the year · ticked or not
      </p>
      {/*
        A Habit Heatmap is binary and uses level 3 only. A gradient here would
        be a lie — there is nothing to be partial about.
      */}
      <Heatmap
        elapsed={elapsed}
        weekday={weekdayOf(today)}
        levelFor={(offset) => (isTicked(data, habitId, dateAt(today, offset)) ? 3 : 0)}
        titleFor={(offset) => longLabel(dateAt(today, offset))}
        ariaLabel={`${habit.name}: ${ticks} ticks across ${elapsed} days`}
      />

      <button
        type="button"
        className="toggle-row"
        role="switch"
        aria-checked={habit.chained}
        onClick={() => update((current) => setChained(current, habitId, !habit.chained))}
        style={{ marginTop: 22 }}
      >
        <span style={{ fontSize: 12.5 }}>count a chain</span>
        <Toggle on={habit.chained} />
      </button>

      <p className="note" style={{ margin: "12px 0 0" }}>
        {habit.chained
          ? "chains are strict. a missed day ends one, and nothing here will repair it for you."
          : "chains are off for this habit. it accumulates and nothing can break."}
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button type="button" className="btn btn-solid" style={{ flex: 1 }} onClick={onEdit}>
          edit
        </button>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={onEdit}>
          archive
        </button>
      </div>
    </>
  );
}
