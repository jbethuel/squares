# React Native for the phone, and two interfaces over one set of rules

The phone app is React Native on Expo. The Next.js app stays exactly as it is and keeps serving the web. Neither is generated from the other: they share `packages/domain` and nothing else.

The opposite looks obvious, and until now it was right. `output: "export"` plus a manifest, a service worker and a `beforeinstallprompt` handler already give Android a launcher icon, a chrome-less window and full offline — "make it installable on Android" was finished before it was asked.

What forced a second runtime was the Reminder, and only the Reminder. No web runtime can raise a notification at a future time without a server: Notification Triggers never left origin trial, Periodic Background Sync guarantees no interval, and Web Push needs a subscription endpoint and a server holding VAPID keys, which ADR 0002 forbids outright.

## Considered options

**A Trusted Web Activity around the existing export.** The cheapest route to the Play Store by a wide margin — an `assetlinks.json`, a signed shell, no second codebase. Rejected because a TWA is Chrome in a trusted shell and inherits every limit above, so it cannot schedule the Reminder, which is the whole reason for leaving the web. The listing it would have delivered was worth having and was never worth a rewrite on its own.

**Capacitor.** The cheapest route that *can* schedule one: the Screens, the token system, the canvas Share Card and the Playwright suite all keep working inside a WebView, and only `handoff.ts` and `storage.ts` grow a native branch. It was the lower-cost option and it was not taken. What it does not give is platform navigation — a native header, the iOS interactive pop, Android predictive back — and this app needs that more than most, because ADR 0004 spent an entire decision on the fact that a standalone web app draws its own way out or has none. It also carries a Play Store review risk that a bare WebView wrapper does not clear by itself.

**react-native-web, one interface compiled to both.** Rejected because the web app is finished. Its Heatmap is CSS grid, its bars use `env(safe-area-inset-bottom)`, its ramp is CSS custom properties. Re-expressing all of that in React Native primitives means rewriting a working interface in order to arrive back where it started, and then hoping the compiled output matches.

## Consequences

Two interfaces are two chances to get a rule wrong, so the rules live in one place and are consumed, never reimplemented. `StoreProvider` is shared and takes its storage injected, because the rollover-and-`sealDays` effect inside it *is* the Grace Window, and two copies of it can disagree about which Days are open. The phone app adds an `AppState` listener beside the interval: Android stops timers in the background, and a Day that rolls over unnoticed is a Day that never gets sealed.

`drawShareCard` is the one rule-adjacent thing that cannot be shared — 38 Canvas2D calls, and React Native has no canvas. `shareCardModel` and `cardSize` stay shared so that only the drawing forks, and a test compares the two outputs, because a Share Card that differs by platform is a Share Card nobody can trust.

The Intensity ramp had exactly one guard: `palette.test.ts` reading `globals.css` off disk and asserting the five dark levels match. A package boundary breaks that, and a third consumer would have turned it into a three-way assertion. `palette.ts` becomes the single source and the CSS is generated from it — which also closes the gap that the light ramp was never guarded at all.

ADR 0004 is amended rather than overturned. The phone app ships Export and Import in v1: uninstalling an app is precisely the storage-clearing event ADR 0002 promised Export would answer, and it arrives with no warning in front of it.
