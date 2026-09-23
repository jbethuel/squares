import { useCallback, useEffect, useRef, useState } from "react";
import { cardSize, type ShareCardModel } from "@squares/domain/shareCard";
import { handOff } from "./handoff";
import { drawShareCard } from "./shareCardCanvas";

/** The PNG is drawn at 4x the card's design units: 1280px wide. */
const EXPORT_SCALE = 4;

/**
 * Drawing a card to a Canvas2D and saving it, shared by the Overview Card and
 * every Habit Card Screen (ADR 0011) — the two differ only in which model
 * feeds this.
 */
export function useCanvasCard(model: ShareCardModel | null) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const size = model ? cardSize(model, EXPORT_SCALE) : { width: 0, height: 0 };

  useEffect(() => {
    if (!model) return;
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
    setStatus((await handOff(file)) ? "saved." : null);
  };

  return { canvasRef, size, status, save };
}
