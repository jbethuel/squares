import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "./SettingsScreen";
import { serialise } from "@squares/domain/storage";
import { account, idOf, onDevice, renderWithStore, storedData, TODAY } from "@/test/harness";
import { downloads, shared, stubSharing } from "@/test/dom";
import type { AppData } from "@squares/domain/types";

function open(data: AppData = account({ habits: ["workout"] })) {
  onDevice(data);
  const props = { onShare: vi.fn(), onOpenHabit: vi.fn() };
  renderWithStore(<SettingsScreen {...props} />);
  return props;
}

const jsonFile = (contents: string) =>
  new File([contents], "squares.json", { type: "application/json" });

async function importFile(user: ReturnType<typeof userEvent.setup>, file: File) {
  await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, file);
}

describe("settings holds nothing about one Habit", () => {
  // A Habit's Chain and its Share Card name are set on that Habit's own Screen.
  // Two places to change one flag is how they drift.
  it("offers no per-Habit switches at all", () => {
    open(account({ habits: ["workout", "read"] }));
    expect(screen.queryAllByRole("switch")).toHaveLength(0);
  });

  it("leads to the card, and says what the card promises", async () => {
    const user = userEvent.setup();
    const props = open();
    expect(
      screen.getByText("anonymous unless you name a habit on its own screen."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "make a share card ›" }));
    expect(props.onShare).toHaveBeenCalled();
  });
});

describe("export", () => {
  it("saves the year as a file named for the Day", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"], ticks: { workout: [0] } }));

    await user.click(screen.getByRole("button", { name: "export .json" }));

    await vi.waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0]?.filename).toBe("squares-2026-08-03.json");
    expect(screen.getByRole("status")).toHaveTextContent("exported");
  });

  it("goes through the OS sheet where the device has one", async () => {
    stubSharing();
    const user = userEvent.setup();
    open(account({ habits: ["workout"], ticks: { workout: [0] } }));

    await user.click(screen.getByRole("button", { name: "export .json" }));

    await vi.waitFor(() => expect(shared).toHaveLength(1));
    expect(shared[0]?.name).toBe("squares-2026-08-03.json");
    expect(shared[0]?.type).toBe("application/json");
    // On iOS the download is the branch that strands the user on an "Open in…"
    // screen, so it must not be attempted alongside the sheet.
    expect(downloads).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent("exported");
  });

  it("does not say exported when the sheet is dismissed", async () => {
    stubSharing("dismissed");
    const user = userEvent.setup();
    open(account({ habits: ["workout"], ticks: { workout: [0] } }));

    await user.click(screen.getByRole("button", { name: "export .json" }));

    // Nothing left the device. This is the only copy that survives storage
    // being cleared, so claiming it was taken is the one lie that costs a year.
    await vi.waitFor(() => expect(shared).toHaveLength(1));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(downloads).toHaveLength(0);
  });

  it("carries the whole year, not a summary of it", async () => {
    const user = userEvent.setup();
    stubSharing();
    open(account({ habits: ["workout", "read"], ticks: { workout: [0, 1] } }));

    await user.click(screen.getByRole("button", { name: "export .json" }));

    await vi.waitFor(() => expect(shared).toHaveLength(1));
    const parsed = JSON.parse(await shared[0]!.text());
    expect(parsed.habits.map((h: { name: string }) => h.name)).toEqual(["workout", "read"]);
  });
});

describe("import replaces the year on this device", () => {
  const incoming = account({ age: 40, habits: ["read", "meditate"], ticks: { read: [0, 1, 2] } });

  it("goes straight in when there is nothing to lose", async () => {
    const user = userEvent.setup();
    open(account({ habits: [] }));

    await importFile(user, jsonFile(serialise(incoming)));

    expect(storedData().habits.map((h) => h.name)).toEqual(["read", "meditate"]);
    expect(screen.getByRole("status")).toHaveTextContent("imported");
  });

  it("asks first when there is a year already, and says what it would cost", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"], ticks: { workout: [0, 1] } }));

    await importFile(user, jsonFile(serialise(incoming)));

    expect(screen.getByText(/replace this device's year with 2 habits and 40 days\?/)).toBeInTheDocument();
    expect(screen.getByText(/this cannot be undone/)).toBeInTheDocument();
    // Nothing has happened yet.
    expect(storedData().habits.map((h) => h.name)).toEqual(["workout"]);
  });

  it("keeps this device's year when the answer is no", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"], ticks: { workout: [0, 1] } }));

    await importFile(user, jsonFile(serialise(incoming)));
    await user.click(screen.getByRole("button", { name: "keep mine" }));

    expect(storedData().habits.map((h) => h.name)).toEqual(["workout"]);
    expect(screen.queryByText(/replace this device's year/)).not.toBeInTheDocument();
  });

  it("replaces it when the answer is yes", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"], ticks: { workout: [0, 1] } }));

    await importFile(user, jsonFile(serialise(incoming)));
    await user.click(screen.getByRole("button", { name: "replace" }));

    expect(storedData().habits.map((h) => h.name)).toEqual(["read", "meditate"]);
    expect(screen.getByRole("status")).toHaveTextContent("imported");
  });

  it("takes a file back whatever it has been renamed to on the way", async () => {
    const user = userEvent.setup();
    open(account({ habits: [] }));

    // A file that has been through a share sheet, a messaging app or a cloud
    // folder can come back renamed or untyped. An `accept` filter would grey it
    // out in the picker with no explanation; parseAppData is the real gate.
    expect(document.querySelector('input[type="file"]')).not.toHaveAttribute("accept");

    await importFile(user, new File([serialise(incoming)], "squares.txt", { type: "text/plain" }));

    expect(storedData().habits.map((h) => h.name)).toEqual(["read", "meditate"]);
  });

  it("refuses a file that is not a Squares export, and changes nothing", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }));

    await importFile(user, jsonFile(JSON.stringify({ hello: "world" })));

    expect(screen.getByRole("status")).toHaveTextContent("that file is not a squares export");
    expect(storedData().habits.map((h) => h.name)).toEqual(["workout"]);
  });

  it("refuses a file that is not JSON at all", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }));

    await importFile(user, jsonFile("this is my year, honest"));

    expect(screen.getByRole("status")).toHaveTextContent("could not read that file");
    expect(storedData().habits.map((h) => h.name)).toEqual(["workout"]);
  });

  it("does not carry a name opt-in in from a file that never set one", async () => {
    const user = userEvent.setup();
    open(account({ habits: [] }));

    await importFile(
      user,
      jsonFile(
        JSON.stringify({
          version: 1,
          installedOn: TODAY,
          habits: [{ id: "h1", name: "took my meds", createdOn: TODAY, archivedOn: null }],
          days: {},
          theme: "system",
        }),
      ),
    );

    expect(storedData().habits[0]?.sharedName).toBe(false);
    expect(storedData().habits[0]?.chained).toBe(false);
  });
});

describe("theme", () => {
  it("starts on system and switches on tap", async () => {
    const user = userEvent.setup();
    open();
    expect(screen.getByRole("button", { name: "system" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "light" }));

    expect(storedData().theme).toBe("light");
    expect(screen.getByRole("button", { name: "light" })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

describe("the archived list is the way back", () => {
  it("says none until something is archived", () => {
    open(account({ habits: ["workout"] }));
    expect(screen.getByText("none.")).toBeInTheDocument();
  });

  it("names what has been retired, because nothing is ever deleted", () => {
    open(account({ habits: ["workout", "read"], archived: ["read"] }));
    expect(screen.getByRole("button", { name: "read ›" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "workout ›" })).not.toBeInTheDocument();
  });

  // Without this route Archiving would be a switch that cannot be moved back:
  // Home does not list an Archived Habit, so this is the only door to its
  // Screen — and its Screen is where the switch is.
  it("opens the Habit's own screen, which is where it can come back", async () => {
    const user = userEvent.setup();
    const data = account({ habits: ["workout", "read"], archived: ["read"] });
    const props = open(data);

    await user.click(screen.getByRole("button", { name: "read ›" }));

    expect(props.onOpenHabit).toHaveBeenCalledWith(idOf(data, "read"));
  });
});

describe("what settings promises", () => {
  it("states that the year lives on this device only", () => {
    open();
    expect(screen.getByText("data · lives on this device only")).toBeInTheDocument();
    expect(screen.getByText(/no account. no sync. no analytics./)).toBeInTheDocument();
  });

});
