import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EditScreen } from "./EditScreen";
import { addDays } from "@/domain/date";
import { account, idOf, onDevice, renderWithStore, storedData, TODAY } from "@/test/harness";
import type { AppData } from "@/domain/types";

function open(data: AppData, habitId: string | null) {
  onDevice(data);
  const props = { onDone: vi.fn(), onCancel: vi.fn() };
  renderWithStore(<EditScreen habitId={habitId} {...props} />);
  return props;
}

const nameField = () => screen.getByLabelText("name");
const saveButton = () => screen.getByRole("button", { name: "save" });

describe("naming a new Habit", () => {
  it("cannot be saved empty", async () => {
    const user = userEvent.setup();
    open(account({ habits: [] }), null);

    expect(screen.getByRole("heading", { name: "new habit" })).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    await user.type(nameField(), "   ");
    expect(saveButton()).toBeDisabled();
  });

  it("saves the Habit and returns to Home", async () => {
    const user = userEvent.setup();
    const props = open(account({ habits: [] }), null);

    await user.type(nameField(), "workout");
    await user.click(saveButton());

    expect(storedData().habits.map((h) => h.name)).toEqual(["workout"]);
    expect(props.onDone).toHaveBeenCalled();
  });

  it("saves on enter, without reaching for the button", async () => {
    const user = userEvent.setup();
    open(account({ habits: [] }), null);
    await user.type(nameField(), "read{Enter}");
    expect(storedData().habits.map((h) => h.name)).toEqual(["read"]);
  });

  it("trims what it is given", async () => {
    const user = userEvent.setup();
    open(account({ habits: [] }), null);
    await user.type(nameField(), "  workout  {Enter}");
    expect(storedData().habits[0]?.name).toBe("workout");
  });

  it("counts the new Habit toward today, and today only", async () => {
    const user = userEvent.setup();
    open(account({ age: 10, habits: [] }), null);
    await user.type(nameField(), "workout{Enter}");

    const stored = storedData();
    expect(stored.days[TODAY]?.active).toHaveLength(1);
    expect(Object.values(stored.days).filter((d) => d.active.length > 0)).toHaveLength(1);
  });

  it("says up front that the name is not on the Share Card by default", () => {
    open(account({ habits: [] }), null);
    expect(
      screen.getByText("shown on the share card only if you opt this habit in. off by default."),
    ).toBeInTheDocument();
    expect(storedData().habits.every((h) => h.sharedName === false)).toBe(true);
  });

  it("leaves without saving on cancel", async () => {
    const user = userEvent.setup();
    const props = open(account({ habits: [] }), null);
    await user.type(nameField(), "workout");
    await user.click(screen.getByRole("button", { name: "‹ cancel" }));

    expect(props.onCancel).toHaveBeenCalled();
    expect(storedData().habits).toEqual([]);
  });

  it("offers no Archive for a Habit that does not exist yet", () => {
    open(account({ habits: [] }), null);
    expect(screen.queryByRole("button", { name: /archive/ })).not.toBeInTheDocument();
  });
});

describe("renaming a Habit", () => {
  it("opens with the current name", () => {
    const data = account({ habits: ["workout"] });
    open(data, idOf(data, "workout"));
    expect(nameField()).toHaveValue("workout");
    expect(screen.getByRole("heading", { name: "workout" })).toBeInTheDocument();
  });

  it("keeps the id and the year, so the Ticks follow the new name", async () => {
    const user = userEvent.setup();
    const data = account({ habits: ["workout"], ticks: { workout: [0, 1, 2] } });
    const id = idOf(data, "workout");
    open(data, id);

    await user.clear(nameField());
    await user.type(nameField(), "lift{Enter}");

    const stored = storedData();
    expect(stored.habits.find((h) => h.id === id)?.name).toBe("lift");
    expect(stored.days[TODAY]?.ticked).toEqual([id]);
  });

  it("cannot be emptied", async () => {
    const user = userEvent.setup();
    const data = account({ habits: ["workout"] });
    open(data, idOf(data, "workout"));

    await user.clear(nameField());
    expect(saveButton()).toBeDisabled();
    expect(storedData().habits[0]?.name).toBe("workout");
  });
});

describe("Archive asks once, on the button itself", () => {
  it("does not archive on the first tap", async () => {
    const user = userEvent.setup();
    const data = account({ habits: ["workout"] });
    const props = open(data, idOf(data, "workout"));

    await user.click(screen.getByRole("button", { name: "archive this habit" }));
    expect(screen.getByRole("button", { name: "tap again to archive" })).toBeInTheDocument();
    expect(storedData().habits[0]?.archivedOn).toBeNull();
    expect(props.onDone).not.toHaveBeenCalled();
  });

  it("archives on the second, and leaves the year alone", async () => {
    const user = userEvent.setup();
    const data = account({ habits: ["workout"], ticks: { workout: [0, 3] } });
    const props = open(data, idOf(data, "workout"));

    await user.click(screen.getByRole("button", { name: "archive this habit" }));
    await user.click(screen.getByRole("button", { name: "tap again to archive" }));

    const stored = storedData();
    const id = idOf(data, "workout");
    expect(stored.habits[0]?.archivedOn).toBe(TODAY);
    // There is no delete: the Habit and its past Ticks are both still there.
    expect(stored.habits).toHaveLength(1);
    expect(stored.days[addDays(TODAY, -3)]?.ticked).toEqual([id]);
    // Today has no Active Habits left, so it is no longer a Day Record at all.
    expect(stored.days[TODAY]).toBeUndefined();
    expect(props.onDone).toHaveBeenCalled();
  });

  it("forgets it asked, so a stray tap minutes later cannot land on a yes", async () => {
    const user = userEvent.setup();
    const data = account({ habits: ["workout"] });
    open(data, idOf(data, "workout"));

    await user.click(screen.getByRole("button", { name: "archive this habit" }));
    await vi.waitFor(
      () => expect(screen.getByRole("button", { name: "archive this habit" })).toBeInTheDocument(),
      { timeout: 6000 },
    );
    expect(storedData().habits[0]?.archivedOn).toBeNull();
  }, 10_000);

  it("says in words that the past is untouched and there is no delete", () => {
    const data = account({ habits: ["workout"] });
    open(data, idOf(data, "workout"));
    expect(
      screen.getByText(/every past tick stays in the year, and in the total. there is no delete./),
    ).toBeInTheDocument();
  });
});
