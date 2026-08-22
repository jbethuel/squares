import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StoreProvider, useStore } from "@squares/domain/store";
import { webStorage } from "./storage";
import { ApplyTheme, resolveTheme } from "./theme";
import { addHabit, toggleLog } from "@squares/domain/mutations";
import { STORAGE_KEY } from "@squares/domain/storage";
import { account, onDevice, storedData, TODAY, withStore, YESTERDAY } from "@/test/harness";
import { matchedMedia } from "@/test/dom";

const LIGHT = "(prefers-color-scheme: light)";

/** A probe that renders what the store holds and can mutate it. */
function Probe() {
  const { data, today, update } = useStore();
  return (
    <div>
      <span data-testid="today">{today}</span>
      <span data-testid="habits">{data.habits.map((h) => h.name).join(",")}</span>
      <span data-testid="logs">{Object.values(data.days).flatMap((d) => d.logged).length}</span>
      <button type="button" onClick={() => update((current) => addHabit(current, "read", today))}>
        add
      </button>
      <button
        type="button"
        onClick={() => update((current) => toggleLog(current, current.habits[0]!.id, today, today))}
      >
        log
      </button>
    </div>
  );
}

describe("the store is the one source of the year", () => {
  it("refuses to be used outside a provider rather than inventing an empty year", () => {
    // Silence React's error boundary logging for the deliberate throw.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/useStore must be used inside a StoreProvider/);
    error.mockRestore();
  });

  it("loads what is on the device", () => {
    onDevice(account({ habits: ["workout", "read"] }));
    render(withStore(<Probe />));
    expect(screen.getByTestId("habits")).toHaveTextContent("workout,read");
    expect(screen.getByTestId("today")).toHaveTextContent(TODAY);
  });

  it("starts a fresh year on a device that has never run it", () => {
    render(withStore(<Probe />));
    expect(screen.getByTestId("habits")).toHaveTextContent("");
  });

  it("does not paint a skeleton of data that may not exist", () => {
    // The first paint is deliberately blank: storage is only readable on the
    // client, so anything drawn before it is read would be a guess.
    let seen: string | null = null;
    function Peek() {
      seen = "rendered";
      return null;
    }
    render(
      <StoreProvider storage={webStorage}>
        <Peek />
      </StoreProvider>,
    );
    expect(seen).toBe("rendered");
  });

  it("writes every change back to the device", async () => {
    const user = userEvent.setup();
    onDevice(account({ habits: ["workout"] }));
    render(withStore(<Probe />));

    await user.click(screen.getByRole("button", { name: "log" }));
    expect(screen.getByTestId("logs")).toHaveTextContent("1");
    expect(storedData().days[TODAY]?.logged).toHaveLength(1);
  });

  it("writes no Day Record for a Day that was never Logged", () => {
    // ADR 0001: a Day Record holds only the Logs, so an empty one would carry
    // nothing. Opening the app after a gap materialises no history.
    const stale = account({ age: 2, habits: ["workout"] });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stale, days: {} }));
    render(withStore(<Probe />));
    expect(storedData().days[YESTERDAY]).toBeUndefined();
    expect(storedData().days[TODAY]).toBeUndefined();
  });

  it("keeps a Habit added in this session across a reload", async () => {
    const user = userEvent.setup();
    onDevice(account({ habits: ["workout"] }));
    const { unmount } = render(withStore(<Probe />));
    await user.click(screen.getByRole("button", { name: "add" }));
    unmount();

    render(withStore(<Probe />));
    expect(screen.getByTestId("habits")).toHaveTextContent("workout,read");
  });

  it("recovers from a corrupt device rather than refusing to open", () => {
    localStorage.setItem(STORAGE_KEY, "{{{");
    render(withStore(<Probe />));
    expect(screen.getByTestId("habits")).toHaveTextContent("");
  });
});

describe("the theme", () => {
  it("resolves dark by default, because dark is the designed theme", () => {
    expect(resolveTheme("system")).toBe("dark");
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
  });

  it("follows the system only while the preference is system", () => {
    matchedMedia.add(LIGHT);
    expect(resolveTheme("system")).toBe("light");
    // An explicit choice outranks the system, in both directions.
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("applies the resolved theme to the document and the browser chrome", () => {
    document.head.innerHTML = '<meta name="theme-color" content="">';
    onDevice({ ...account({ habits: ["workout"] }), theme: "light" });
    render(withStore(<Probe />));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#ffffff");
  });

  it("paints the dark chrome for a dark year", () => {
    document.head.innerHTML = '<meta name="theme-color" content="">';
    onDevice({ ...account({ habits: ["workout"] }), theme: "dark" });
    render(withStore(<Probe />));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#1c211b");
  });
});
