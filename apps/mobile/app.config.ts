import type { ExpoConfig } from "expo/config";
import { CARD, DARK_LEVELS, toRgb, type Oklch } from "@squares/domain/palette";

/**
 * Android's icon and splash colours are written into resource XML, which wants
 * `#rrggbb`. `css()` emits the `rgb()`/`rgba()` the canvas, React Native and
 * Reanimated all take, and that does not parse there — so this converts rather
 * than reusing it.
 */
const hex = (colour: Oklch) =>
  `#${toRgb(colour)
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;

/**
 * TypeScript rather than app.json, so this file can say why.
 *
 * The background is the Share Card's, taken from the ramp's one definition
 * (`@squares/domain/palette`) rather than restated as a hex string that would
 * drift the first time the palette moved.
 */
const config: ExpoConfig = {
  name: "squares",
  slug: "squares",
  version: "0.1.0",
  scheme: "squares",
  orientation: "portrait",
  // System means dark unless the device asks for light — see CONTEXT.md, Theme.
  userInterfaceStyle: "automatic",
  icon: "./assets/images/icon.png",

  // No web target. ADR 0006 chose two interfaces over one compiled to both, and
  // apps/web is the web one; a second, worse web build here would be the exact
  // react-native-web outcome that ADR rejected.
  platforms: ["android", "ios"],

  android: {
    adaptiveIcon: {
      backgroundColor: hex(CARD.bg),
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    // Off, and deliberately so. react-native-screens does not implement
    // predictive back in its stable major, and enabling this with Expo Router's
    // default stack currently makes the gesture leave the app instead of
    // popping a Screen. See ADR 0006 and docs/research/.
    predictiveBackGestureEnabled: false,
  },

  plugins: [
    "expo-router",
    [
      // The accent Android tints a Reminder's small icon with. The full-shade
      // ramp level, so a Reminder is the same green as a complete Day.
      // No `enableBackgroundRemoteNotifications`, and no push config of any
      // kind: ADR 0007 says nothing about a Reminder touches the network.
      "expo-notifications",
      { color: hex(DARK_LEVELS[4]!), defaultChannel: "reminders" },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: hex(CARD.bg),
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
  ],

  experiments: { typedRoutes: true, reactCompiler: true },
};

export default config;
