"use client";

import { useState } from "react";
import { addHabit } from "@squares/domain/mutations";
import { useStore } from "@squares/domain/store";

/**
 * Naming a new Habit, and nothing else.
 *
 * Everything about a Habit that already exists — its name, its Chain, its Share
 * Card opt-in, whether it is Archived — lives on that Habit's own Screen. This
 * Screen has one field because creating a Habit needs one field.
 */
export function NewHabitScreen({ onDone }: { onDone: () => void }) {
  const { today, update } = useStore();
  const [draft, setDraft] = useState("");

  const save = () => {
    const name = draft.trim();
    if (!name) return;
    update((current) => addHabit(current, name, today));
    // Back to Home rather than into the new Habit's Screen: its opt-ins are off
    // by default on purpose, and the reward is the row appearing with its
    // Square one tap away.
    onDone();
  };

  return (
    <>
      <h1 className="title" style={{ margin: "0 0 20px" }}>
        new habit
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
        {/* Nothing here about the Share Card or Chains. Both default to off, and
            both belong to a Habit that exists — this Screen creates one. */}
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 24 }}
          disabled={draft.trim() === ""}
        >
          save
        </button>
      </form>
    </>
  );
}
