"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import { monthLabels, weekdayLabels, type AxisLabel } from "@squares/domain/axis";
import { monthYearLabel, type DateKey } from "@squares/domain/date";
import {
  AXIS_GUTTER,
  CALENDAR_ROWS,
  gridGeometry,
  gridSquares,
  gridWidth,
  scrollGeometry,
  type Frame,
} from "@squares/domain/grid";
import type { MonthAxis } from "@squares/domain/lens";
import type { Intensity } from "@squares/domain/types";

interface HeatmapProps {
  /** The run of Days to draw. Every Day in it gets a Square. */
  frame: Frame;
  /** Today's weekday, 0 = Sunday, which fixes today's row in its column. */
  weekday: number;
  /**
   * Rows to draw the frame in: seven for a calendar block, one for a Week on
   * its side. Comes from the Lens — see `lensRows`.
   */
  rows?: number;
  /**
   * Draw at a fixed Square size and run off the side rather than squeezing the
   * frame into the width available. The Year does this — see `lensScrolls`.
   */
  scrolls?: boolean;
  /**
   * Today, and what the strip above the grid should say. Omit both to draw a
   * bare grid with no names around it.
   */
  today?: DateKey;
  months?: MonthAxis;
  levelFor: (offset: number) => Intensity;
  titleFor?: (offset: number) => string;
  ariaLabel: string;
  /** Ring today's Square. Off for the static grids (detail, share). */
  markToday?: boolean;
  /** Flash today's Square in the top shade: the echo of a Log. */
  echo?: boolean;
}

export function Heatmap({
  frame,
  weekday,
  rows = CALENDAR_ROWS,
  scrolls = false,
  today,
  months = "none",
  levelFor,
  titleFor,
  ariaLabel,
  markToday = false,
  echo = false,
}: HeatmapProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const scroller = useRef<HTMLDivElement>(null);
  // Destructured for the dependency arrays: a caller that builds its frame
  // inline would otherwise rebuild the whole grid on every render.
  const { back, ahead } = frame;
  // The weekday names run down the side of a calendar block. On a scrolling
  // grid they sit outside the scroller and stay put; on a fitted one they take
  // their room out of the width. In the Week's single row they go on top.
  const sideAxis = today !== undefined && rows > 1;
  const geometry = useMemo(
    () =>
      scrolls
        ? scrollGeometry({ back, ahead }, weekday, rows)
        : width > 0
          ? gridGeometry(width - (sideAxis ? AXIS_GUTTER : 0), { back, ahead }, weekday, rows)
          : null,
    [scrolls, width, back, ahead, weekday, rows, sideAxis],
  );
  const squares = useMemo(
    () => (geometry ? gridSquares(geometry.cols, { back, ahead }, weekday, rows) : []),
    [geometry, back, ahead, weekday, rows],
  );

  const step = geometry ? geometry.size + geometry.gap : 0;

  const topLabels = useMemo((): AxisLabel[] => {
    if (today === undefined || step === 0) return [];
    // A one-row Week has no side to put weekdays on, so they go up here.
    if (rows === 1) return weekdayLabels();
    if (months === "months") return monthLabels(squares, today, step);
    if (months === "month") return [{ track: 0, text: monthYearLabel(today) }];
    return [];
  }, [today, rows, months, squares, step]);

  // A Frame that runs off the side opens at its newest end. The record reads
  // right to left the way it is written — today first, and the year behind it.
  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, [scrolls, back, ahead, rows]);

  /*
    How far the grid sits from the left of the space it was given. Squares cap
    at MAX_SQUARE, so under the Week and the Month the grid is narrower than its
    container and `.heatmap` centres it. The names are positioned in px and have
    to start from the same place, or a month name floats half a grid away from
    the month it names. A scrolling grid starts hard left and has no inset.
  */
  const inset =
    geometry && !scrolls ? (width - (sideAxis ? AXIS_GUTTER : 0) - gridWidth(geometry)) / 2 : 0;

  const grid = geometry ? (
    <div
      className="heatmap"
      style={
        {
          gridTemplateRows: `repeat(${geometry.rows}, ${geometry.size}px)`,
          gap: `${geometry.gap}px`,
          "--sq-size": `${geometry.size}px`,
          "--sq-radius": `${geometry.radius}px`,
        } as CSSProperties
      }
    >
      {squares.map((square) => {
        if (square.kind !== "framed") {
          return <div key={square.key} className={`sq sq-${square.kind}`} />;
        }
        const isToday = square.offset === 0;
        return (
          <div
            key={square.key}
            className={`sq${isToday && markToday ? (echo ? " sq-echo" : " sq-today") : ""}`}
            style={{ background: `var(--lv${levelFor(square.offset)})` }}
            title={titleFor?.(square.offset)}
          />
        );
      })}
    </div>
  ) : (
    <div className="heatmap" />
  );

  /*
    The names are aria-hidden. The grid is one role="img" whose label already
    says what it covers and how much is in it; reading "mon wed fri jan feb mar"
    between them would add nothing an ear can use.
  */
  const strip =
    geometry && topLabels.length > 0 ? (
      <div className="axis-top" aria-hidden="true">
        {topLabels.map((label) => (
          // Keyed by track, not text: a rolling year starts and ends in the
          // same month, so "aug" can legitimately appear twice.
          <span key={label.track} style={{ left: inset + label.track * step }}>
            {label.text}
          </span>
        ))}
      </div>
    ) : null;

  return (
    <div ref={ref} className="axis" data-side={sideAxis || undefined}>
      {geometry && sideAxis ? (
        <div className="axis-side" aria-hidden="true">
          {/* Holds the gutter level with the grid, under the strip beside it. */}
          {strip ? <div className="axis-corner" /> : null}
          <div
            className="axis-days"
            style={{ gridTemplateRows: `repeat(${rows}, ${geometry.size}px)`, gap: geometry.gap }}
          >
            {weekdayLabels().map((label) => (
              <span key={label.track} style={{ gridRow: label.track + 1 }}>
                {label.text}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="axis-body" ref={scroller} data-scrolls={scrolls || undefined}>
        {strip}
        <div role="img" aria-label={ariaLabel} style={scrolls ? { width: "max-content" } : undefined}>
          {grid}
        </div>
      </div>
    </div>
  );
}
