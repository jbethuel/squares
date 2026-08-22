import * as Haptics from "expo-haptics";

/**
 * What the app is allowed to make the phone feel, in one place.
 *
 * The web gets one line of this: `navigator.vibrate(8)` on the tap that adds a
 * Log. A phone has a whole vocabulary — impacts in five weights, a selection
 * click, three notification patterns — and scattering picks from it through the
 * Screens is how an app ends up buzzing at everything. So the Screens ask for
 * an *intent* and this file decides what that feels like.
 *
 * Every call is fire-and-forget. A device with no haptic engine, or an Android
 * build without the vibrate permission, rejects rather than throwing
 * synchronously, and a Log that fails to buzz is not a Log that failed.
 */
const fire = (run: () => Promise<void>) => {
  void run().catch(() => {
    // Haptics are a nicety. Nothing above this line may depend on one landing.
  });
};

/**
 * The Log — the tap that adds.
 *
 * Light rather than Medium because it stands in for the web's 8ms buzz, and
 * because it fires on the app's most repeated action: anything heavier turns a
 * daily habit into a daily thud.
 */
export const log = () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/**
 * The tap that takes a Log back, which is deliberately silent.
 *
 * This is a named no-op rather than an absence, because "we forgot the unlog"
 * and "correcting a mistake should feel administrative" look identical at the
 * call site otherwise. The rule is the web's and it is kept here.
 */
export const unlog = () => {};

/** A switch moving, either way. What UIKit gives its own switches. */
export const switched = () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/**
 * Moving between the options of a picker — a Lens, a Theme.
 *
 * The selection click rather than an impact: these are the same gesture iOS
 * uses it for, and an impact on a three-way picker reads as three buttons
 * rather than one control.
 */
export const selected = () => fire(() => Haptics.selectionAsync());

/**
 * A thing done rather than a thing changed: saving a new Habit, replacing the
 * year on an import. Medium, because these are the taps with a consequence.
 */
export const committed = () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

/**
 * The app refusing something the user asked for — a file that is not an Export.
 *
 * The one place a pattern is right instead of a single knock: it has to be
 * distinguishable from a success without reading the line that appears beside
 * it.
 */
export const refused = () =>
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
