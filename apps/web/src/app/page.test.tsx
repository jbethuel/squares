import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./page";
import { account, onDevice, storedData } from "@/test/harness";
import type { AppData } from "@squares/domain/types";

/**
 * jsdom has a history but no back button, so the browser's is modelled here:
 * pushState records the depth of the entry, and back()/go() pop entries and
 * fire popstate with the one beneath — asynchronously, as a real browser does.
 */
const entries: ({ depth?: number } | null)[] = [];

function navigate(delta: number) {
  const target = Math.max(0, entries.length - 1 + delta);
  entries.length = target + 1;
  window.dispatchEvent(new PopStateEvent("popstate", { state: entries[target] ?? null }));
}

beforeEach(() => {
  entries.length = 0;
  entries.push(null);

  vi.spyOn(window.history, "pushState").mockImplementation((state) => {
    entries.push(state as { depth?: number } | null);
  });
  vi.spyOn(window.history, "back").mockImplementation(() => {
    queueMicrotask(() => navigate(-1));
  });
  vi.spyOn(window.history, "go").mockImplementation((delta) => {
    queueMicrotask(() => navigate(delta ?? 0));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Let a deferred popstate land, the way the browser would deliver it. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

/** The hardware back button, pressed `steps` times in one go. */
async function pressBack(steps = 1) {
  await act(async () => {
    navigate(-steps);
  });
}

/**
 * Rendered under StrictMode because `next.config.ts` turns it on, so the app
 * runs with doubled renders and doubled state updaters in development. A screen
 * push that is not pure shows up here rather than in a browser.
 */
function open(data: AppData = account({ habits: ["workout"] })) {
  onDevice(data);
  return render(
    <StrictMode>
      <Page />
    </StrictMode>,
  );
}

const onHome = () => screen.queryByRole("button", { name: "settings" }) !== null;
const click = async (user: ReturnType<typeof userEvent.setup>, name: string | RegExp) => {
  await user.click(screen.getByRole("button", { name }));
  await settle();
};

describe("moving through the app", () => {
  it("opens on Home", () => {
    open();
    expect(onHome()).toBe(true);
  });

  it("goes into a Habit and back out again", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"], ticks: { workout: [0, 1] } }));

    await click(user, "Open workout");
    expect(screen.getByRole("heading", { name: "workout" })).toBeInTheDocument();

    await click(user, "‹ back");
    expect(onHome()).toBe(true);
  });

  it("goes into settings and back", async () => {
    const user = userEvent.setup();
    open();

    await click(user, "settings");
    expect(screen.getByRole("heading", { name: "settings" })).toBeInTheDocument();

    await click(user, "‹ back");
    expect(onHome()).toBe(true);
  });

  it("reaches the Share Card through settings, and unwinds one screen at a time", async () => {
    const user = userEvent.setup();
    open();

    await click(user, "settings");
    await click(user, "make a share card ›");
    expect(screen.getByRole("heading", { name: "share card" })).toBeInTheDocument();

    await click(user, "‹ back");
    expect(screen.getByRole("heading", { name: "settings" })).toBeInTheDocument();
    await click(user, "‹ back");
    expect(onHome()).toBe(true);
  });

  it("leaves a half-typed Habit without saving it", async () => {
    const user = userEvent.setup();
    open(account({ habits: [] }));

    await click(user, "name your first habit");
    await user.type(screen.getByLabelText("name"), "workout");
    await click(user, "‹ back");

    expect(onHome()).toBe(true);
    expect(storedData().habits).toEqual([]);
  });

  it("adds a Habit from Home and lands back on Home with it", async () => {
    const user = userEvent.setup();
    open(account({ habits: [] }));

    await click(user, "name your first habit");
    await user.type(screen.getByLabelText("name"), "workout{Enter}");
    await settle();

    expect(onHome()).toBe(true);
    expect(screen.getByRole("button", { name: /^workout,/ })).toBeInTheDocument();
  });
});

/**
 * Installed, there is no browser back button behind any of this — the manifest
 * asks for `standalone`. So the rule is that every Screen you can leave shows
 * the way out, and Home, which you cannot leave, shows no chrome for it.
 */
describe("the way out", () => {
  const backBar = () => screen.queryByRole("button", { name: "‹ back" });

  it("is absent on Home", () => {
    open();
    expect(backBar()).not.toBeInTheDocument();
  });

  it("is present on every Screen above Home", async () => {
    const user = userEvent.setup();
    open();

    await click(user, "Open workout");
    expect(backBar()).toBeInTheDocument();

    await pressBack();
    await click(user, "+ new habit");
    expect(backBar()).toBeInTheDocument();

    await pressBack();
    await click(user, "settings");
    expect(backBar()).toBeInTheDocument();

    await click(user, "make a share card ›");
    expect(backBar()).toBeInTheDocument();
  });

  it("goes when Home does, so leaving the last Screen takes it away", async () => {
    const user = userEvent.setup();
    open();

    await click(user, "settings");
    expect(backBar()).toBeInTheDocument();

    await click(user, "‹ back");
    expect(onHome()).toBe(true);
    expect(backBar()).not.toBeInTheDocument();
  });
});

describe("the browser's own back button", () => {
  it("unwinds the stack rather than leaving the app", async () => {
    const user = userEvent.setup();
    open();

    await click(user, "settings");
    await pressBack();
    expect(onHome()).toBe(true);
  });

  it("lands on Home in one step from two screens deep", async () => {
    const user = userEvent.setup();
    open();

    // Home -> settings -> share is a jump of two, which the depth stored in the
    // history entry is what makes survivable with a single popstate.
    await click(user, "settings");
    await click(user, "make a share card ›");
    expect(screen.getByRole("heading", { name: "share card" })).toBeInTheDocument();

    await pressBack(2);
    expect(onHome()).toBe(true);
  });
});

describe("archiving from inside a Habit", () => {
  it("leaves the user on the Screen, because the switch can be moved back", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout", "read"] }));

    await click(user, "Open workout");
    await user.click(screen.getByRole("switch", { name: /^archive/ }));

    // Nothing navigates: the Habit is still the subject of the Screen, and the
    // switch that put it in the Archive is the one that takes it back out.
    expect(onHome()).toBe(false);
    expect(screen.getByRole("switch", { name: /^archive/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await pressBack();
    expect(onHome()).toBe(true);
    expect(screen.queryByRole("button", { name: /^workout,/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^read,/ })).toBeInTheDocument();
  });

  it("reaches an Archived Habit again through settings, and takes it back", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout", "read"], archived: ["workout"] }));

    expect(screen.queryByRole("button", { name: /^workout,/ })).not.toBeInTheDocument();

    await click(user, "settings");
    await click(user, "workout ›");
    await user.click(screen.getByRole("switch", { name: /^archive/ }));

    // Back out through settings to Home, where the Habit is live again. The
    // account was Archived at today, so taking it back today is the same-Day
    // undo — one open Span, not a Span and a zero-length gap. Where the gap is
    // real, `mutations.test.ts` is what holds it.
    await pressBack(2);
    expect(onHome()).toBe(true);
    expect(screen.getByRole("button", { name: /^workout,/ })).toBeInTheDocument();
    expect(storedData().habits.find((h) => h.name === "workout")?.spans).toEqual([
      { from: expect.any(String), to: null },
    ]);
  });
});
