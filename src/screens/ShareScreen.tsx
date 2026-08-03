"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cardSize, drawShareCard, shareCardModel } from "@/domain/shareCard";
import { useStore } from "@/domain/store";

/** The PNG is drawn at 4x the card's design units: 1280px wide. */
const EXPORT_SCALE = 4;

export function ShareScreen({ onBack, onSettings }: { onBack: () => void; onSettings: () => void }) {
  const { data, today } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);

  const model = useMemo(() => shareCardModel(data, today), [data, today]);
  const size = cardSize(model, EXPORT_SCALE);

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

  useEffect(() => {
    setCanShareFiles(
      typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [new File([], "squares.png", { type: "image/png" })] }),
    );
  }, []);

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
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // No date in the filename either — the card carries no date, and neither
    // should the file it is saved as.
    link.download = "squares.png";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("saved");
  };

  const share = async () => {
    const blob = await toBlob();
    if (!blob) return;
    try {
      // The OS sheet, driven by the user. The app never posts anything itself.
      await navigator.share({ files: [new File([blob], "squares.png", { type: "image/png" })] });
    } catch {
      setStatus(null);
    }
  };

  return (
    <>
      <button type="button" className="btn-quiet" onClick={onBack} style={{ marginBottom: 22 }}>
        ‹ back
      </button>
      <h1 className="title" style={{ margin: "0 0 20px" }}>
        share card
      </h1>

      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        className="share-preview"
        aria-label={`Share card: ${model.total} ticks over ${model.elapsed} days${
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
            no habit names on this card. a year of shape and one number, nothing that says what you
            were doing.
          </p>
        ) : (
          <>
            <p className="note" style={{ margin: "0 0 8px" }}>
              this card names{" "}
              <span style={{ color: "var(--chain-fg)" }}>{model.names.join(" · ")}</span>. everything
              else stays anonymous.
            </p>
            <button type="button" className="btn-quiet" onClick={onSettings}>
              change what is named ›
            </button>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => void save()}>
          save .png
        </button>
        {canShareFiles ? (
          <button type="button" className="btn" style={{ flex: 1 }} onClick={() => void share()}>
            share…
          </button>
        ) : null}
      </div>

      {status ? (
        <p className="note-faint" role="status" style={{ marginTop: 12 }}>
          {status}
        </p>
      ) : null}

      <p className="note-faint" style={{ marginTop: 22 }}>
        rendered on this device. there is no hosted page and no link between users — you save the
        png and post it yourself, or you don&apos;t.
      </p>
    </>
  );
}
