import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ShareScreen } from "./ShareScreen";
import { setSharedName } from "@/domain/mutations";
import { account, idOf, onDevice, renderWithStore, TODAY } from "@/test/harness";
import { downloads, drawnText, shared, stubSharing } from "@/test/dom";
import type { AppData } from "@/domain/types";

function open(data: AppData) {
  onDevice(data);
  const onBack = vi.fn();
  renderWithStore(<ShareScreen onBack={onBack} />);
  return { onBack };
}

/** Everything the card actually painted, once the face has loaded. */
async function painted(): Promise<string[]> {
  await vi.waitFor(() => expect(drawnText().length).toBeGreaterThan(0));
  return drawnText();
}

function named(data: AppData, ...names: string[]): AppData {
  return names.reduce((current, name) => setSharedName(current, idOf(current, name), true), data);
}

describe("the card is anonymous by default", () => {
  it("says in words that it carries no names, before it can be saved", async () => {
    open(account({ habits: ["took my meds", "no drinking"] }));
    expect(
      screen.getByText(/no habit names on this card. a year of shape and one number/),
    ).toBeInTheDocument();
    // And the canvas agrees with the words.
    expect(await painted()).not.toContain("took my meds");
  });

  it("never paints a name that was not opted in", async () => {
    open(account({ age: 60, habits: ["took my meds", "no drinking"], ticks: { "took my meds": [0, 1] } }));
    const text = await painted();
    expect(text.some((line) => line.includes("meds"))).toBe(false);
    expect(text.some((line) => line.includes("drinking"))).toBe(false);
  });

  it("names only what was opted in, and says so before saving", async () => {
    const data = account({ age: 60, habits: ["workout", "no drinking", "pickleball"] });
    open(named(data, "workout", "pickleball"));

    expect(screen.getByText("workout · pickleball")).toBeInTheDocument();
    expect(screen.getByText(/everything else stays anonymous/)).toBeInTheDocument();

    const text = await painted();
    // One line, lowercase, never a per-Habit breakdown.
    expect(text).toContain("workout · pickleball");
    expect(text.some((line) => line.includes("drinking"))).toBe(false);
  });

  it("drops an archived Habit's name, whose opt-in can no longer be reached", async () => {
    const data = named(account({ age: 60, habits: ["no drinking"] }), "no drinking");
    open({ ...data, habits: data.habits.map((h) => ({ ...h, archivedOn: TODAY })) });

    expect(screen.getByText(/no habit names on this card/)).toBeInTheDocument();
    expect((await painted()).some((line) => line.includes("drinking"))).toBe(false);
  });

  it("offers a way back to the opt-ins whenever it does name something", async () => {
    const user = userEvent.setup();
    const data = named(account({ habits: ["workout"] }), "workout");
    const { onBack } = open(data);

    await user.click(screen.getByRole("button", { name: "‹ change what is named" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("offers no such link when there is nothing named to change", () => {
    open(account({ habits: ["workout"] }));
    expect(screen.queryByRole("button", { name: /change what is named/ })).not.toBeInTheDocument();
  });
});

describe("what the card carries", () => {
  it("is a year of shape, one number and its span — and no date", async () => {
    open(account({ age: 60, habits: ["a", "b"], ticks: { a: [0, 1, 2], b: [0] } }));
    const text = await painted();

    expect(text).toContain("4");
    expect(text).toContain("ticks · last 60 days");
    expect(text).toContain("squares");
    // Nothing that says which day it was made, or who made it.
    expect(text.some((line) => /2026|august|aug/i.test(line))).toBe(false);
  });

  it("describes itself to assistive tech, names included", () => {
    const data = named(account({ age: 60, habits: ["workout"], ticks: { workout: [0, 2] } }), "workout");
    open(data);
    expect(
      screen.getByRole("img", { name: "Share card: 2 ticks over 60 days, naming workout" }),
    ).toBeInTheDocument();
  });

  it("says plainly when it names nothing", () => {
    open(account({ age: 60, habits: ["workout"], ticks: { workout: [0] } }));
    expect(
      screen.getByRole("img", { name: "Share card: 1 ticks over 60 days, no habit names" }),
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
    expect(screen.getByRole("status")).toHaveTextContent("saved");
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
    expect(screen.getByRole("status")).toHaveTextContent("saved");
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
