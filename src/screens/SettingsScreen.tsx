"use client";

import { useRef, useState } from "react";
import { handOff } from "@/domain/handoff";
import { sealDays, setTheme } from "@/domain/mutations";
import { archivedHabits } from "@/domain/selectors";
import { exportFilename, parseAppData, serialise } from "@/domain/storage";
import { useStore } from "@/domain/store";
import type { AppData, ThemePreference } from "@/domain/types";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const THEMES: ThemePreference[] = ["system", "light", "dark"];

interface SettingsScreenProps {
  onShare: () => void;
  onOpenHabit: (habitId: string) => void;
}

export function SettingsScreen({ onShare, onOpenHabit }: SettingsScreenProps) {
  const { data, today, update, replace } = useStore();
  const { canInstall, installed, install } = useInstallPrompt();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppData | null>(null);
  const [status, setStatus] = useState<string | null>(null);

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
      <h1 className="title" style={{ margin: "0 0 24px" }}>
        settings
      </h1>

      {/*
        Nothing per-Habit lives here any more. A Habit's Chain and its Share Card
        name are set on that Habit's own Screen, which is the only place that
        knows anything about one Habit — two places to change one flag is how
        they drift.
      */}
      <p className="label" style={{ margin: "0 0 9px" }}>
        share card
      </p>
      {/* The line the opt-ins used to carry, now that they are not next to the
          card to say it themselves. */}
      <p className="note" style={{ margin: "0 0 10px" }}>
        anonymous unless you name a habit on its own screen.
      </p>
      <div className="stack" style={{ gap: 7, marginBottom: 26 }}>
        <button type="button" className="btn-list" onClick={onShare}>
          make a share card ›
        </button>
      </div>

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
            {Object.keys(pending.days).length} days? this cannot be undone.
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
          <h2 className="title-sub" style={{ margin: "0 0 6px" }}>
            install to home screen
          </h2>
          <p className="note" style={{ margin: "0 0 13px" }}>
            a tab you have to find is a habit you&apos;ll drop. put it next to the thumb.
          </p>
          {canInstall ? (
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "12px 16px" }}
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
          <span className="toggle-label">theme</span>
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
      </div>

      {/*
        Archived Habits are the one per-Habit thing still listed here, and it is
        not a setting — it is the only route back to a Screen Home no longer
        shows. Without it, Archiving would be a switch that cannot be moved back.
      */}
      <p className="label" style={{ margin: "26px 0 9px" }}>
        archived
      </p>
      <div className="stack" style={{ gap: 7 }}>
        {archived.map((habit) => (
          <button
            key={habit.id}
            type="button"
            className="btn-list"
            onClick={() => onOpenHabit(habit.id)}
          >
            {habit.name} ›
          </button>
        ))}
        {archived.length === 0 ? <p className="note-faint">none.</p> : null}
      </div>

      <p className="note-faint" style={{ marginTop: 22 }}>
        no account. no sync. no analytics. clearing site data clears your progress. do frequent
        backups using export .json.
      </p>
    </>
  );
}
