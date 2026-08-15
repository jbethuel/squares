import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DetailScreen } from "./DetailScreen";
import { setChained } from "@/domain/mutations";
import { account, idOf, onDevice, renderWithStore, storedData } from "@/test/harness";
import type { AppData } from "@/domain/types";

function open(data: AppData, name: string) {
  onDevice(data);
  const props = { onEdit: vi.fn() };
  renderWithStore(<DetailScreen habitId={idOf(data, name)} {...props} />);
  return props;
}

/** The stat under a given label. */
function stat(label: string): string {
  const node = screen.getByText(label).previousElementSibling;
  return node?.textContent ?? "";
}

describe("a Habit's own screen", () => {
  it("leads with the count for an unchained Habit", () => {
    open(account({ habits: ["workout"], ticks: { workout: [0, 1, 4, 9] } }), "workout");

    expect(screen.getByRole("heading", { name: "workout" })).toBeInTheDocument();
    expect(stat("ticks")).toBe("4");
    // One number, not three. There is no longest Chain to report for a Habit
    // that never counted one, and the count is not worth saying twice.
    expect(screen.queryByText("longest")).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("leads with the Chain once the Habit has opted in", () => {
    const data = account({ habits: ["workout"], ticks: { workout: [0, 1, 2, 6, 7, 8, 9, 10] } });
    open(setChained(data, idOf(data, "workout"), true), "workout");

    expect(stat("chain")).toBe("3");
    expect(stat("longest")).toBe("5");
    expect(stat("ticks")).toBe("8");
  });

  it("draws the year as binary — Ticked or not, with nothing to be partial about", () => {
    open(account({ age: 30, habits: ["workout"], ticks: { workout: [0, 2] } }), "workout");

    const shaded = document.querySelectorAll(".sq[style*='--lv3']");
    expect(shaded).toHaveLength(2);
    // No intermediate shade appears anywhere on a Habit Heatmap.
    expect(document.querySelectorAll(".sq[style*='--lv1'], .sq[style*='--lv2']")).toHaveLength(0);
    expect(document.querySelectorAll(".sq[style*='--lv0']")).toHaveLength(363);
  });

  it("rings today, because the frame runs on past it", () => {
    open(account({ habits: ["workout"] }), "workout");
    // Under the Week and the Month there are Squares to the right of today, and
    // an unticked Day and a Day that has not happened are drawn the same.
    expect(document.querySelectorAll(".sq-today")).toHaveLength(1);
  });

  it("describes the whole year to assistive tech in one label", () => {
    open(account({ age: 30, habits: ["workout"], ticks: { workout: [0, 1] } }), "workout");
    expect(screen.getByRole("img", { name: "workout: 2 ticks across the year" })).toBeInTheDocument();
  });
});

describe("the Lens over a Habit's own Heatmap", () => {
  const drawn = () => document.querySelectorAll(".sq:not(.sq-pad)");

  it("reframes this grid the same way it reframes the Overview", async () => {
    const user = userEvent.setup();
    open(account({ age: 30, habits: ["workout"], ticks: { workout: [0, 2] } }), "workout");
    expect(drawn()).toHaveLength(365);

    // Today is Monday the 3rd: the week runs Sunday the 2nd to Saturday the 8th.
    await user.click(screen.getByRole("button", { name: "week" }));
    expect(drawn()).toHaveLength(7);
    // The Tick two Days back is outside the week, so only today is shaded.
    expect(document.querySelectorAll(".sq[style*='--lv3']")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "month" }));
    expect(drawn()).toHaveLength(31);
  });

  it("names the span it is drawing rather than always claiming a year", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }), "workout");
    expect(screen.getByText("every day of the year · ticked or not")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "month" }));
    expect(screen.getByText("every day of the month · ticked or not")).toBeInTheDocument();
  });

  it("describes what it drew, not what it did not", async () => {
    const user = userEvent.setup();
    open(account({ age: 30, habits: ["workout"], ticks: { workout: [0, 1] } }), "workout");
    expect(screen.getByRole("img", { name: "workout: 2 ticks across the year" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "week" }));
    // Both Ticks are inside this week; the count is of the part that has been lived.
    expect(screen.getByRole("img", { name: "workout: 2 ticks across the week" })).toBeInTheDocument();
  });

  it("leaves the stats above it on the year, so nothing on screen can fall", async () => {
    const user = userEvent.setup();
    open(account({ age: 30, habits: ["workout"], ticks: { workout: [0, 10, 20] } }), "workout");
    expect(stat("ticks")).toBe("3");

    // Two of those three Ticks fall outside the week now drawn. The stat is the
    // year's under every Lens: the Lens redraws the grid, it does not rescore it.
    await user.click(screen.getByRole("button", { name: "week" }));
    expect(stat("ticks")).toBe("3");
  });
});

describe("opting a Habit into a Chain", () => {
  it("is off by default, and shows the count rather than a Chain", () => {
    open(account({ habits: ["workout"] }), "workout");
    const toggle = screen.getByRole("switch", { name: /count a chain/ });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("ticks")).toBeInTheDocument();
    expect(screen.queryByText("chain")).not.toBeInTheDocument();
  });

  it("puts the Chain on screen when turned on, and touches no Day Record", async () => {
    const user = userEvent.setup();
    const data = account({ habits: ["workout"], ticks: { workout: [0, 1] } });
    open(data, "workout");

    await user.click(screen.getByRole("switch", { name: /count a chain/ }));

    expect(storedData().habits[0]?.chained).toBe(true);
    // The stats are the only thing that says what a Chain is: a count with a
    // longest beside it, where a moment ago there was one number.
    expect(stat("chain")).toBe("2");
    expect(stat("longest")).toBe("2");
    // Opting in changes the display and nothing else.
    expect(storedData().days).toEqual(data.days);
  });

  it("turns back off, and the count is what is left", async () => {
    const user = userEvent.setup();
    const data = account({ habits: ["workout"], ticks: { workout: [0, 1] } });
    open(setChained(data, idOf(data, "workout"), true), "workout");

    expect(stat("chain")).toBe("2");
    await user.click(screen.getByRole("switch", { name: /count a chain/ }));
    expect(storedData().habits[0]?.chained).toBe(false);
    expect(stat("ticks")).toBe("2");
  });
});

// Going back is no longer this screen's to do — the bar belongs to the app, and
// `page.test.tsx` is where it is exercised.
describe("leaving the screen", () => {
  it("sends both edit and archive to the same screen, where Archive is confirmed", async () => {
    const user = userEvent.setup();
    const props = open(account({ habits: ["workout"] }), "workout");

    await user.click(screen.getByRole("button", { name: "edit" }));
    await user.click(screen.getByRole("button", { name: "archive" }));
    expect(props.onEdit).toHaveBeenCalledTimes(2);
    // Nothing is archived from here; there is no unconfirmed destructive path.
    expect(storedData().habits[0]?.archivedOn).toBeNull();
  });

  it("renders nothing for a Habit that is not there", () => {
    const data = account({ habits: ["workout"] });
    onDevice(data);
    const { container } = renderWithStore(
      <DetailScreen habitId="ghost" onEdit={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
