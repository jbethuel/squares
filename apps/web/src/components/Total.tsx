"use client";

import { useDelayedValue, usePrevious } from "@/hooks/useDelayedValue";

/** The Total rolls in behind the Square that caused it. */
const ROLL_DELAY_MS = 180;

/**
 * The number of Ticks across all Habits in the last year. It only ever rises,
 * and nothing can break it — which is the whole reason it, and not a streak,
 * is the hero number on Home.
 */
export function Total({ value }: { value: number }) {
  const shown = useDelayedValue(value, ROLL_DELAY_MS);
  const previous = usePrevious(shown);
  const digits = String(shown).split("");
  const previousDigits = previous === undefined ? null : String(previous).split("");

  return (
    <div className="total">
      {digits.map((digit, index) => {
        const fromRight = digits.length - 1 - index;
        const before = previousDigits?.[previousDigits.length - 1 - fromRight];
        const changed = before !== undefined && before !== digit;
        return (
          <span key={`${fromRight}-${digit}`} className={changed ? "digit" : undefined}>
            {digit}
          </span>
        );
      })}
    </div>
  );
}
