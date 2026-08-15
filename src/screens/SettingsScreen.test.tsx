import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "./SettingsScreen";
import { serialise } from "@/domain/storage";
import { account, idOf, onDevice, renderWithStore, storedData, TODAY } from "@/test/harness";
import { downloads, shared, stubSharing } from "@/test/dom";
import type { AppData } from "@/domain/types";

function open(data: AppData = account({ habits: ["workout"] })) {
  onDevice(data);
  const props = { onShare: vi.fn() };
  renderWithStore(<SettingsScreen {...props} />);
  return props;
}

/** The switches under a given section label, in order. */
function section(label: string): HTMLElement[] {
  const heading = screen.getByText(label);
  const list = heading.nextElementSibling as HTMLElement;
  return within(list).queryAllByRole("switch");
}

const chains = () => section("chains · per habit");
const names = () => section("share card · names off by default");

const jsonFile = (contents: string) =>
  new File([contents], "squares.json", { type: "application/json" });

async function importFile(user: ReturnType<typeof userEvent.setup>, file: File) {
  await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, file);
}

describe("chain opt-ins", () => {
  it("lists every live Habit, all off", () => {
    open(account({ habits: ["workout", "read"] }));
    expect(chains()).toHaveLength(2);
    expect(chains().every((s) => s.getAttribute("aria-checked") === "false")).toBe(true);
    expect(screen.getAllByText("counts only")).toHaveLength(2);
  });

  it("turns one on without touching the other", async () => {
    const user = userEvent.setup();
    const data = account({ habits: ["workout", "read"], ticks: { workout: [0, 1, 2] } });
    open(data);

    await user.click(chains()[0]!);

    const stored = storedData();
    expect(stored.habits.find((h) => h.name === "workout")?.chained).toBe(true);
    expect(stored.habits.find((h) => h.name === "read")?.chained).toBe(false);
    expect(screen.getByText("chain 3")).toBeInTheDocument();
  });

  // What off means is said on a Habit's own Screen, not here. These rows carry
  // the state in a hint and nothing else — an explanation is read once and then
  // costs the space forever.
  it("says which state each Habit is in without explaining the feature", () => {
    open(account({ habits: ["workout"] }));
    expect(screen.getByText("counts only")).toBeInTheDocument();
    expect(screen.queryByText(/no chain number/)).not.toBeInTheDocument();
    expect(screen.queryByText(/one missed day ends it/)).not.toBeInTheDocument();
  });

  it("says so plainly when there are no Habits to opt in", () => {
    open(account({ habits: [] }));
    expect(screen.getAllByText("no habits yet.")).toHaveLength(2);
  });
});

describe("share card name opt-ins", () => {
  it("are off for every Habit until each is turned on by hand", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["took my meds", "no drinking"] }));
    expect(names().every((s) => s.getAttribute("aria-checked") === "false")).toBe(true);

    await user.click(names()[0]!);
    const stored = storedData();
    expect(stored.habits.find((h) => h.name === "took my meds")?.sharedName).toBe(true);
    expect(stored.habits.find((h) => h.name === "no drinking")?.sharedName).toBe(false);
  });

  it("are withdrawn by the same switch", async () => {
    const user = userEvent.setup();
    open(account({ habits: ["workout"] }));
    await user.click(names()[0]!);
    await user.click(names()[0]!);
    expect(storedData().habits[0]?.sharedName).toBe(false);
  });

  it("are not offered for an archived Habit, whose opt-in cannot be withdrawn", () => {
    const data = account({ habits: ["workout", "no drinking"] });
    open({
      ...data,
      habits: data.habits.map((h) => (h.name === "no drinking" ? { ...h, archivedOn: TODAY } : h)),
    });
    expect(names()).toHaveLength(1);
    expect(screen.getByText("no drinking")).toBeInTheDocument(); // in the archived list only
  });

  it("sit directly above the card they govern", async () => {
    const user = userEvent.setup();
    const props = open();
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

describe("the archived list", () => {
  it("says none until something is archived", () => {
    open(account({ habits: ["workout"] }));
    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("names what has been retired, because nothing is ever deleted", () => {
    const data = account({ habits: ["workout", "read"] });
    open({
      ...data,
      habits: data.habits.map((h) => (h.name === "read" ? { ...h, archivedOn: TODAY } : h)),
    });
    expect(screen.getByText("read")).toBeInTheDocument();
    expect(chains()).toHaveLength(1);
  });
});

describe("what settings promises", () => {
  it("states that the year lives on this device only", () => {
    open();
    expect(screen.getByText("data · lives on this device only")).toBeInTheDocument();
    expect(screen.getByText(/no account. no sync. no analytics./)).toBeInTheDocument();
  });

});
