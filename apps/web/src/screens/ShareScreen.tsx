"use client";

import { useMemo, useState } from "react";
import { LensPicker } from "@/components/LensPicker";
import { DEFAULT_LENS, lensNoun, type Lens } from "@squares/domain/lens";
import { shareCardModel } from "@squares/domain/shareCard";
import { useCanvasCard } from "@/platform/useCanvasCard";
import { useStore } from "@squares/domain/store";

export function ShareScreen() {
  const { data, today } = useStore();

  // The card's own Lens. It is picked here rather than inherited from Home,
  // which this Screen is not reached from — a card that quietly depended on
  // what another Screen was last showing would be a card you cannot predict.
  const [lens, setLens] = useState<Lens>(DEFAULT_LENS);
  const model = useMemo(() => shareCardModel(data, today, lens), [data, today, lens]);
  const { canvasRef, size, status, save } = useCanvasCard(model);

  return (
    <>
      <h1 className="title" style={{ margin: "0 0 20px" }}>
        share card
      </h1>

      <div style={{ marginBottom: 12 }}>
        <LensPicker value={lens} onChange={setLens} label="how much of the record to put on the card" />
      </div>

      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        className="share-preview"
        aria-label={`Share card: ${model.tally} logs across ${lensNoun(model.lens)}${
          model.names.length > 0 ? `, naming ${model.names.join(", ")}` : ""
        }`}
        role="img"
      />

      {/*
        What is on the card, in words, before it is saved. ADR 0010: naming is
        unconditional, so this is a statement of fact rather than a control —
        Hide, on each Habit's own Screen, is the only way to keep one off.
      */}
      <div className="card" style={{ marginTop: 16 }}>
        {model.names.length === 0 ? (
          <p className="note" style={{ margin: 0 }}>
            no habits on this card yet.
          </p>
        ) : (
          <p className="note" style={{ margin: 0 }}>
            this card names {model.names.join(", ")}.
          </p>
        )}
      </div>

      {/* One button, because on a phone the two were the same act. Saving the
          card used to be a download that iOS refuses to perform, so it now
          goes through the same handoff as the export — which on a phone *is*
          the share sheet, with "save to photos" on it. */}
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
