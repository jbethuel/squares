import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Heatmap } from "./Heatmap";
import { gridGeometry, type Frame } from "@/domain/grid";
import { PHONE_WIDTH, setElementWidth } from "@/test/dom";
import type { Intensity } from "@/domain/types";

const YEAR: Frame = { back: 365, ahead: 0 };

function renderHeatmap(options: {
  frame?: Frame;
  weekday?: number;
  levelFor?: (offset: number) => Intensity;
  markToday?: boolean;
  echo?: boolean;
  titleFor?: (offset: number) => string;
}) {
  const { frame = { back: 30, ahead: 0 }, weekday = 1, levelFor = () => 0, ...rest } = options;
  return render(
    <Heatmap frame={frame} weekday={weekday} levelFor={levelFor} ariaLabel="Overview heatmap" {...rest} />,
  );
}

/** The Squares actually drawn: everything the frame covers. */
const drawn = () => Array.from(document.querySelectorAll<HTMLElement>(".sq:not(.sq-pad)"));

describe("the Heatmap", () => {
  it("is one image to assistive tech, not 371 divs", () => {
    renderHeatmap({});
    expect(screen.getByRole("img", { name: "Overview heatmap" })).toBeInTheDocument();
  });

  it("draws a one-Day frame as a single Square, and nothing else at all", () => {
    renderHeatmap({ frame: { back: 1, ahead: 0 }, weekday: 3 });
    expect(drawn()).toHaveLength(1);
    // The other six cells of the column only exist to hold the shape. Nothing
    // on a Heatmap stands for a Day the frame did not ask for.
    expect(document.querySelectorAll(".sq-pad")).toHaveLength(6);
  });

  it("draws a year as 53 columns that fit a phone", () => {
    renderHeatmap({ frame: YEAR, weekday: 1 });
    expect(drawn()).toHaveLength(365);
    expect(document.querySelectorAll(".sq")).toHaveLength(53 * 7);

    const geometry = gridGeometry(PHONE_WIDTH, YEAR, 1);
    const grid = document.querySelector<HTMLElement>(".heatmap")!;
    expect(grid.style.gap).toBe(`${geometry.gap}px`);
    expect(grid.style.getPropertyValue("--sq-size")).toBe(`${geometry.size}px`);
  });

  it("draws the Days a frame reaches into the future, rather than stopping at today", () => {
    // A week on a Wednesday: three Days back, three still to come.
    renderHeatmap({ frame: { back: 4, ahead: 3 }, weekday: 3 });
    expect(drawn()).toHaveLength(7);
    expect(document.querySelectorAll(".sq-pad")).toHaveLength(0);
    // Nothing has happened on them, so they shade at level 0 like any empty Day.
    expect(document.querySelectorAll(".sq[style*='--lv0']")).toHaveLength(7);
  });

  it("sizes its Squares from the width it is given, with no second layout", () => {
    setElementWidth(660);
    renderHeatmap({ frame: YEAR });
    const desktop = document.querySelector<HTMLElement>(".heatmap")!.style.getPropertyValue("--sq-size");
    expect(parseFloat(desktop)).toBeCloseTo(gridGeometry(660, YEAR, 1).size, 5);
    expect(parseFloat(desktop)).toBeGreaterThan(gridGeometry(PHONE_WIDTH, YEAR, 1).size);
  });

  it("shades each Square by the Intensity of its Day", () => {
    renderHeatmap({ frame: { back: 5, ahead: 0 }, levelFor: (offset) => (offset === 0 ? 4 : 1) });
    const today = document.querySelector<HTMLElement>(".sq[style*='--lv4']");
    expect(today).not.toBeNull();
    expect(document.querySelectorAll(".sq[style*='--lv1']")).toHaveLength(4);
  });

  it("rings today only where it is asked to", () => {
    const { unmount } = renderHeatmap({ markToday: true });
    expect(document.querySelectorAll(".sq-today")).toHaveLength(1);
    unmount();

    // The Share Card's grid is a record, not a live screen, so nothing is ringed.
    renderHeatmap({});
    expect(document.querySelectorAll(".sq-today")).toHaveLength(0);
  });

  it("echoes today's Square instead of ringing it, in the frame a Tick lands", () => {
    renderHeatmap({ markToday: true, echo: true });
    expect(document.querySelectorAll(".sq-echo")).toHaveLength(1);
    expect(document.querySelectorAll(".sq-today")).toHaveLength(0);
  });

  it("labels each drawn Square with its Day", () => {
    renderHeatmap({ frame: { back: 3, ahead: 0 }, titleFor: (offset) => `day ${offset}` });
    expect(drawn().map((sq) => sq.title)).toEqual(["day 2", "day 1", "day 0"]);
  });

  it("renders an empty grid until it has been measured", () => {
    setElementWidth(0);
    renderHeatmap({});
    expect(document.querySelector(".heatmap")?.children).toHaveLength(0);
  });
});
