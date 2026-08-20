import { describe, expect, it } from "vitest";
import { handOff } from "./handoff";
import { downloads, shared, stubSharing } from "@/test/dom";

const file = () => new File(["{}"], "squares-2026-08-03.json", { type: "application/json" });

describe("a device with no share sheet", () => {
  it("downloads the file under its own name", async () => {
    expect(await handOff(file())).toBe(true);

    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.filename).toBe("squares-2026-08-03.json");
  });

  it("clicks an anchor that is in the document, which some engines require", async () => {
    await handOff(file());
    expect(downloads[0]?.connected).toBe(true);
  });

  it("does not revoke the blob before the download has read it", async () => {
    await handOff(file());
    // The click only starts the read, so revoking on the next line is how a
    // download silently fails. setTimeout is deliberately not faked in this
    // suite, so what is pinned here is that the revoke is not synchronous.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it("leaves nothing behind in the document", async () => {
    await handOff(file());
    expect(document.querySelector("a[download]")).toBeNull();
  });
});

describe("a device with a share sheet", () => {
  it("hands the file to the sheet rather than downloading it", async () => {
    stubSharing();

    expect(await handOff(file())).toBe(true);

    expect(shared.map((f) => f.name)).toEqual(["squares-2026-08-03.json"]);
    expect(shared[0]?.type).toBe("application/json");
    // iOS never performs the download, so offering it as well would be a
    // second button that strands the user on an "Open in…" screen.
    expect(downloads).toHaveLength(0);
  });

  it("reports failure when the user backs out, and does not download instead", async () => {
    stubSharing("dismissed");

    expect(await handOff(file())).toBe(false);

    // Nothing left the device. Falling back to a download here would put the
    // file somewhere the user had just declined to put it.
    expect(downloads).toHaveLength(0);
  });
});
