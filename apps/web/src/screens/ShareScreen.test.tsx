import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ShareScreen } from "./ShareScreen";
import { account, onDevice, renderWithStore } from "@/test/harness";
import { downloads, drawnText, shared, stubSharing } from "@/test/dom";
import type { AppData } from "@squares/domain/types";

function open(data: AppData) {
  onDevice(data);
  renderWithStore(<ShareScreen />);
}

/** Everything the card actually painted, once the face has loaded. */
async function painted(): Promise<string[]> {
  await vi.waitFor(() => expect(drawnText().length).toBeGreaterThan(0));
  return drawnText();
}

describe("the card names every visible Habit", () => {
  it("names every Habit in words, before it can be saved", () => {
    open(account({ habits: ["took my meds", "no drinking"] }));
    expect(screen.getByText("your habit names appear on this card: took my meds, no drinking.")).toBeInTheDocument();
  });

  it("paints every visible Habit's name", async () => {
    open(
      account({
        age: 60,
        habits: ["took my meds", "no drinking"],
        logs: { "took my meds": [0, 1] },
      }),
    );
    expect(await painted()).toContain("took my meds · no drinking");
  });

  // A name on a Card reads as something the user does, and a retired Habit is
  // not that. Showing it again is reachable — this is a rule about what the
  // Card may claim, not a workaround for a control that could not be found.
  it("drops a Hidden Habit's name, and keeps naming what is still visible", async () => {
    const data = account({ age: 60, habits: ["workout", "no drinking"], hidden: ["no drinking"] });
    open(data);

    expect(screen.getByText("your habit name appears on this card: workout.")).toBeInTheDocument();
    expect((await painted()).some((line) => line.includes("drinking"))).toBe(false);
  });

  it("says plainly when there are no Habits to name", () => {
    open(account({ habits: [] }));
    expect(screen.getByText("no habits yet. add one on home to fill this card.")).toBeInTheDocument();
  });
});

describe("what the card carries", () => {
  it("is a year of shape, one number and what it counts — and no date", async () => {
    open(account({ age: 60, habits: ["a", "b"], logs: { a: [0, 1, 2], b: [0] } }));
    const text = await painted();

    expect(text).toContain("4");
    // The caption names what the number counts, because the number is a Tally
    // of the Frame drawn rather than the Total, and the card is handed to
    // someone with no other context.
    expect(text).toContain("logs · the last 365 days");
    expect(text).toContain("squares");
    // Nothing that says which day it was made, or who made it.
    expect(text.some((line) => /2026|august|aug/i.test(line))).toBe(false);
  });

  it("describes itself to assistive tech, names included", () => {
    open(account({ age: 60, habits: ["workout"], logs: { workout: [0, 2] } }));
    expect(
      screen.getByRole("img", { name: "share card: 2 logs in the last 365 days. habits: workout." }),
    ).toBeInTheDocument();
  });

  it("says plainly when it names nothing, because there is nothing on it", () => {
    open(account({ habits: [] }));
    expect(
      screen.getByRole("img", { name: "share card: 0 logs in the last 365 days." }),
    ).toBeInTheDocument();
  });
});

describe("the card's own Lens", () => {
  // Picked here rather than inherited from Home, which this Screen is not
  // reached from — a card that depended on what another Screen was last
  // showing would be a card you cannot predict.
  it("opens on the year, and redraws the card when it changes", async () => {
    const user = userEvent.setup();
    open(account({ age: 60, habits: ["a"], logs: { a: [0, 1, 2, 20, 40] } }));

    expect(screen.getByRole("button", { name: "year" })).toHaveAttribute("aria-pressed", "true");
    expect(await painted()).toContain("logs · the last 365 days");

    await user.click(screen.getByRole("button", { name: "week" }));

    // Today is a Monday in the harness, so the week holds today and yesterday:
    // two of those five Logs, and the Tally says two rather than five.
    await vi.waitFor(async () => expect(await painted()).toContain("logs · this week"));
    expect(await painted()).toContain("2");
  });

  it("tells assistive tech which Lens the card was drawn at", async () => {
    const user = userEvent.setup();
    open(account({ age: 60, habits: ["a"], logs: { a: [0, 1] } }));

    await user.click(screen.getByRole("button", { name: "month" }));
    expect(
      screen.getByRole("img", { name: /share card: 2 logs in this month/ }),
    ).toBeInTheDocument();
  });
});

describe("saving the card", () => {
  it("saves a PNG whose filename carries no date either", async () => {
    const user = userEvent.setup();
    open(account({ age: 60, habits: ["workout"] }));

    await user.click(screen.getByRole("button", { name: "save .png" }));
    await vi.waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0]?.filename).toBe("squares.png");
    expect(screen.getByRole("status")).toHaveTextContent("saved.");
  });

  it("is one button, not a save and a share that do the same thing", () => {
    stubSharing();
    open(account({ habits: ["workout"] }));
    expect(screen.queryByRole("button", { name: "share…" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "save .png" })).toBeInTheDocument();
  });

  it("goes through the OS sheet where the device has one", async () => {
    stubSharing();
    const user = userEvent.setup();
    open(account({ age: 60, habits: ["workout"] }));

    await user.click(screen.getByRole("button", { name: "save .png" }));

    // The OS sheet, driven by the user — the app never posts anything itself.
    await vi.waitFor(() => expect(shared.map((f) => f.name)).toEqual(["squares.png"]));
    // iOS never performs the download, so it must not also be attempted.
    expect(downloads).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent("saved.");
  });

  it("does not claim the card was saved when the sheet is dismissed", async () => {
    stubSharing("dismissed");
    const user = userEvent.setup();
    open(account({ age: 60, habits: ["workout"] }));

    await user.click(screen.getByRole("button", { name: "save .png" }));

    await vi.waitFor(() => expect(shared).toHaveLength(1));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(downloads).toHaveLength(0);
  });

  // The Screen no longer claims in words that there is no hosted page. The
  // claim is asserted where it cannot be undone by a copy edit: data.spec.ts
  // fails if the app makes any external request at all.
});
