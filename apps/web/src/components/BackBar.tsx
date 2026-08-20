"use client";

/**
 * The way out of a Screen, pinned to the bottom of the viewport.
 *
 * There is nothing behind this. `display` is `standalone` in the manifest, so
 * an installed app has no browser chrome and no browser back button — this is
 * the only exit, not a convenience on top of one. It sits at the bottom
 * because the top left corner is out of a thumb's reach on a phone, and it is
 * full width because a lone control in a bar otherwise looks like waste. Full
 * width also clears the 44px touch minimum without being asked to.
 *
 * It carries back and nothing else. Pulling each Screen's main action in here
 * was rejected in ADR 0004: settings has no single main action, a Habit's own
 * Screen has two of equal weight, and `save` belongs under the field it judges.
 */
export function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="backbar">
      <button type="button" className="backbar-btn" onClick={onBack}>
        ‹ back
      </button>
    </div>
  );
}
