"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { handOff } from "@/platform/handoff";
import { LensPicker } from "@/components/LensPicker";
import { DEFAULT_LENS, lensNoun, type Lens } from "@squares/domain/lens";
import { liveHabits } from "@squares/domain/selectors";
import { cardSize, shareCardModel } from "@squares/domain/shareCard";
import { drawShareCard } from "@/platform/shareCardCanvas";
import { useStore } from "@squares/domain/store";

/** The PNG is drawn at 4x the card's design units: 1280px wide. */
const EXPORT_SCALE = 4;

export function ShareScreen({ onOpenHabit }: { onOpenHabit: (habitId: string) => void }) {
  const { data, today } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  // The card's own Lens. It is picked here rather than inherited from Home,
  // which this Screen is not reached from — a card that quietly depended on
  // what another Screen was last showing would be a card you cannot predict.
  const [lens, setLens] = useState<Lens>(DEFAULT_LENS);
  const model = useMemo(() => shareCardModel(data, today, lens), [data, today, lens]);
  const size = cardSize(model, EXPORT_SCALE);
  // The Habits behind the names on the card. Archived Habits are never named,
  // so every one of these still has a live Screen to open.
  const named = liveHabits(data, today).filter((habit) => habit.sharedName);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      // Without waiting for the face, the canvas silently falls back to a
      // system mono and the card ships with the wrong typography.
      try {
        await Promise.all([
          document.fonts.load(`700 ${30 * EXPORT_SCALE}px "Hack"`),
          document.fonts.load(`400 ${10 * EXPORT_SCALE}px "Hack"`),
        ]);
      } catch {
        // Fall through to the fallback stack rather than not drawing at all.
      }
      if (cancelled) return;
      const context = canvasRef.current?.getContext("2d");
      if (context) drawShareCard(context, model, EXPORT_SCALE);
    };
    void render();
    return () => {
      cancelled = true;
    };
  }, [model]);

  const toBlob = useCallback(
    () =>
      new Promise<Blob | null>((resolve) =>
        canvasRef.current ? canvasRef.current.toBlob(resolve, "image/png") : resolve(null),
      ),
    [],
  );

  const save = async () => {
    const blob = await toBlob();
    if (!blob) return;
    // No date in the filename either — the card carries no date, and neither
    // should the file it is saved as.
    const file = new File([blob], "squares.png", { type: "image/png" });
    // Where the device offers a sheet this is that sheet, driven by the user.
    // The app never posts anything itself, and it does not claim the card was
    // saved when the sheet was dismissed.
    setStatus((await handOff(file)) ? "saved" : null);
  };

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
        aria-label={`Share card: ${model.tally} ticks across ${lensNoun(model.lens)}${
          model.names.length > 0 ? `, naming ${model.names.join(", ")}` : ", no habit names"
        }`}
        role="img"
      />

      {/*
        What is on the card, in words, before it is saved. The card is
        anonymous by default and this is the line that proves it — a card that
        leaks a name is the one unforgivable bug, so the answer is never more
        than one glance away.
      */}
      <div className="card" style={{ marginTop: 16 }}>
        {model.names.length === 0 ? (
          <p className="note" style={{ margin: 0 }}>
            no habit names on this card. a year of shape and one number.
          </p>
        ) : (
          <>
            {/*
              Each name is the way to its own opt-in. Withdrawing a name is the
              safety-critical act in this app, so it is one tap from the card
              that carries it — read the name here, tap it, and the switch that
              removes it is the next thing on the screen.
            */}
            <p className="note" style={{ margin: "0 0 8px" }}>
              this card names{" "}
              {named.map((habit, index) => (
                <span key={habit.id}>
                  {index > 0 ? " · " : null}
                  <button
                    type="button"
                    className="name-link"
                    onClick={() => onOpenHabit(habit.id)}
                  >
                    {habit.name.trim().toLowerCase()}
                  </button>
                </span>
              ))}
              . everything else stays anonymous.
            </p>
            <p className="note-faint" style={{ margin: 0 }}>
              tap a name to stop naming it.
            </p>
          </>
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
