import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HomeScreen } from "./HomeScreen";
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

describe("Home on day one", () => {
  it("asks for a first Habit rather than showing an empty list", () => {
    open(account({ age: 1 }));
    expect(screen.getByRole("button", { name: "name your first habit" })).toBeInTheDocument();
    expect(screen.getByText("two or three is the honest ceiling. start with one.")).toBeInTheDocument();
  });

  it("says the year is one day old rather than showing a zero span", () => {
    open(account({ age: 1, habits: ["workout"] }));
    expect(screen.getByText("ticks · the year is one day old")).toBeInTheDocument();
    expect(screen.getByText("installed today")).toBeInTheDocument();
    expect(screen.getByText("tap a square. that is the whole app.")).toBeInTheDocument();
  });

  it("draws a single Square, because only one Day has happened", () => {
    open(account({ age: 1, habits: ["workout"] }));
    expect(document.querySelectorAll(".sq:not(.sq-future):not(.sq-unborn)")).toHaveLength(1);
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
      screen.getByRole("button", { name: /yesterday · 2 still open · closes at midnight/ }),
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

    await user.click(screen.getByRole("button", { name: /yesterday · 1 still open/ }));
    const section = document.querySelector(".row-yesterday")!;
    await user.click(within(section as HTMLElement).getByRole("button", { name: /^workout,/ }));

    expect(storedData().days[YESTERDAY]?.ticked).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /still open/ })).not.toBeInTheDocument();
  });

  it("is not offered on day one, when there is no yesterday to forget", () => {
    open(account({ age: 1, habits: ["workout"] }));
    expect(screen.queryByRole("button", { name: /yesterday/ })).not.toBeInTheDocument();
  });

  it("is not offered once yesterday is complete", () => {
    open(account({ habits: ["workout"], ticks: { workout: [1] } }));
    expect(screen.queryByRole("button", { name: /still open/ })).not.toBeInTheDocument();
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
  it("counts the days on file while the grid is still young", () => {
    open(account({ age: 12, habits: ["workout"] }));
    expect(screen.getByText("ticks · last 12 days")).toBeInTheDocument();
    expect(screen.getByText("12 days on file")).toBeInTheDocument();
  });

  it("names the month it started from once the grid has settled", () => {
    open(account({ age: 100, habits: ["workout"] }));
    expect(screen.getByText("apr 2026")).toBeInTheDocument();
    expect(screen.getByText("the grid widens as the year does")).toBeInTheDocument();
  });

  it("stops widening at a full year", () => {
    open(account({ age: 365, habits: ["workout"] }));
    expect(screen.getByText("53 weeks, no scrolling")).toBeInTheDocument();
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
    const data = account({ habits: ["workout", "read"] });
    const archived = {
      ...data,
      habits: data.habits.map((h) => (h.name === "read" ? { ...h, archivedOn: TODAY } : h)),
    };
    open(archived);
    expect(screen.getByRole("button", { name: /^workout,/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^read,/ })).not.toBeInTheDocument();
  });
});
