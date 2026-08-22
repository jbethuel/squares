# React Native for the phone, and two interfaces above one set of rules

The phone app uses React Native on Expo. The Next.js app serves the web. Neither
app is generated from the other. They share `packages/domain` and nothing else.

The opposite decision looks correct at first. The web app already has
`output: "export"`, a manifest, a service worker and a `beforeinstallprompt`
handler. Android thus gets a launcher icon, a window with no chrome and full
offline operation.

Only the Reminder makes a second runtime necessary. No web runtime can raise a
notification at a future time without a server:

- Notification Triggers did not leave the origin trial.
- Periodic Background Sync guarantees no interval.
- Web Push needs a subscription endpoint and a server with VAPID keys. ADR 0004
  does not permit a server.

## Considered options

**A Trusted Web Activity around the web export.** This is the least expensive
route to the Play Store. It needs an `assetlinks.json` file and a signed shell,
and no second codebase.

We rejected it because a TWA is Chrome in a shell. A TWA has all the limits
above, so it cannot schedule the Reminder. The Reminder is the reason to leave
the web. The Play Store listing has value, but it does not justify a rewrite.

**Capacitor.** This is the least expensive route that can schedule a Reminder.
The Screens, the token system, the canvas Share Card and the Playwright tests
continue to operate in a WebView. Only `handoff.ts` and `storage.ts` need a
native branch.

Capacitor costs less, and we did not select it. Capacitor does not give platform
navigation: a native header, the iOS interactive pop, and Android predictive
back. A WebView can never have predictive back, because a WebView has no native
back stack.

This app needs platform navigation more than most apps. ADR 0006 shows that a
standalone web app draws its own way out or has none. Capacitor also has a risk
at Play Store review that a WebView shell does not clear.

**react-native-web, one interface compiled to both targets.** We rejected this
option because the web app is complete. Its Heatmap is a CSS grid. Its controls
use `env(safe-area-inset-bottom)`. Its ramp uses CSS custom properties.

To write all of that again in React Native primitives gives the same result at a
high cost, and the compiled output can be different.

## Consequences

Two interfaces give two opportunities to make an error in a rule. Thus the rules
stay in one package. Each app uses the rules and does not write them again.

`StoreProvider` is shared and receives its storage as a parameter. The effect
inside it finds the change of Day and seals the Day. It thus controls which Day
is open. Two copies of that effect can disagree.

The phone app adds an `AppState` listener with the interval. Android stops
timers in the background. By ADR 0002, the app cannot recover a Day that it did
not seal.

`drawShareCard` is the one function that the two apps cannot share. It contains
38 Canvas2D calls, and React Native has no canvas. `shareCardModel` and
`cardSize` stay shared. Thus only the drawing is different. A test compares the
two outputs, because a Share Card must be the same on both platforms.

The Intensity ramp had one test only. That test read `globals.css` from disk and
compared the five dark levels. A package boundary stops that test, and a third
consumer makes it a comparison of three values. Thus `palette.ts` becomes the
one source, and the app generates the CSS from it. This also adds a test for the
light ramp, which had no test.

This decision keeps Android predictive back possible. It does not deliver it.
The value of `android.predictiveBackGestureEnabled` is false by default.
`react-native-screens` does not support predictive back in its current stable
major version, and its maintainer says that support is unlikely.

If you set the flag with the default stack of Expo Router, there is an open
defect: the gesture leaves the app and does not pop a Screen. Examine this again
when the library supports predictive back.

Predictive back is not in the initial scope. The navigation design of ADR 0006
does not need it. The Android back gesture operates correctly, but without a
predictive animation. Measured 2026-08-20 against Expo SDK 57. See
`docs/research/expo-notifications-and-predictive-back.md`.

The phone app has Export and Import in v1. An uninstall clears the storage, and
it gives no warning. ADR 0004 says that Export answers this risk.
