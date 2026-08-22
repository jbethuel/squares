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
  // 1.0.0, not 0.1.0: this is the build that is meant to be lived in, and
  // `versionCode` — the integer Android actually compares — is EAS's to keep
  // (eas.json, `autoIncrement`), because a dynamic config cannot be written back to.
  version: "1.0.0",
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
    /**
     * Permanent, and the one string here that cannot be changed later. Android
     * identifies an installed app by it, so a rename is not a rename: the OS
     * treats the new build as a different app, leaves the old one holding the
     * record, and the only way to be rid of it is an uninstall — which is the
     * storage-clearing event ADR 0006 warns arrives with no warning in front of it.
     */
    package: "dev.jbethuel.squares",

    /**
     * Android's Auto Backup is on unless a manifest says otherwise, and it
     * copies app storage to the user's Google Drive. That storage is
     * `expo-sqlite/kv-store`, which is the year. ADR 0002 says the record does
     * not leave the device and the README says it in as many words, so the
     * platform default makes both of them false.
     *
     * Off, so an uninstall really does erase the record — which is precisely the
     * event Export exists to answer, and why ADR 0009 raises Export from a
     * convenience to the only lifeline there is.
     */
    allowBackup: false,

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

  // iOS is not in v1 — ADR 0008 ships one sideloaded Android APK and nothing
  // else. The identifier is claimed here regardless: it costs nothing while it
  // is still free to choose, and AGENTS.md says nothing in this app may assume
  // iOS is not coming.
  ios: { bundleIdentifier: "dev.jbethuel.squares" },

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
