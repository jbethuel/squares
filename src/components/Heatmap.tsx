"use client";

import { useMemo, type CSSProperties } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import { gridGeometry, gridSquares, type Frame } from "@/domain/grid";
import type { Intensity } from "@/domain/types";

interface HeatmapProps {
  /** The run of Days to draw. Every Day in it gets a Square. */
  frame: Frame;
  /** Today's weekday, 0 = Sunday, which fixes today's row in its column. */
  weekday: number;
  levelFor: (offset: number) => Intensity;
  titleFor?: (offset: number) => string;
  ariaLabel: string;
  /** Ring today's Square. Off for the static grids (detail, share). */
  markToday?: boolean;
  /** Flash today's Square in the top shade: the echo of a Tick. */
  echo?: boolean;
}

export function Heatmap({
  frame,
  weekday,
  levelFor,
  titleFor,
  ariaLabel,
  markToday = false,
  echo = false,
}: HeatmapProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  // Destructured for the dependency arrays: a caller that builds its frame
  // inline would otherwise rebuild the whole grid on every render.
  const { back, ahead } = frame;
  const geometry = useMemo(
    () => (width > 0 ? gridGeometry(width, { back, ahead }, weekday) : null),
    [width, back, ahead, weekday],
  );
  const squares = useMemo(
    () => (geometry ? gridSquares(geometry.cols, { back, ahead }, weekday) : []),
    [geometry, back, ahead, weekday],
  );

  return (
    <div ref={ref} role="img" aria-label={ariaLabel}>
      {geometry ? (
        <div
          className="heatmap"
          style={
            {
              gridTemplateRows: `repeat(7, ${geometry.size}px)`,
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
            const today = square.offset === 0;
            return (
              <div
                key={square.key}
                className={`sq${today && markToday ? (echo ? " sq-echo" : " sq-today") : ""}`}
                style={{ background: `var(--lv${levelFor(square.offset)})` }}
                title={titleFor?.(square.offset)}
              />
            );
          })}
        </div>
      ) : (
        <div className="heatmap" />
      )}
    </div>
  );
}
