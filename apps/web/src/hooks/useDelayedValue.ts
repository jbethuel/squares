"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hold a value back by `delay` ms. The Total rolls 180ms behind the Square that
 * caused it — the Log reads as cause and the number as consequence, rather
 * than as two things twitching at once.
 */
export function useDelayedValue<T>(value: T, delay: number): T {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (Object.is(shown, value)) return;
    const id = window.setTimeout(() => setShown(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay, shown]);

  return shown;
}

export function usePrevious<T>(value: T): T | undefined {
  const previous = useRef<T | undefined>(undefined);
  useEffect(() => {
    previous.current = value;
  }, [value]);
  return previous.current;
}
