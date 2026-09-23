# Build log

What we built, what we decided, and what is still open.
Restarted 2026-08-22.

## 2026-08-22 — the domain model

One work session pinned down the app's model and rewrote the docs to match. The
model below is now the spec. Where the code disagrees, that's a gap to close,
not a second opinion.

### The decisions

**Only today can be Logged.** There's no grace window for yesterday. Today's Log
can be undone until local midnight, since today isn't a permanent record yet.
See ADR 0002.

**A Streak belongs to one Habit.** Streaks are never repaired, and never shown
as broken at one minute past midnight. The Streak counts back from today if
today is Logged, and from yesterday if not. Today isn't a missed Day until it's
over.

**Streaks are opt-in per Habit.** The Streak is always being calculated, so
turning it on shows the Habit's current Streak rather than starting at zero.

**Longest Streak is now in the glossary.** Both detail Screens already showed
it, but the glossary didn't define it.

**Hide replaces Archive, and it takes the data off the display.** Hide closes
the Habit's Span and removes the Habit and all its Logs from Home, the Overview
Heatmap and the Share Card. Unhiding opens a new Span and the Squares come back.
No data is ever destroyed, and there's no delete. See ADR 0003.

**So the Overview Heatmap is a live projection.** A Day Record holds only Logs.
Which Habits count toward a Square is worked out from the Spans of the Habits
visible now. See ADR 0001.

**The Total drops on a Hide.** A number has to agree with the Heatmap below it.

**Renames.** Tick is now Log (noun and verb), Chain is now Streak, and Archive
is now Hide. Grace Window is gone from the model entirely; we removed it rather
than shortening it.

### The documents

We rewrote `CONTEXT.md`, the ADRs, `README.md` and `apps/mobile/AGENTS.md`,
renumbered the ADRs from 0001 as a single sequence, and fixed every ADR
reference in the code and CI files.

We deleted the design brief. It was a handover prompt for a single session, and
that session is done.

At the time, all the docs were rewritten in ASD-STE100 Simplified Technical
English. (As of 2026-09-23 nothing uses STE any more: the developer docs are in plain
English, and the app's text follows the voice rules in the README.)

### The code

The code now implements the model above. What changed, beyond the renames:

- `GRACE_DAYS` and `isOpen` became `isToday`. `toggleLog` refuses any Day but
  today, and it refuses a Hidden Habit.
- `sealDays` is gone. A Day Record holds only the Logs, so an empty one carries
  nothing; `toggleLog` writes a record when the first Log lands and deletes it
  when the last one leaves. The store no longer materialises history at
  rollover, and neither does loading.
- `DayRecord.active` is gone. `countedOn` derives the Habits a Square counts
  from the Spans, filtered to the Habits that are not Hidden now. `intensityAt`
  takes `today` for that reason.
- `totalLogs` counts only the visible Habits, so it falls at a Hide.
- Storage is `version: 3`. A v1 or v2 file is migrated on import: `active` is
  discarded, `ticked` becomes `logged`, `chained` becomes `streaks`, and a Day
  with no Logs is dropped. An imported year can therefore come back shaded
  slightly differently from the one it was exported as. That was accepted over
  a reconciler that runs once per user and can never be tested against real
  drift.
- Home lost the yesterday strip, and the Tail lost the hollow "still open"
  Square. A missed Day is now drawn like any other empty Day.
- A Hidden Habit's Screen shows its Heatmap, its Log count and its Longest
  Streak, but no current Streak, which would always read 0.
- The Daily Reminder still needs its one-time ask during the first Habit's
  creation. **That is the one part of the model the code does not yet do.**
  (This turned out to be wrong: the Reminder had no interface at all. See
  2026-09-15.)

The suites moved with it: `rules.test.ts` is organised around the three rules as
they now stand, `grace.spec.ts` became `today.spec.ts`, and `tick.spec.ts`
became `log.spec.ts`. 171 domain tests, 176 web unit tests, 68 end-to-end.

One test was wrong before this work and is now fixed: the Share Card's week-ring
check asserted a ring "on whatever day it is made", but the ring is drawn only
where the Frame runs past today, so it failed every Saturday.

### Carried forward

- Does a single `DATE` trigger survive a reboot? `expo-notifications` declares
  `RECEIVE_BOOT_COMPLETED`, and the docs say the library reschedules
  notifications after a restart. `docs/research/` verified that for the daily
  trigger, not this one. If it's wrong, the seven-Day horizon empties on every
  restart until the user opens the app. Test on a device.
- A phone left untouched for more than seven Days gets no Reminders. That's the
  horizon working as designed, but seven might be the wrong number, and it's
  only recorded as a constant in `reminders.ts`.
- The reconcile's identifier hash is the likeliest place for a Reminder bug, and
  no test reaches it because it lives in `apps/mobile`. Either move it to
  `packages/domain` or accept device-only testing.
- Hack is fetched into `public/fonts/` at 214KB for two weights. Subsetting to
  the characters the UI uses would cut most of that.
- Day Records older than a year are kept. Storage is small and it means an
  Export has the full history, but nothing reads them.

## 2026-09-15 — the Play Store, and the Reminder gets an interface

### The Android build

The build config still aimed at the sideloaded APK of ADR 0007, and Play is a
different target. `eas.json` now asks for an App Bundle, which Play has required
of every new app since August 2021. Its `autoIncrement` moved into `android`,
where the schema accepts the string form. At the profile level the file didn't
validate, so the first build would have failed there regardless of anything else.
The EAS project is made and its id is in `app.config.ts`, which has to be written
by hand: `eas init` cannot write back to a TypeScript config.

`blockedPermissions` now drops `SYSTEM_ALERT_WINDOW`. React Native declares
"draw over other apps" in its own manifest for the dev menu, the merger carried
it into the release build, and Play treats it as a sensitive permission. Nothing
in this app asks for it.

Thirteen packages moved to the versions SDK 57 expects. That also cleared the
duplicate `expo-constants` and `expo-file-system` that autolinking could have
resolved to a different native version than the JS.

### The Reminder had no interface

The rules were written and tested, the scheduling was written, and nothing
imported either. No Screen mounted the hook, so `expo-notifications` never made
it into the bundle, and the app would have shipped asking for notification
permission for a feature nobody could reach. The 2026-08-22 entry above said
only the one-time prompt was missing. That understated the gap.

What the interface is now:

- `ReminderRow`: the switch and the time it's set to. `time: null` is off, so
  there is no flag in the interface that can disagree with one in the settings.
  The time opens Android's own clock dialog
  (`@react-native-community/datetimepicker`).
- Settings holds the Daily Reminder, under its own heading rather than under
  data, because a Reminder belongs to the device and isn't in an Export.
- A Habit's Screen holds that Habit's Reminder, inside the block that is hidden
  while the Habit is, with the other two opt-ins. ADR 0008 cancels a Hidden
  Habit's Reminder, so a switch there would sit on and do nothing.
- Creating the first Habit asks the one question ADR 0008 allows. Both answers
  record that it was asked; only one sets a time. A user who agrees and is then
  refused by the OS is told, instead of being returned to Home believing a
  Reminder is set.

`ReminderSettings` gained `asked`, which says the question was put and never
what the answer was. The package also gained `DEFAULT_TIME`: 20:00, evening but
not late, because per ADR 0002 a prompt has to arrive while there's still time
left in the Day to Log.

`useReminders` became a provider. It was a hook holding its own state, so a
second mount would have been a second copy of the settings, each reconciling the
device's pending notifications against its own plan and cancelling what the
other had just scheduled. It sits above the Stack rather than on the Screens
that set a Reminder, because what silences one is a Log, and Logs happen on
Home.

176 domain tests, 176 web unit tests. The five new ones cover the ask and the
default time.

### Carried forward

- Nothing here ran on a device. The bundle is verified to contain the Reminder
  and the app config resolves, but no native build of this app has ever been
  made. Skia, Reanimated, the React Compiler and the new architecture have not
  been compiled together.
- Play wants a privacy policy URL of every listing. ADR 0004 says the app has
  none, which was true of a sideloaded APK and is not an option here. The ADR
  needs an amendment either way.
- The listing has no screenshots and no copy. `store/android/` holds the icon
  and the feature graphic only, and the `pnpm icons` and `pnpm store-assets`
  scripts the README documents do not exist in any package.json.

## 2026-09-17 — auditing the merged manifest

A permissions review, not a feature: every native dependency in
`apps/mobile/package.json` was checked for what it adds to the merged Android
manifest, the same way the 2026-09-15 entry caught `SYSTEM_ALERT_WINDOW`.

`expo-file-system` merges in three: `INTERNET`, and `READ_EXTERNAL_STORAGE` /
`WRITE_EXTERNAL_STORAGE` (both capped at API 32). None of them are used.
Export, Import and the Share Card go through `Paths.cache` and the OS share
sheet or document picker (`platform/handoff.ts`), never shared storage, and per
ADR 0004 nothing in the app touches the network. `INTERNET` on a "no backend"
app is exactly what a privacy-conscious user or a Play reviewer would notice, so
all three were added to `blockedPermissions` alongside `SYSTEM_ALERT_WINDOW`.

What's left after blocking: `POST_NOTIFICATIONS` and `RECEIVE_BOOT_COMPLETED`
(both `expo-notifications`, both earned by the Daily Reminder) and `VIBRATE`
(`expo-haptics`). Every remaining permission maps to a feature the app has.

## 2026-09-17 — the first build, and a full store listing

This resolves the first carried-forward item from 2026-09-15. `eas build
--profile preview` ran end to end and installed on a device. Skia, Reanimated,
the React Compiler and the new architecture compiled together for the first
time without problems. The year grid renders, and the Share Card's Skia canvas
(the heavier path) rendered and encoded a PNG correctly on the device. The
existing `Build Credentials C7XyyzfxRU` on EAS signed it, so nothing about
credentials needed setting up.

`store/android/screenshots/` and `store/android/listing.md` now hold the
listing: four screenshots (Home, a Habit's screen, the Share Card, Settings)
plus the short and long descriptions, category and contact email. The device
that took them was seeded with a synthetic history of about 260 days and three
Habits, built the same way `buildAccount` in `apps/web/e2e/fixtures.ts` builds a
test account, so the year looks lived-in instead of showing the one real Habit
and one real Log on that device. `listing.md` notes this so nobody mistakes the
screenshots for real usage later.

The privacy policy from the second carried-forward item now exists at
https://jbethuel.com/privacy/squares. ADR 0004 still needs amending to
acknowledge it, since as written it says the app has no privacy policy.

The Play Console account under `jbethuel` turned out to be closed. Google
closes inactive developer accounts, and this one was closed before any Android
work started here. There can be no Data Safety form and no closed testing track
until a new account (and another $25) replaces it. That account is being set up
outside this repo. The third carried-forward item, the missing screenshots and
copy, is otherwise done and waiting on it.

## 2026-09-17 — the application id becomes `squares.jbethuel.dev`

`android.package` and `ios.bundleIdentifier` were `dev.jbethuel.squares`. Both
are now `squares.jbethuel.dev`, the domain as written rather than reversed. We
changed it now because nothing has shipped under the old id, and once a build is
on Play the id can't change.

What the old id leaves behind:

- The first production App Bundle, version code 3
  (build `a6efe894-8fa1-46c7-ba6d-d97bfa04fb38`), is signed as
  `dev.jbethuel.squares`. Do not upload it.
- EAS keeps Android credentials per application id. `Build Credentials
  C7XyyzfxRU` belongs to the old id, so the next build under the new one has
  no keystore until one is made, and a `--non-interactive` build stops there.
- The preview APK on the test device is now a different app from any new
  build. The two install side by side; uninstall the old one by hand.
