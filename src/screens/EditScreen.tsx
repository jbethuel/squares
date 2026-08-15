"use client";

import { useEffect, useState } from "react";
import { addHabit, archiveHabit, renameHabit } from "@/domain/mutations";
import { useStore } from "@/domain/store";

const CONFIRM_MS = 4000;

interface EditScreenProps {
  /** null creates a Habit; a string edits one. */
  habitId: string | null;
  onDone: () => void;
}

export function EditScreen({ habitId, onDone }: EditScreenProps) {
  const { data, today, update } = useStore();
  const habit = habitId ? data.habits.find((h) => h.id === habitId) : undefined;
  const [draft, setDraft] = useState(habit?.name ?? "");
  const [confirming, setConfirming] = useState(false);

  // Archive has no undo, so it asks once — as a change of state on the button
  // itself rather than as a dialog.
  useEffect(() => {
    if (!confirming) return;
    const id = window.setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => window.clearTimeout(id);
  }, [confirming]);

  const save = () => {
    const name = draft.trim();
    if (!name) return;
    update((current) =>
      habit ? renameHabit(current, habit.id, name) : addHabit(current, name, today),
    );
    onDone();
  };

  return (
    <>
      <h1 className="title" style={{ margin: "0 0 20px" }}>
        {habit ? habit.name : "new habit"}
      </h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <label className="label" htmlFor="habit-name">
          name
        </label>
        {/*
          The field does not take focus by itself, on purpose. It used to, and
          a new Habit then opened with the keyboard already up — which now
          means over the bar, on the one Screen a first-time user meets. One
          tap on the field is the price of every Screen showing its way out.
        */}
        <input
          id="habit-name"
          className="field"
          value={draft}
          maxLength={40}
          placeholder="something you do daily"
          onChange={(event) => setDraft(event.target.value)}
          style={{ marginTop: 8 }}
        />
        <p className="note-faint" style={{ marginTop: 10 }}>
          shown on the share card only if you opt this habit in. off by default.
        </p>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 24 }}
          disabled={draft.trim() === ""}
        >
          save
        </button>
      </form>

      {habit ? (
        <>
          <hr className="divider" style={{ margin: "28px 0 20px" }} />
          <h2 className="title" style={{ fontSize: 12, margin: "0 0 7px" }}>
            archive
          </h2>
          <p className="note" style={{ marginTop: 0, marginBottom: 14 }}>
            stops counting from today. every past tick stays in the year, and in the total. there is
            no delete.
          </p>
          <button
            type="button"
            className="btn"
            style={{ width: "100%", borderColor: confirming ? "var(--accent)" : undefined }}
            onClick={() => {
              if (!confirming) {
                setConfirming(true);
                return;
              }
              update((current) => archiveHabit(current, habit.id, today));
              onDone();
            }}
          >
            {confirming ? "tap again to archive" : "archive this habit"}
          </button>
        </>
      ) : null}
    </>
  );
}
