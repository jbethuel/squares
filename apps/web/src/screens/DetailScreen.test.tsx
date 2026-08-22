import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DetailScreen } from "./DetailScreen";
import { setStreaks } from "@squares/domain/mutations";
import { account, idOf, onDevice, renderWithStore, storedData } from "@/test/harness";
import type { AppData } from "@squares/domain/types";

function open(data: AppData, name: string) {
  onDevice(data);
  renderWithStore(<DetailScreen habitId={idOf(data, name)} />);
}

/** The Habit's name is its heading and the field that changes it. */
const nameField = () => screen.getByLabelText("habit name");

/** The stat under a given label. */
function stat(label: string): string {
  const node = screen.getByText(label).previousElementSibling;
  return node?.textContent ?? "";
}

describe("a Habit's own screen", () => {
  it("leads with the count for a Habit with no Streak", () => {
    open(account({ habits: ["workout"], logs: { workout: [0, 1, 4, 9] } }), "workout");

    expect(nameField()).toHaveValue("workout");
    expect(stat("logs")).toBe("4");
    // One number, not three. There is no longest Streak to report for a Habit
    // that never counted one, and the count is not worth saying twice.
    expect(screen.queryByText("longest")).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("leads with the Streak once the Habit has opted in", () => {
    const data = account({ habits: ["workout"], logs: { workout: [0, 1, 2, 6, 7, 8, 9, 10] } });
    open(setStreaks(data, idOf(data, "workout"), true), "workout");

    expect(stat("streak")).toBe("3");
    expect(stat("longest")).toBe("5");
    expect(stat("logs")).toBe("8");
  });

  it("draws the year as binary — Logged or not, with nothing to be partial about", () => {
    open(account({ age: 30, habits: ["workout"], logs: { workout: [0, 2] } }), "workout");

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
    open(account({ age: 30, habits: ["workout"], logs: { workout: [0, 1] } }), "workout");
    expect(screen.getByRole("img", { name: "workout: 2 logs across the year" })).toBeInTheDocument();
  });
});

describe("the Lens over a Habit's own Heatmap", () => {
  const drawn = () => document.querySelectorAll(".sq:not(.sq-pad)");

  it("reframes this grid the same way it reframes the Overview", async () => {
    const user = userEvent.setup();
    open(account({ age: 30, habits: ["workout"], logs: { workout: [0, 2] } }), "workout");
    expect(drawn()).toHaveLength(365);

    // Today is Monday the 3rd: the week runs Sunday the 2nd to Saturday the 8th.
    await user.click(screen.getByRole("button", { name: "week" }));
    expect(drawn()).toHaveLength(7);
    // The Log two Days back is outside the week, so only today is shaded.
    expect(document.querySelectorAll(".sq[style*='--lv3']")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "month" }));
    expect(drawn()).toHaveLength(31);
  });

  it("names the span it is drawing rather than always claiming a year", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }), "workout");
    expect(screen.getByText("every day of the year · logged or not")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "month" }));
    expect(screen.getByText("every day of the month · logged or not")).toBeInTheDocument();
  });

  it("describes what it drew, not what it did not", async () => {
    const user = userEvent.setup();
    open(account({ age: 30, habits: ["workout"], logs: { workout: [0, 1] } }), "workout");
    expect(screen.getByRole("img", { name: "workout: 2 logs across the year" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "week" }));
    // Both Logs are inside this week; the count is of the part that has been lived.
    expect(screen.getByRole("img", { name: "workout: 2 logs across the week" })).toBeInTheDocument();
  });

  it("leaves the stats above it on the year, so nothing on screen can fall", async () => {
    const user = userEvent.setup();
    open(account({ age: 30, habits: ["workout"], logs: { workout: [0, 10, 20] } }), "workout");
    expect(stat("logs")).toBe("3");

    // Two of those three Logs fall outside the week now drawn. The stat is the
    // year's under every Lens: the Lens redraws the grid, it does not rescore it.
    await user.click(screen.getByRole("button", { name: "week" }));
    expect(stat("logs")).toBe("3");
  });
});

describe("opting a Habit into a Streak", () => {
  it("is off by default, and shows the count rather than a Streak", () => {
    open(account({ habits: ["workout"] }), "workout");
    const toggle = screen.getByRole("switch", { name: /count a streak/ });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("logs")).toBeInTheDocument();
    expect(screen.queryByText("streak")).not.toBeInTheDocument();
  });

  it("puts the Streak on screen when turned on, and touches no Day Record", async () => {
    const user = userEvent.setup();
    const data = account({ habits: ["workout"], logs: { workout: [0, 1] } });
    open(data, "workout");

    await user.click(screen.getByRole("switch", { name: /count a streak/ }));

    expect(storedData().habits[0]?.streaks).toBe(true);
    // The stats are the only thing that says what a Streak is: a count with a
    // longest beside it, where a moment ago there was one number.
    expect(stat("streak")).toBe("2");
    expect(stat("longest")).toBe("2");
    // Opting in changes the display and nothing else.
    expect(storedData().days).toEqual(data.days);
  });

  it("turns back off, and the count is what is left", async () => {
    const user = userEvent.setup();
    const data = account({ habits: ["workout"], logs: { workout: [0, 1] } });
    open(setStreaks(data, idOf(data, "workout"), true), "workout");

    expect(stat("streak")).toBe("2");
    await user.click(screen.getByRole("switch", { name: /count a streak/ }));
    expect(storedData().habits[0]?.streaks).toBe(false);
    expect(stat("logs")).toBe("2");
  });
});

describe("naming a Habit is done where the name is", () => {
  it("keeps the new name when the field is left, with no save to press", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"], logs: { workout: [0, 1] } }), "workout");

    await user.clear(nameField());
    await user.type(nameField(), "lift");
    await user.tab();

    expect(storedData().habits[0]?.name).toBe("lift");
    // The Logs follow the name, because a rename is not a new Habit.
    expect(stat("logs")).toBe("2");
  });

  it("puts the old name back when the field is left blank", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }), "workout");

    await user.clear(nameField());
    await user.tab();

    // Blank reverts rather than rejects: nothing to disable, no error to show.
    expect(nameField()).toHaveValue("workout");
    expect(storedData().habits[0]?.name).toBe("workout");
  });

  it("abandons an edit on escape", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }), "workout");

    await user.clear(nameField());
    await user.type(nameField(), "lift{Escape}");
    await user.tab();

    expect(storedData().habits[0]?.name).toBe("workout");
  });
});

describe("hiding is a switch that can be moved back", () => {
  const archiveSwitch = () => screen.getByRole("switch", { name: /^hide/ });

  it("archives on one tap, with nothing to confirm", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout", "read"], logs: { workout: [2, 3] } }), "workout");

    expect(archiveSwitch()).toHaveAttribute("aria-checked", "false");
    await user.click(archiveSwitch());

    expect(archiveSwitch()).toHaveAttribute("aria-checked", "true");
    // Every past Log stays in the year. There is no delete.
    expect(storedData().habits[0]?.spans).toHaveLength(1);
    expect(stat("logs")).toBe("2");
  });

  it("takes the Habit back out again, because the switch is honest", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"], hidden: ["workout"] }), "workout");

    expect(archiveSwitch()).toHaveAttribute("aria-checked", "true");
    await user.click(archiveSwitch());
    expect(archiveSwitch()).toHaveAttribute("aria-checked", "false");
  });

  it("hides the Streak and Share Card switches while the Habit is Hidden", () => {
    open(account({ habits: ["workout"], hidden: ["workout"] }), "workout");

    // A switch that sits on and provably does nothing is worse than no switch.
    expect(screen.queryByRole("switch", { name: /count a streak/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /name on share card/ })).not.toBeInTheDocument();
    expect(archiveSwitch()).toBeInTheDocument();
  });

  it("shows a Hidden Habit no current Streak, even when it is a Streak Habit", () => {
    const data = account({ habits: ["workout"], logs: { workout: [1, 2, 3] }, hidden: ["workout"] });
    open(setStreaks(data, idOf(data, "workout"), true), "workout");

    // A Streak counts back from today, and this Habit cannot be Logged today —
    // it would read 0 forever. What it did, and its longest run, are still true.
    expect(screen.queryByText("streak")).not.toBeInTheDocument();
    expect(stat("logs")).toBe("3");
    expect(stat("longest")).toBe("3");
  });

  it("still lets a Hidden Habit be renamed, so the list stays right", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"], hidden: ["workout"] }), "workout");

    await user.clear(nameField());
    await user.type(nameField(), "lift");
    await user.tab();

    expect(storedData().habits[0]?.name).toBe("lift");
  });
});

// Going back is no longer this screen's to do — the bar belongs to the app, and
// `page.test.tsx` is where it is exercised.
describe("leaving the screen", () => {
  it("renders nothing for a Habit that is not there", () => {
    onDevice(account({ habits: ["workout"] }));
    const { container } = renderWithStore(<DetailScreen habitId="ghost" />);
    expect(container).toBeEmptyDOMElement();
  });
});
