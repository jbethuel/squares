"use client";

import { useMemo, useState } from "react";
import { LensPicker } from "@/components/LensPicker";
import { DEFAULT_LENS, lensNoun, type Lens } from "@squares/domain/lens";
import { habitCardModel } from "@squares/domain/shareCard";
import { useCanvasCard } from "@/platform/useCanvasCard";
import { useStore } from "@squares/domain/store";

/**
 * The Habit Card (ADR 0011). Line for line this is the Overview Card's
 * Screen with one thing swapped: `habitCardModel` instead of `shareCardModel`.
 */
export function HabitShareScreen({ habitId }: { habitId: string }) {
  const { data, today } = useStore();
  const habit = data.habits.find((h) => h.id === habitId);

  const [lens, setLens] = useState<Lens>(DEFAULT_LENS);
  // ADR 0011: null for a Habit that is Hidden or gone — the same state that
  // Habit's own Screen already treats as nothing to show.
  const model = useMemo(
    () => habitCardModel(data, habitId, today, lens),
    [data, habitId, today, lens],
  );
  const { canvasRef, size, status, save } = useCanvasCard(model);

  if (!model) return null;

  return (
    <>
      <h1 className="title" style={{ margin: "0 0 20px" }}>
        share {habit?.name}
      </h1>

      <div style={{ marginBottom: 12 }}>
        <LensPicker value={lens} onChange={setLens} label="how much of the record to put on the card" />
      </div>

      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        className="share-preview"
        aria-label={`Share card: ${model.tally} logs across ${lensNoun(model.lens)}, naming ${model.names.join(", ")}${
          model.streak !== null ? `, a ${model.streak}-day streak` : ""
        }`}
        role="img"
      />

      {/* Always exactly one name, and no anonymous case: ADR 0011 gives a
          Hidden Habit no Habit Card at all, and every other Habit gets one. */}
      <div className="card" style={{ marginTop: 16 }}>
        <p className="note" style={{ margin: 0 }}>
          this card names {model.names.join(", ")}.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => void save()}>
          save .png
        </button>
      </div>

      {status ? (
        <p className="note-faint" role="status" style={{ marginTop: 12 }}>
          {status}
        </p>
      ) : null}
    </>
  );
}
