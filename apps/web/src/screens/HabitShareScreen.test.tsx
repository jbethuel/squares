import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HabitShareScreen } from "./HabitShareScreen";
import { setStreaks } from "@squares/domain/mutations";
import { account, idOf, onDevice, renderWithStore } from "@/test/harness";
import { downloads, drawnText, shared, stubSharing } from "@/test/dom";
import type { AppData } from "@squares/domain/types";

function open(data: AppData, habitId: string) {
  onDevice(data);
  renderWithStore(<HabitShareScreen habitId={habitId} />);
}

/** Everything the card actually painted, once the face has loaded. */
async function painted(): Promise<string[]> {
  await vi.waitFor(() => expect(drawnText().length).toBeGreaterThan(0));
  return drawnText();
}

describe("the Habit Card names only the one Habit", () => {
  it("says in words that it names this Habit, and nothing else", () => {
    const data = account({ habits: ["workout", "no drinking"] });
    open(data, idOf(data, "workout"));
    expect(screen.getByText("this card names workout.")).toBeInTheDocument();
  });

  it("paints only this Habit's name", async () => {
    const data = account({ age: 60, habits: ["workout", "no drinking"] });
    open(data, idOf(data, "workout"));
    const text = await painted();
    expect(text).toContain("workout");
    expect(text.some((line) => line.includes("drinking"))).toBe(false);
  });

  it("titles the Screen with the Habit's own name", () => {
    const data = account({ habits: ["workout"] });
    open(data, idOf(data, "workout"));
    expect(screen.getByRole("heading", { name: "share workout" })).toBeInTheDocument();
  });
});

describe("a Hidden Habit has no Habit Card", () => {
  it("renders nothing for a Hidden Habit", () => {
    const data = account({ habits: ["workout"], hidden: ["workout"] });
    onDevice(data);
    const { container } = renderWithStore(<HabitShareScreen habitId={idOf(data, "workout")} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a Habit that is not there", () => {
    onDevice(account({ habits: ["workout"] }));
    const { container } = renderWithStore(<HabitShareScreen habitId="ghost" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("the Streak on a Habit Card", () => {
  it("carries no Streak unless the Habit is a Streak Habit", async () => {
    const data = account({ age: 30, habits: ["workout"] });
    open(data, idOf(data, "workout"));
    const text = await painted();
    expect(text.some((line) => line.includes("streak"))).toBe(false);
  });

  it("shows the Streak once the Habit opts in, matching its own Screen", async () => {
    let data = account({ age: 30, habits: ["workout"], logs: { workout: [0] } });
    data = setStreaks(data, idOf(data, "workout"), true);
    open(data, idOf(data, "workout"));
    const text = await painted();
    expect(text).toContain("1-day streak");
    // The Streak is drawn onto the canvas, not stated only in the disclosure
    // text below it — the accessible label has to say it too.
    expect(
      screen.getByRole("img", { name: /naming workout, a 1-day streak/ }),
    ).toBeInTheDocument();
  });
});

describe("saving the card", () => {
  it("saves a PNG named for the app, not the Habit", async () => {
    const user = userEvent.setup();
    const data = account({ habits: ["workout"] });
    open(data, idOf(data, "workout"));

    await user.click(screen.getByRole("button", { name: "save .png" }));
    await vi.waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0]?.filename).toBe("squares.png");
    expect(screen.getByRole("status")).toHaveTextContent("saved");
  });

  it("goes through the OS sheet where the device has one", async () => {
    stubSharing();
    const user = userEvent.setup();
    const data = account({ habits: ["workout"] });
    open(data, idOf(data, "workout"));

    await user.click(screen.getByRole("button", { name: "save .png" }));
    await vi.waitFor(() => expect(shared.map((f) => f.name)).toEqual(["squares.png"]));
    expect(downloads).toHaveLength(0);
  });
});
