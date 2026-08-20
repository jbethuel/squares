import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HomeScreen } from "./HomeScreen";
import { MAX_SQUARE } from "@/domain/grid";
import { setChained } from "@/domain/mutations";
import { account, idOf, onDevice, renderWithStore, storedData, TODAY, YESTERDAY } from "@/test/harness";
import type { AppData } from "@/domain/types";

function open(data: AppData = account({ habits: ["workout"] })) {
  onDevice(data);
  const props = { onOpenHabit: vi.fn(), onNewHabit: vi.fn(), onSettings: vi.fn() };
  renderWithStore(<HomeScreen {...props} />);
  return props;
}

const total = () => document.querySelector(".total")!.textContent;
const row = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name},`) });
/** The Squares actually drawn: every Day the frame covers. */
const drawn = () => document.querySelectorAll(".sq:not(.sq-pad)");
const grid = () => document.querySelector<HTMLElement>(".heatmap")!;
const lens = (name: string) => screen.getByRole("button", { name });

describe("Home on day one", () => {
  it("asks for a first Habit rather than showing an empty list", () => {
    open(account({ age: 1 }));
    expect(screen.getByRole("button", { name: "name your first habit" })).toBeInTheDocument();
    expect(screen.getByText("three is the ceiling. start with one.")).toBeInTheDocument();
  });

  it("drops the span on day one rather than showing a zero one", () => {
    open(account({ age: 1, habits: ["workout"] }));
    expect(screen.getByText("ticks")).toBeInTheDocument();
  });

  it("draws the whole year from day one, rather than a grid that grows into one", () => {
    open(account({ age: 1, habits: ["workout"] }));
    // The frame is a calendar and does not shrink to fit what has been lived:
    // 364 of these are Days from before the account existed, at Intensity 0.
    expect(drawn()).toHaveLength(365);
    expect(document.querySelectorAll(".sq-today")).toHaveLength(1);
    // There is still no progress number anywhere near it.
    expect(screen.queryByText(/1 of 365|0%/)).not.toBeInTheDocument();
  });
});

describe("the tick, end to end", () => {
  it("records the Tick, raises the Total and marks the row", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }));
    expect(total()).toBe("0");

    await user.click(row("workout"));

    expect(row("workout")).toHaveAttribute("aria-pressed", "true");
    expect(storedData().days[TODAY]?.ticked).toHaveLength(1);
    await vi.waitFor(() => expect(total()).toBe("1"));
  });

  it("takes it back, and the Total with it", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"], ticks: { workout: [0] } }));
    await vi.waitFor(() => expect(total()).toBe("1"));

    await user.click(row("workout"));
    expect(storedData().days[TODAY]?.ticked).toEqual([]);
    await vi.waitFor(() => expect(total()).toBe("0"));
  });

  it("echoes today's Square in the Overview in the same frame", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }));
    expect(document.querySelectorAll(".sq-echo")).toHaveLength(0);

    await user.click(row("workout"));
    // The same event happening in two places, not a staggered animation.
    expect(document.querySelectorAll(".sq-echo")).toHaveLength(1);
    await vi.waitFor(() => expect(document.querySelectorAll(".sq-echo")).toHaveLength(0), { timeout: 2000 });
  });

  it("does not echo an untick — there is nothing to celebrate", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"], ticks: { workout: [0] } }));
    await user.click(row("workout"));
    expect(document.querySelectorAll(".sq-echo")).toHaveLength(0);
  });

  it("shades the Overview by Intensity as Habits are Ticked", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["a", "b"] }));
    const todaySquare = () => document.querySelector<HTMLElement>(".sq-today, .sq-echo")!;

    expect(todaySquare().style.background).toContain("--lv0");
    await user.click(row("a"));
    expect(todaySquare().style.background).toContain("--lv2");
    await user.click(row("b"));
    expect(todaySquare().style.background).toContain("--lv4");
  });
});

describe("the Grace Window on Home", () => {
  it("says how many Habits yesterday is still open for, and when it closes", () => {
    open(account({ habits: ["workout", "read"] }));
    expect(
      screen.getByRole("button", { name: /yesterday · 2 open · closes at midnight/ }),
    ).toBeInTheDocument();
  });

  it("stays collapsed until it is asked for, so Home is not a calendar editor", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }));
    const strip = screen.getByRole("button", { name: /yesterday/ });
    expect(strip).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("yesterday")).not.toBeInTheDocument();

    await user.click(strip);
    expect(strip).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("yesterday")).toBeInTheDocument();
  });

  it("Ticks yesterday, and the strip closes itself once nothing is left open", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }));

    await user.click(screen.getByRole("button", { name: /yesterday · 1 open/ }));
    const section = document.querySelector(".row-yesterday")!;
    await user.click(within(section as HTMLElement).getByRole("button", { name: /^workout,/ }));

    expect(storedData().days[YESTERDAY]?.ticked).toHaveLength(1);
    expect(screen.queryByRole("button", { name: / open ·/ })).not.toBeInTheDocument();
  });

  it("is not offered on day one, when there is no yesterday to forget", () => {
    open(account({ age: 1, habits: ["workout"] }));
    expect(screen.queryByRole("button", { name: /yesterday/ })).not.toBeInTheDocument();
  });

  it("is not offered once yesterday is complete", () => {
    open(account({ habits: ["workout"], ticks: { workout: [1] } }));
    expect(screen.queryByRole("button", { name: / open ·/ })).not.toBeInTheDocument();
  });

  it("offers no way at all to reach a closed Day", async () => {
    const user = userEvent.setup();
    // Two Days ago was missed and is closed permanently.
    open(account({ habits: ["workout"], ticks: { workout: [1] } }));
    await user.click(row("workout"));

    // Everything tappable on Home is today or yesterday. There is no third.
    const labels = screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent ?? "");
    expect(labels.some((label) => label.includes("1 August 2026"))).toBe(false);
  });
});

describe("what Home says about the year", () => {
  it("counts the days on file above the grid", () => {
    open(account({ age: 12, habits: ["workout"] }));
    expect(screen.getByText("ticks · last 12 days")).toBeInTheDocument();
  });

  it("names the months across the top of the year", () => {
    open(account({ age: 100, habits: ["workout"] }));

    // A rolling year ending today, 3 August 2026: it opens in August 2025 and
    // closes in August 2026, so every month is named and August twice.
    const strip = document.querySelector(".axis-top")!;
    expect(strip.textContent).toContain("aug");
    expect(strip.textContent).toContain("jan");
    expect(strip.textContent).toContain("dec");
    // No legend underneath restating where it began: the strip already said.
    expect(screen.queryByText("aug 2025")).not.toBeInTheDocument();
    expect(screen.queryByText("today")).not.toBeInTheDocument();
  });

  it("names monday, wednesday and friday down the side, and no other day", () => {
    open(account({ age: 100, habits: ["workout"] }));

    const side = document.querySelector(".axis-side")!;
    expect(side.textContent).toBe("monwedfri");
    // At the year's 4.9px rows, seven names would overlap into a stack.
    expect(side.textContent).not.toContain("tue");
    expect(side.textContent).not.toContain("sat");
  });

  it("draws the same 365 Squares however old the account is", () => {
    open(account({ age: 12, habits: ["workout"] }));
    expect(drawn()).toHaveLength(365);
    cleanup();

    open(account({ age: 365, habits: ["workout"] }));
    expect(drawn()).toHaveLength(365);
  });

  it("carries one chip and nothing else that can go to zero", async () => {
    const user = userEvent.setup();
    const props = open(account({ habits: ["workout"], ticks: { workout: [0, 1, 2] } }));

    await user.click(screen.getByRole("button", { name: "settings" }));
    expect(props.onSettings).toHaveBeenCalled();
    // The Share Card lives in settings, next to the opt-ins that govern it.
    expect(screen.queryByRole("button", { name: /share/i })).not.toBeInTheDocument();
  });

  it("shows a Chain only for a Habit that opted into one", () => {
    const data = account({ habits: ["workout", "read"], ticks: { workout: [0, 1], read: [0, 1] } });
    open(setChained(data, idOf(data, "workout"), true));

    expect(screen.getByText("chain 2 days")).toBeInTheDocument();
    expect(screen.getByText("2 ticks · unchained")).toBeInTheDocument();
  });
});

describe("the Lens over the Overview", () => {
  /*
   * Today in the harness is Monday the 3rd of August 2026. The week runs Sunday
   * the 2nd to Saturday the 8th; the month runs the 1st to the 31st.
   */
  it("draws a whole week — including the Days still to come — at the largest Squares", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }));
    expect(drawn()).toHaveLength(365);

    await user.click(lens("week"));

    expect(drawn()).toHaveLength(7);
    // Nothing spills out of a week: it is exactly one column.
    expect(document.querySelectorAll(".sq-pad")).toHaveLength(0);
    expect(grid().style.getPropertyValue("--sq-size")).toBe(`${MAX_SQUARE}px`);
  });

  it("draws the whole month, then the whole year", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }));

    await user.click(lens("month"));
    expect(drawn()).toHaveLength(31);

    await user.click(lens("year"));
    expect(drawn()).toHaveLength(365);
  });

  it("never moves the Total, whatever it draws", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"], ticks: { workout: [0, 10, 20] } }));
    await vi.waitFor(() => expect(total()).toBe("3"));

    await user.click(lens("week"));

    // Two of those three Ticks are outside the week now on screen. The Total is
    // the year's under every Lens: a number that can fall is not on Home.
    expect(drawn()).toHaveLength(7);
    expect(total()).toBe("3");
    expect(screen.getByText("ticks · last 30 days")).toBeInTheDocument();
  });

  it("says what it is drawing, above the grid or under it", async () => {
    const user = userEvent.setup();
    open(account({ age: 100, habits: ["workout"] }));

    const strip = () => document.querySelector(".axis-top")!.textContent;
    // The year names its months and needs no legend under it.
    expect(strip()).toContain("jan");
    expect(document.querySelector(".legend")).toBeNull();

    // The week is a single row, so its weekdays go on top — and the legend
    // stays, because `mon wed fri` never says the row runs Sunday to Saturday.
    await user.click(lens("week"));
    expect(strip()).toBe("monwedfri");
    expect(screen.getByText("sunday")).toBeInTheDocument();
    expect(screen.getByText("this week")).toBeInTheDocument();
    expect(screen.getByText("saturday")).toBeInTheDocument();

    // The month names itself, and carries the year no other line has.
    await user.click(lens("month"));
    expect(strip()).toBe("aug 2026");
    expect(document.querySelector(".legend")).toBeNull();
  });

  it("marks today, so a Day still to come cannot read as a Day that was missed", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }));
    await user.click(lens("week"));

    const squares = Array.from(drawn());
    const today = document.querySelector(".sq-today, .sq-echo");
    // Monday: Sunday behind it, and the rest of the week still ahead.
    expect(squares.indexOf(today as Element)).toBe(1);
  });

  it("keeps yesterday tickable while a shorter Lens is on", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }));
    await user.click(lens("week"));

    // The Lens is a way of looking, not a way of editing: the Grace Window is
    // untouched by it.
    await user.click(screen.getByRole("button", { name: /yesterday · 1 open/ }));
    const section = document.querySelector(".row-yesterday")!;
    await user.click(within(section as HTMLElement).getByRole("button", { name: /^workout,/ }));
    expect(storedData().days[YESTERDAY]?.ticked).toHaveLength(1);
  });

  it("is offered from day one, because a frame never depends on the account's age", () => {
    open(account({ age: 1, habits: ["workout"] }));
    expect(lens("week")).toBeInTheDocument();
    expect(lens("year")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("getting to the rest of the app", () => {
  it("opens a Habit from its chevron", async () => {
    const user = userEvent.setup();
    const data = account({ habits: ["workout"] });
    const props = open(data);
    await user.click(screen.getByRole("button", { name: "Open workout" }));
    expect(props.onOpenHabit).toHaveBeenCalledWith(idOf(data, "workout"));
  });

  it("offers a new Habit below the list once there is one", async () => {
    const user = userEvent.setup();
    const props = open(account({ habits: ["workout"] }));
    await user.click(screen.getByRole("button", { name: "+ new habit" }));
    expect(props.onNewHabit).toHaveBeenCalled();
  });

  it("does not list an archived Habit", () => {
    open(account({ habits: ["workout", "read"], archived: ["read"] }));
    expect(screen.getByRole("button", { name: /^workout,/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^read,/ })).not.toBeInTheDocument();
  });
});
