"use client";

import type { ReactNode } from "react";

export function Toggle({ on }: { on: boolean }) {
  return (
    <span className="toggle" data-on={on} aria-hidden="true">
      <span className="toggle-knob" />
    </span>
  );
}

interface ToggleRowProps {
  label: string;
  hint?: ReactNode;
  on: boolean;
  onToggle: () => void;
}

export function ToggleRow({ label, hint, on, onToggle }: ToggleRowProps) {
  return (
    <button type="button" className="toggle-row" role="switch" aria-checked={on} onClick={onToggle}>
      <span className="stack" style={{ gap: 3, minWidth: 0 }}>
        <span className="toggle-label">{label}</span>
        {hint ? <span className="toggle-hint">{hint}</span> : null}
      </span>
      <Toggle on={on} />
    </button>
  );
}
