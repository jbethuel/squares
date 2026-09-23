# React Native for the phone, and two UIs over one set of rules

The phone app is React Native on Expo, and the web is served by the Next.js app.
Neither is generated from the other; they share `packages/domain` and nothing
else.

At first the opposite looks right. The web app already has `output: "export"`, a
manifest, a service worker and a `beforeinstallprompt` handler, so on Android it
already gets a launcher icon, a chromeless window and full offline support.

The Reminder is the only thing that forces a second runtime. No web runtime can
fire a notification at a future time without a server:

- Notification Triggers never made it out of origin trial.
- Periodic Background Sync doesn't guarantee any interval.
- Web Push needs a subscription endpoint and a server with VAPID keys, and ADR
  0004 rules out a server.

## Considered options

**Wrap the web export in a Trusted Web Activity.** The cheapest route to the Play
Store: an `assetlinks.json` and a signed shell, no second codebase.

Rejected because a TWA is just Chrome in a shell, with every limitation above, so
it can't schedule the Reminder. The Reminder is the whole reason to leave the
web. A Play Store listing is nice, but not worth a rewrite on its own.

**Capacitor.** The cheapest route that *can* schedule a Reminder. The Screens,
token system, canvas Share Card and Playwright tests would all keep working in a
WebView, and only `handoff.ts` and `storage.ts` would need native branches.

It's cheaper, and we still passed on it, because it doesn't give platform
navigation: a native header, the iOS interactive pop, and Android predictive
back. A WebView can never support predictive back, since it has no native back
stack.

This app needs platform navigation more than most. ADR 0006 shows that a
standalone web app either draws its own exit or has none. Capacitor also carries
Play Store review risk that a WebView shell may not clear.

**react-native-web, one UI compiled to both targets.** Rejected because the web
app is already finished. Its Heatmap is a CSS grid, its controls use
`env(safe-area-inset-bottom)`, and its ramp uses CSS custom properties.

Rewriting all of that in React Native primitives would cost a lot to get the
same result, and the compiled output might not even match.

## Consequences

Two UIs mean two chances to get a rule wrong, so the rules live in one package
and neither app reimplements them.

`StoreProvider` is shared and takes its storage as a parameter. The effect
inside it detects the date change and seals the Day, so it decides which Day is
open. Two copies of that effect could disagree.

The phone app adds an `AppState` listener alongside the interval, because
Android pauses timers in the background, and per ADR 0002 a Day that isn't
sealed can't be recovered.

`drawShareCard` is the one function the two apps can't share: it makes 38
Canvas2D calls, and React Native has no canvas. `shareCardModel` and `cardSize`
stay shared, so only the drawing differs. A test compares the two outputs,
because a Share Card has to look the same on both platforms.

The Intensity ramp used to have a single test, which read `globals.css` from
disk and compared the five dark levels. That doesn't work across a package
boundary, and a third consumer would make it a three-way comparison. So
`palette.ts` becomes the single source and the CSS is generated from it, which
also gives the previously untested light ramp a test.

This decision keeps Android predictive back possible, but doesn't deliver it.
`android.predictiveBackGestureEnabled` defaults to false. `react-native-screens`
doesn't support predictive back in its current stable major, and its maintainer
has said support is unlikely.

Turning the flag on with Expo Router's default stack hits an open bug: the
gesture exits the app instead of popping a Screen. Revisit once the library
supports it.

Predictive back isn't in the initial scope, and ADR 0006's navigation design
doesn't need it. The Android back gesture works fine, just without the
predictive animation. Checked 2026-08-20 against Expo SDK 57; see
`docs/research/expo-notifications-and-predictive-back.md`.

The phone app ships Export and Import in v1. Uninstalling wipes storage with no
warning, and ADR 0004 names Export as the answer to that.
