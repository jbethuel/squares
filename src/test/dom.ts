import { vi } from "vitest";

/**
 * The parts of a browser jsdom does not bring, stubbed once so that every UI
 * test starts from the same known device: a 350px phone, dark system theme,
 * a canvas that records rather than paints, and a link that reports what it was
 * asked to download instead of navigating.
 */

/** The design's phone width: 53 columns of ~5.4px fit 350px. */
export const PHONE_WIDTH = 350;

let elementWidth = PHONE_WIDTH;

/** The width every element reports, which is what the Heatmap sizes itself from. */
export function setElementWidth(px: number): void {
  elementWidth = px;
}

/** Media queries that currently match. Empty means dark, the designed theme. */
export const matchedMedia = new Set<string>();

export interface CanvasOp {
  op: string;
  args: unknown[];
}

/** Every call and property set made on a 2D context this test. */
export const canvasOps: CanvasOp[] = [];

/**
 * Every download the app asked the browser for. `connected` records whether
 * the anchor was in the document at the moment it was clicked, which some
 * engines require and which is therefore worth failing a test over.
 */
export const downloads: { href: string; filename: string; connected: boolean }[] = [];

/** Every file the app handed to the OS share sheet. */
export const shared: File[] = [];

/**
 * Give the device a share sheet, as a phone has and jsdom does not. `outcome`
 * is what the user does with it: going through with it resolves, backing out
 * rejects with AbortError exactly as a real sheet does.
 */
export function stubSharing(outcome: "accepted" | "dismissed" = "accepted"): void {
  Object.defineProperty(navigator, "canShare", {
    value: (data: { files?: File[] }) => Array.isArray(data.files) && data.files.length > 0,
    configurable: true,
  });
  Object.defineProperty(navigator, "share", {
    value: (data: { files?: File[] }) => {
      shared.push(...(data.files ?? []));
      return outcome === "accepted"
        ? Promise.resolve()
        : Promise.reject(new DOMException("share canceled", "AbortError"));
    },
    configurable: true,
  });
}

function fakeContext(): CanvasRenderingContext2D {
  const state: Record<string, unknown> = {};
  return new Proxy(state, {
    get(target, property) {
      if (typeof property !== "string") return undefined;
      if (property in target) return target[property];
      return (...args: unknown[]) => {
        canvasOps.push({ op: property, args });
      };
    },
    set(target, property, value) {
      if (typeof property === "string") {
        target[property] = value;
        canvasOps.push({ op: `set:${property}`, args: [value] });
      }
      return true;
    },
    // `"letterSpacing" in ctx` must be true, as it is in a real browser.
    has() {
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

export function installDomStubs(): void {
  HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return { width: elementWidth, height: 0, top: 0, left: 0, right: elementWidth, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };

  // The Heatmap re-measures on resize; nothing resizes in a test, so observing
  // is enough. Width arrives from getBoundingClientRect on mount.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );

  window.matchMedia = ((query: string) => ({
    matches: matchedMedia.has(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;

  Object.defineProperty(navigator, "vibrate", {
    value: vi.fn(() => true),
    configurable: true,
    writable: true,
  });

  Object.defineProperty(document, "fonts", {
    value: { load: vi.fn().mockResolvedValue([]) },
    configurable: true,
    writable: true,
  });

  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeContext()) as unknown as HTMLCanvasElement["getContext"];
  HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback) {
    callback(new Blob(["png"], { type: "image/png" }));
  };

  URL.createObjectURL = vi.fn(() => "blob:squares");
  URL.revokeObjectURL = vi.fn();

  // Every screen change scrolls to the top; jsdom has no viewport to scroll.
  window.scrollTo = vi.fn();

  // A real anchor click would navigate; record the intent instead.
  HTMLAnchorElement.prototype.click = function click() {
    downloads.push({ href: this.href, filename: this.download, connected: this.isConnected });
  };
}

export function resetDomStubs(): void {
  elementWidth = PHONE_WIDTH;
  matchedMedia.clear();
  canvasOps.length = 0;
  downloads.length = 0;
  shared.length = 0;
  // The default device has no share sheet, so a test that wants one has to say
  // so — otherwise stubSharing would leak into every test that follows it.
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "canShare");
  localStorage.clear();
}

/** The arguments of every `fillText` call, in draw order. */
export function drawnText(): string[] {
  return canvasOps.filter((o) => o.op === "fillText").map((o) => String(o.args[0]));
}
