"use client";

import { LENSES, type Lens } from "@squares/domain/lens";

interface LensPickerProps {
  value: Lens;
  onChange: (lens: Lens) => void;
  /** Named for assistive tech, since two of these can be on screen in a session. */
  label: string;
}

/**
 * Three words above a Heatmap. Deliberately not a chip row like the theme
 * picker in settings: this sits directly above the grid on Home, which the
 * design gives one piece of chrome, so the current Lens is marked by weight and
 * a quiet surface rather than by the accent colour.
 *
 * `aria-pressed` rather than a radiogroup — each is a button that redraws the
 * grid beneath it, and there is no form here to submit.
 */
export function LensPicker({ value, onChange, label }: LensPickerProps) {
  return (
    <div className="lens" role="group" aria-label={label}>
      {LENSES.map((lens) => (
        <button
          key={lens}
          type="button"
          className="lens-btn"
          aria-pressed={value === lens}
          onClick={() => onChange(lens)}
        >
          {lens}
        </button>
      ))}
    </div>
  );
}
