import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HabitRow } from "./HabitRow";
import { longLabel } from "@squares/domain/date";
import { setStreaks } from "@squares/domain/mutations";
import { elapsedDays } from "@squares/domain/selectors";
import { account, idOf, TODAY, YESTERDAY } from "@/test/harness";
import type { AppData } from "@squares/domain/types";

function renderRow(data: AppData, name: string, overrides: { offset?: number; onOpen?: () => void } = {}) {
  const onLog = vi.fn();
  const habit = data.habits.find((h) => h.name === name)!;
  render(
    <HabitRow
      habit={habit}
      data={data}
      today={TODAY}
      elapsed={elapsedDays(data, TODAY)}
      offset={overrides.offset ?? 0}
      onLog={onLog}
      onOpen={overrides.onOpen}
    />,
  );
  return { onLog, habit };
}

const logTarget = () => screen.getByRole("button", { name: /workout/i });

describe("the Log target", () => {
  it("is the row itself, and says what it is and what Day it is for", () => {
    renderRow(account({ habits: ["workout"] }), "workout");
    expect(logTarget()).toHaveAccessibleName(`workout, not logged for ${longLabel(TODAY)}`);
    expect(logTarget()).toHaveAttribute("aria-pressed", "false");
  });

  it("reports itself pressed once the Day is Logged", () => {
    renderRow(account({ habits: ["workout"], logs: { workout: [0] } }), "workout");
    expect(logTarget()).toHaveAttribute("aria-pressed", "true");
    expect(logTarget()).toHaveAccessibleName(`workout, logged for ${longLabel(TODAY)}`);
  });

  it("commits a Log for today", async () => {
    const user = userEvent.setup();
    const { onLog, habit } = renderRow(account({ habits: ["workout"] }), "workout");
    await user.click(logTarget());
    expect(onLog).toHaveBeenCalledWith(habit.id, TODAY, true);
  });

  it("commits an unlog when the Day is already Logged", async () => {
    const user = userEvent.setup();
    const { onLog, habit } = renderRow(account({ habits: ["workout"], logs: { workout: [0] } }), "workout");
    await user.click(logTarget());
    expect(onLog).toHaveBeenCalledWith(habit.id, TODAY, false);
  });

  it("commits against yesterday in the yesterday section", async () => {
    const user = userEvent.setup();
    const { onLog, habit } = renderRow(account({ habits: ["workout"] }), "workout", { offset: 1 });
    await user.click(logTarget());
    expect(onLog).toHaveBeenCalledWith(habit.id, YESTERDAY, true);
  });
});

describe("the haptic", () => {
  it("fires once on the tap that adds", async () => {
    const user = userEvent.setup();
    renderRow(account({ habits: ["workout"] }), "workout");
    await user.click(logTarget());
    expect(navigator.vibrate).toHaveBeenCalledTimes(1);
    expect(navigator.vibrate).toHaveBeenCalledWith(8);
  });

  it("does not fire on an unlog, because correcting a mistake is administrative", async () => {
    const user = userEvent.setup();
    renderRow(account({ habits: ["workout"], logs: { workout: [0] } }), "workout");
    await user.click(logTarget());
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it("survives a browser that refuses to vibrate", async () => {
    const user = userEvent.setup();
    vi.mocked(navigator.vibrate).mockImplementation(() => {
      throw new Error("not allowed outside a user gesture");
    });
    const { onLog } = renderRow(account({ habits: ["workout"] }), "workout");
    await user.click(logTarget());
    // Vibration is a nicety; the Log is the product.
    expect(onLog).toHaveBeenCalled();
  });
});

describe("the press and the spring", () => {
  it("marks the row pressed on pointer down and releases it on up", async () => {
    const user = userEvent.setup();
    renderRow(account({ habits: ["workout"] }), "workout");
    const row = document.querySelector(".row")!;

    await user.pointer({ keys: "[MouseLeft>]", target: logTarget() });
    expect(row).toHaveAttribute("data-pressed", "true");
    await user.pointer({ keys: "[/MouseLeft]", target: logTarget() });
    expect(row).not.toHaveAttribute("data-pressed");
  });

  it("releases the press when the thumb slides off without committing", async () => {
    const user = userEvent.setup();
    const { onLog } = renderRow(account({ habits: ["workout"] }), "workout");
    const row = document.querySelector(".row")!;

    await user.pointer({ keys: "[MouseLeft>]", target: logTarget() });
    await user.unhover(logTarget());
    expect(row).not.toHaveAttribute("data-pressed");
    expect(onLog).not.toHaveBeenCalled();
  });

  it("pulses today's Square on commit and lets it go", async () => {
    const user = userEvent.setup();
    renderRow(account({ habits: ["workout"] }), "workout");
    await user.click(logTarget());

    const today = () => document.querySelectorAll(".tail-sq")[7]!;
    expect(today()).toHaveAttribute("data-pulse", "true");
    // The spring is 260ms and the pulse is released just after it lands.
    await vi.waitFor(() => expect(today()).not.toHaveAttribute("data-pulse"), { timeout: 1000 });
  });
});

describe("what the row says about itself", () => {
  it("counts Logs for a Habit with no Streak, and nothing that can go to zero", () => {
    renderRow(account({ habits: ["workout"], logs: { workout: [0, 3, 9] } }), "workout");
    expect(screen.getByText("3 logs")).toBeInTheDocument();
    expect(screen.queryByText(/streak/)).not.toBeInTheDocument();
  });

  it("says a log, not logs, at one", () => {
    renderRow(account({ habits: ["workout"], logs: { workout: [0] } }), "workout");
    expect(screen.getByText("1 log")).toBeInTheDocument();
  });

  it("counts the Streak once the Habit is opted in", () => {
    const data = account({ habits: ["workout"], logs: { workout: [0, 1, 2] } });
    renderRow(setStreaks(data, idOf(data, "workout"), true), "workout");
    expect(screen.getByText("streak 3 days")).toBeInTheDocument();
  });

  it("says a day, not days, at one", () => {
    const data = account({ habits: ["workout"], logs: { workout: [0] } });
    renderRow(setStreaks(data, idOf(data, "workout"), true), "workout");
    expect(screen.getByText("streak 1 day")).toBeInTheDocument();
  });

  it("says a Streak is broken rather than showing a zero", () => {
    const data = account({ habits: ["workout"], logs: { workout: [5, 6] } });
    renderRow(setStreaks(data, idOf(data, "workout"), true), "workout");
    expect(screen.getByText("streak broken")).toBeInTheDocument();
  });

  it("does not call a Streak broken on day one, when there was never one to break", () => {
    const data = account({ age: 1, habits: ["workout"] });
    renderRow(setStreaks(data, idOf(data, "workout"), true), "workout");
    expect(screen.getByText("no streak yet")).toBeInTheDocument();
  });
});

describe("opening a Habit", () => {
  it("is a separate, deliberately small target that does not Log", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const { onLog, habit } = renderRow(account({ habits: ["workout"] }), "workout", { onOpen });

    await user.click(screen.getByRole("button", { name: "Open workout" }));
    expect(onOpen).toHaveBeenCalledWith(habit.id);
    expect(onLog).not.toHaveBeenCalled();
  });

  it("is not offered in the yesterday section, which is not a browsing surface", () => {
    renderRow(account({ habits: ["workout"] }), "workout", { offset: 1, onOpen: undefined });
    expect(screen.queryByRole("button", { name: /^Open/ })).not.toBeInTheDocument();
  });
});
