import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LensPicker } from "./LensPicker";
import type { Lens } from "@/domain/lens";

function open(value: Lens = "year") {
  const onChange = vi.fn();
  render(<LensPicker value={value} onChange={onChange} label="how much of the year to draw" />);
  return onChange;
}

const pressed = () =>
  screen
    .getAllByRole("button")
    .filter((b) => b.getAttribute("aria-pressed") === "true")
    .map((b) => b.textContent);

describe("the Lens picker", () => {
  it("offers the three Lenses, shortest first", () => {
    open();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "week",
      "month",
      "year",
    ]);
  });

  it("marks exactly one as current", () => {
    open("month");
    expect(pressed()).toEqual(["month"]);
  });

  it("reports the Lens that was chosen", async () => {
    const user = userEvent.setup();
    const onChange = open();
    await user.click(screen.getByRole("button", { name: "week" }));
    expect(onChange).toHaveBeenCalledWith("week");
  });

  it("names itself, because a screen can carry one for each Heatmap", () => {
    open();
    expect(screen.getByRole("group", { name: "how much of the year to draw" })).toBeInTheDocument();
  });
});
