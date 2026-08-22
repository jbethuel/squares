"use client";

import { useRef, useState } from "react";
import { handOff } from "@/platform/handoff";
import { setTheme } from "@squares/domain/mutations";
import { hiddenHabits } from "@squares/domain/selectors";
import { exportFilename, parseAppData, serialise } from "@squares/domain/storage";
import { useStore } from "@squares/domain/store";
import type { AppData, ThemePreference } from "@squares/domain/types";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const THEMES: ThemePreference[] = ["system", "light", "dark"];

/**
 * The rule between two blocks of settings.
 *
 * Every block is a label and the controls under it. Without a rule the label
 * does the whole job of saying where one block ends, and a label reads as a
 * caption on the block *above* it as readily as a heading for the one below —
 * so the export buttons look like they belong to the share card.
 */
function Rule() {
  return <hr className="divider" style={{ margin: "22px 0" }} />;
}

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

  const hidden = hiddenHabits(data, today);

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
        replace(parsed);
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
        Nothing per-Habit lives here any more. A Habit's Streak and its Share
        Card name are set on that Habit's own Screen, which is the only place
        that knows anything about one Habit — two places to change one flag is
        how they drift.
      */}
      {/* Real headings, not styled paragraphs: settings is a Screen of blocks,
          and a heading is how you jump between them without reading each one. */}
      <h2 className="title-sub" style={{ margin: "0 0 9px" }}>
        share card
      </h2>
      {/* The line the opt-ins used to carry, now that they are not next to the
          card to say it themselves. */}
      <p className="note" style={{ margin: "0 0 10px" }}>
        anonymous unless you name a habit on its own screen.
      </p>
      <div className="stack" style={{ gap: 7 }}>
        <button type="button" className="btn-list" onClick={onShare}>
          make a share card ›
        </button>
      </div>

      <Rule />

      <h2 className="title-sub" style={{ margin: "0 0 9px" }}>
        data · lives on this device only
      </h2>
      <div className="stack" style={{ gap: 7 }}>
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
        <div className="card card-accent" style={{ marginTop: 10 }}>
          <p className="note" style={{ margin: "0 0 12px" }}>
            replace this device&apos;s year with {pending.habits.length} habits and{" "}
            {Object.keys(pending.days).length} logged days? this cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1, padding: 12 }}
              onClick={() => {
                replace(pending);
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
      {/*
        No empty stand-in under the buttons. A slot held open for a status that
        is absent almost always is a permanent gap paid for a jump that happens
        on the user's own tap — and with a rule beneath it, the gap reads as
        something missing rather than as breathing room.
      */}
      {status ? (
        <p className="note-faint" role="status" style={{ margin: "10px 0 0" }}>
          {status}
        </p>
      ) : null}

      {/* The install block carries its own rule, because it is not always here:
          a rule left outside the condition would double up once it is gone. */}
      {!installed ? (
        <>
          <Rule />
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
        </>
      ) : null}

      <Rule />

      {/* No label over this one: the row says "theme" itself, and a heading
          above it saying the same word twice is worse than none. */}
      <div className="stack" style={{ gap: 7 }}>
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

      <Rule />

      {/*
        Hidden Habits are the one per-Habit thing still listed here, and it is
        not a setting — it is the only route back to a Screen Home no longer
        shows. Without it, Hide would be a switch that cannot be moved back.
      */}
      <h2 className="title-sub" style={{ margin: "0 0 9px" }}>
        hidden
      </h2>
      <div className="stack" style={{ gap: 7 }}>
        {hidden.map((habit) => (
          <button
            key={habit.id}
            type="button"
            className="btn-list"
            onClick={() => onOpenHabit(habit.id)}
          >
            {habit.name} ›
          </button>
        ))}
        {hidden.length === 0 ? <p className="note-faint">none.</p> : null}
      </div>

      <Rule />

      {/* Below the last rule and under no label: this is what the Screen
          promises, not another thing on it to set. */}
      <p className="note-faint" style={{ margin: 0 }}>
        no account. no sync. no analytics. clearing site data clears your progress. do frequent
        backups using export .json.
      </p>
    </>
  );
}
