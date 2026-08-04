import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Heatmap } from "./Heatmap";
import { gridGeometry } from "@/domain/grid";
import { PHONE_WIDTH, setElementWidth } from "@/test/dom";
import type { Intensity } from "@/domain/types";

function renderHeatmap(options: {
  elapsed?: number;
  weekday?: number;
  levelFor?: (offset: number) => Intensity;
  markToday?: boolean;
  echo?: boolean;
  titleFor?: (offset: number) => string;
}) {
  const { elapsed = 30, weekday = 1, levelFor = () => 0, ...rest } = options;
  return render(
    <Heatmap elapsed={elapsed} weekday={weekday} levelFor={levelFor} ariaLabel="Overview heatmap" {...rest} />,
  );
}

const lived = () => Array.from(document.querySelectorAll<HTMLElement>(".sq:not(.sq-future):not(.sq-unborn)"));

describe("the Heatmap", () => {
  it("is one image to assistive tech, not 371 divs", () => {
    renderHeatmap({});
    expect(screen.getByRole("img", { name: "Overview heatmap" })).toBeInTheDocument();
  });

  it("draws day one as a single Square, with the rest of the week ghosted", () => {
    renderHeatmap({ elapsed: 1, weekday: 3 });
    expect(lived()).toHaveLength(1);
    // Thursday to Saturday have not happened; Sunday to Tuesday pre-date it.
    expect(document.querySelectorAll(".sq-future")).toHaveLength(3);
    expect(document.querySelectorAll(".sq-unborn")).toHaveLength(3);
  });

  it("draws a settled year as 53 columns that fit a phone", () => {
    renderHeatmap({ elapsed: 365, weekday: 1 });
    expect(lived()).toHaveLength(365);
    expect(document.querySelectorAll(".sq")).toHaveLength(53 * 7);

    const geometry = gridGeometry(PHONE_WIDTH, 365, 1);
    const grid = document.querySelector<HTMLElement>(".heatmap")!;
    expect(grid.style.gap).toBe(`${geometry.gap}px`);
    expect(grid.style.getPropertyValue("--sq-size")).toBe(`${geometry.size}px`);
  });

  it("sizes its Squares from the width it is given, with no second layout", () => {
    setElementWidth(660);
    renderHeatmap({ elapsed: 365 });
    const desktop = document.querySelector<HTMLElement>(".heatmap")!.style.getPropertyValue("--sq-size");
    expect(parseFloat(desktop)).toBeCloseTo(gridGeometry(660, 365, 1).size, 5);
    expect(parseFloat(desktop)).toBeGreaterThan(gridGeometry(PHONE_WIDTH, 365, 1).size);
  });

  it("shades each Square by the Intensity of its Day", () => {
    renderHeatmap({ elapsed: 5, levelFor: (offset) => (offset === 0 ? 4 : 1) });
    const today = document.querySelector<HTMLElement>(".sq[style*='--lv4']");
    expect(today).not.toBeNull();
    expect(document.querySelectorAll(".sq[style*='--lv1']")).toHaveLength(4);
  });

  it("rings today only where it is asked to", () => {
    const { unmount } = renderHeatmap({ elapsed: 30, markToday: true });
    expect(document.querySelectorAll(".sq-today")).toHaveLength(1);
    unmount();

    // The static grids — detail and the Share Card — are records, not live
    // screens, so nothing is ringed.
    renderHeatmap({ elapsed: 30 });
    expect(document.querySelectorAll(".sq-today")).toHaveLength(0);
  });

  it("echoes today's Square instead of ringing it, in the frame a Tick lands", () => {
    renderHeatmap({ elapsed: 30, markToday: true, echo: true });
    expect(document.querySelectorAll(".sq-echo")).toHaveLength(1);
    expect(document.querySelectorAll(".sq-today")).toHaveLength(0);
  });

  it("labels each lived Square with its Day", () => {
    renderHeatmap({ elapsed: 3, titleFor: (offset) => `day ${offset}` });
    expect(lived().map((sq) => sq.title)).toEqual(["day 2", "day 1", "day 0"]);
  });

  it("renders an empty grid until it has been measured", () => {
    setElementWidth(0);
    renderHeatmap({ elapsed: 30 });
    expect(document.querySelector(".heatmap")?.children).toHaveLength(0);
  });
});
