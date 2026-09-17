import { useMemo, useState } from "react";
import type { ShareCardModel } from "@squares/domain/shareCard";
import { exportCard } from "./handoff";
import { renderShareCard } from "./shareCardSkia";

/**
 * Rendering and saving a card, shared by the Overview Card and every Habit
 * Card Screen (ADR 0011) — the two differ only in which model feeds this.
 */
export function useCardExport(model: ShareCardModel | null) {
  const [status, setStatus] = useState<string | null>(null);
  // Drawn once. What is on screen is the PNG that gets saved, not a second
  // rendering of it that could disagree.
  const card = useMemo(() => (model ? renderShareCard(model) : null), [model]);

  const save = async () => {
    if (!card) return;
    // Where the device offers a sheet this is that sheet, driven by the user.
    // The app never posts anything itself. As on Settings, the claim stops at
    // what the API actually reports — see `handoff.ts`.
    setStatus((await exportCard(card.base64)) ? "squares sent the card to the share sheet." : null);
  };

  return { card, status, save };
}
