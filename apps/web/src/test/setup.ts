import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { installDomStubs, resetDomStubs } from "./dom";
import { TODAY } from "./harness";

beforeEach(() => {
  // Only the clock is faked, never setTimeout — the log's spring, the echo and
  // the Total's 180ms roll are real timers and are tested as such.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(`${TODAY}T12:00:00`) });
  resetDomStubs();
  installDomStubs();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
