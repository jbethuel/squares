"use client";

import { useRef, useState } from "react";
import { ToggleRow } from "@/components/Toggle";
import { handOff } from "@/domain/handoff";
import { sealDays, setChained, setSharedName, setTheme } from "@/domain/mutations";
import { archivedHabits, chainOf, liveHabits } from "@/domain/selectors";
import { exportFilename, parseAppData, serialise } from "@/domain/storage";
import { useStore } from "@/domain/store";
import type { AppData, ThemePreference } from "@/domain/types";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const THEMES: ThemePreference[] = ["system", "light", "dark"];

export function SettingsScreen({ onBack, onShare }: { onBack: () => void; onShare: () => void }) {
  const { data, today, update, replace } = useStore();
  const { canInstall, installed, install } = useInstallPrompt();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppData | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const habits = liveHabits(data, today);
  const archived = archivedHabits(data, today);

  const exportJson = async () => {
    const file = new File([serialise(data)], exportFilename(today), {
      type: "application/json",
    });
    // Only the device knows whether that was a download or a share sheet, and
    // only it knows whether the user went through with it. "exported" is the
    // strongest honest claim: the sheet completed. Which target took the file
    // is not something the platform reports.
    setStatus((await handOff(file)) ? "exported" : null);
  };

  const readFile = async (file: File) => {
    setStatus(null);
    try {
      const parsed = parseAppData(JSON.parse(await file.text()));
      if (!parsed) {
        setStatus("that file is not a squares export");
        return;
      }
      // An import replaces the year on this device, and there is no undo, so a
      // year that already has something in it has to be confirmed first.
      if (data.habits.length === 0) {
        replace(sealDays(parsed, today));
        setStatus("imported");
        return;
      }
      setPending(parsed);
    } catch {
      setStatus("could not read that file");
    }
  };

  return (
    <>
      <button type="button" className="btn-quiet" onClick={onBack} style={{ marginBottom: 22 }}>
        ‹ back
      </button>
      <h1 className="title" style={{ margin: "0 0 24px" }}>
        settings
      </h1>

      <p className="label" style={{ margin: "0 0 9px" }}>
        chains · per habit
      </p>
      <div className="stack" style={{ gap: 7, marginBottom: 10 }}>
        {habits.map((habit) => (
          <ToggleRow
            key={habit.id}
            label={habit.name}
            hint={habit.chained ? `chain ${chainOf(data, habit.id, today)}` : "counts only"}
            on={habit.chained}
            onToggle={() => update((current) => setChained(current, habit.id, !habit.chained))}
          />
        ))}
        {habits.length === 0 ? <p className="note-faint">no habits yet.</p> : null}
      </div>
      <p className="note-faint" style={{ marginBottom: 26 }}>
        off means the habit only accumulates: no chain number, no bridge bars in its row, nothing
        that can go back to zero. on means strict — one missed day ends it.
      </p>

      <p className="label" style={{ margin: "0 0 9px" }}>
        share card · names are off by default
      </p>
      <div className="stack" style={{ gap: 7, marginBottom: 10 }}>
        {habits.map((habit) => (
          <ToggleRow
            key={habit.id}
            label={habit.name}
            on={habit.sharedName}
            onToggle={() => update((current) => setSharedName(current, habit.id, !habit.sharedName))}
          />
        ))}
        {habits.length === 0 ? <p className="note-faint">no habits yet.</p> : null}
      </div>
      {/* The card sits directly under the opt-ins that govern it, so what is
          on it and what may be named are never on separate screens. */}
      <button type="button" className="btn-list" onClick={onShare} style={{ marginBottom: 26 }}>
        make a share card ›
      </button>

      <p className="label" style={{ margin: "0 0 9px" }}>
        data · lives on this device only
      </p>
      <div className="stack" style={{ gap: 7, marginBottom: 8 }}>
        <button type="button" className="btn-list" onClick={() => void exportJson()}>
          export .json
        </button>
        <button type="button" className="btn-list" onClick={() => fileInput.current?.click()}>
          import .json
        </button>
        {/* No `accept` filter on purpose. A file that has been round-tripped
            through a share sheet, a messaging app or a cloud folder can come
            back renamed or untyped, and iOS greys those out with no
            explanation. parseAppData is the real gate, and it says why it
            refused. */}
        <input
          ref={fileInput}
          type="file"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void readFile(file);
          }}
        />
      </div>
      {pending ? (
        <div className="card card-accent" style={{ marginBottom: 8 }}>
          <p className="note" style={{ margin: "0 0 12px" }}>
            replace this device&apos;s year with {pending.habits.length} habits and{" "}
            {Object.keys(pending.days).length} days? the year on this device is not recoverable
            afterwards.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1, padding: 12 }}
              onClick={() => {
                replace(sealDays(pending, today));
                setPending(null);
                setStatus("imported");
              }}
            >
              replace
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1, padding: 12 }}
              onClick={() => setPending(null)}
            >
              keep mine
            </button>
          </div>
        </div>
      ) : null}
      {status ? (
        <p className="note-faint" role="status" style={{ marginBottom: 26 }}>
          {status}
        </p>
      ) : (
        <div style={{ height: 18 }} />
      )}

      {!installed ? (
        <div className="card card-accent">
          <h2 className="title" style={{ fontSize: 12, margin: "0 0 6px" }}>
            install to home screen
          </h2>
          <p className="note" style={{ margin: "0 0 13px" }}>
            a tab you have to find is a habit you&apos;ll drop. put it next to the thumb.
          </p>
          {canInstall ? (
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "12px 16px", fontSize: 12 }}
              onClick={() => void install()}
            >
              install
            </button>
          ) : (
            <p className="note-faint" style={{ margin: 0 }}>
              use your browser&apos;s share or menu button, then &quot;add to home screen&quot;.
            </p>
          )}
        </div>
      ) : null}

      <div className="stack" style={{ gap: 7, marginTop: 26 }}>
        <div className="toggle-row" style={{ cursor: "default" }}>
          <span style={{ fontSize: 12.5 }}>theme</span>
          <span style={{ display: "flex", gap: 6 }}>
            {THEMES.map((theme) => (
              <button
                key={theme}
                type="button"
                className="btn-chip"
                aria-pressed={data.theme === theme}
                onClick={() => update((current) => setTheme(current, theme))}
              >
                {theme}
              </button>
            ))}
          </span>
        </div>
        <div className="toggle-row" style={{ cursor: "default" }}>
          <span style={{ fontSize: 12.5 }}>archived</span>
          <span style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
            {archived.length > 0 ? archived.map((h) => h.name).join(" · ") : "none"}
          </span>
        </div>
      </div>

      <p className="note-faint" style={{ marginTop: 22 }}>
        no account. no sync. no analytics. clearing site data clears the year, so export it now and
        then.
      </p>
    </>
  );
}
