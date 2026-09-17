# Build log

What we built, what we decided, and what is still open.
Restarted 2026-08-22.

## 2026-08-22 — the domain model

A work session set the model of the app and rewrote the documentation. The model
below is now the specification. Where the code does different, that is a gap to
close and not a second opinion.

### The decisions

**The user can Log only today.** There is no window back to yesterday. The user
can remove a Log from today until local midnight, because today is not yet a
permanent record. See ADR 0002.

**A Streak belongs to one Habit.** The app does not repair a Streak. The app
does not show that a Streak stopped at one minute after midnight. The app counts
back from today if the user Logged today, and from yesterday if the user did
not. Today is not a missed Day until today ends.

**The user turns on the Streak for each Habit.** The app always calculates the
Streak. Thus the control shows the Streak that the Habit has now, and does not
start at zero.

**Longest Streak is now in the glossary.** Both detail Screens showed this
number, and the glossary did not contain it.

**Hide replaces Archive, and it removes the data from the display.** Hide closes
the Span of the Habit. It removes the Habit and all its Logs from Home, from the
Overview Heatmap and from the Share Card. If the user shows the Habit again, the
app opens a new Span and the Squares come back. The app destroys no data, and
there is no delete operation. See ADR 0003.

**The Overview Heatmap is thus a live projection.** A Day Record contains only
the Logs. The app calculates the set of Habits for a Square from the Spans of
the Habits that are visible now. See ADR 0001.

**The Total decreases at a Hide.** A number must agree with the Heatmap below
it.

**New terms.** Tick is now Log, as a noun and as a verb. Chain is now Streak.
Archive is now Hide. Grace Window is not in the model. We removed it and did not
make it shorter.

### The documents

We rewrote `CONTEXT.md`, the ADR set, `README.md` and `apps/mobile/AGENTS.md`.
We renumbered the ADRs from 0001 as one sequence, and we corrected each
reference to an ADR in the code and in the CI files.

We deleted the design brief. It was a handover prompt for one session, and that
session is complete.

All the documents now use ASD-STE100 Simplified Technical English.

### The code

The code now implements the model above. What changed, beyond the renames:

- `GRACE_DAYS` and `isOpen` became `isToday`. `toggleLog` refuses any Day but
  today, and it refuses a Hidden Habit.
- `sealDays` is gone. A Day Record holds only the Logs, so an empty one carries
  nothing; `toggleLog` writes a record when the first Log lands and deletes it
  when the last one leaves. The store no longer materialises history at
  rollover, and neither does load.
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
  Streak, and no current Streak — that would read 0 forever.
- The Daily Reminder still needs its one-time ask during the first Habit's
  creation. **That is the one part of the model the code does not yet do.**
  (This was not correct. The Reminder had no interface at all — see 2026-09-15.)

The suites moved with it: `rules.test.ts` is organised around the three rules as
they now stand, `grace.spec.ts` became `today.spec.ts`, and `tick.spec.ts`
became `log.spec.ts`. 171 domain tests, 176 web unit tests, 68 end-to-end.

One test was wrong before this work and is now fixed: the Share Card's week-ring
check asserted a ring "on whatever day it is made", but the ring is drawn only
where the Frame runs past today, so it failed every Saturday.

### Carried forward

- Does a single `DATE` trigger continue after a reboot? `expo-notifications`
  includes `RECEIVE_BOOT_COMPLETED`, and the documentation says that the library
  schedules the notifications again after a restart. `docs/research/` verified
  this for the daily trigger and not for this trigger. If it is not correct, the
  horizon of seven Days becomes empty at each restart until the user opens the
  app. Test this on a device.
- A phone that the user does not touch for more than seven Days gets no
  Reminder. This is the horizon in correct operation, but seven can be the wrong
  number. Only a constant in `reminders.ts` records it.
- The identifier hash of the reconcile has the highest risk of an error in the
  Reminder. No test reaches it, because it is in `apps/mobile`. Move it to
  `packages/domain`, or accept a test on a device only.
- The app fetches Hack into `public/fonts/` at 214KB for two weights. A subset
  of the characters that the interface uses removes most of that size.
- The app keeps the Day Records that are older than one year. The storage is
  small, and an Export then contains the full history. But no function reads
  them.

## 2026-09-15 — the Play Store, and the Reminder gets an interface

### The Android build

The build config still aimed at the sideloaded APK of ADR 0007, and Play is a
different target. `eas.json` now asks for an App Bundle, which Play has required
of every new app since August 2021. Its `autoIncrement` moved into `android`,
where the schema accepts the string form — at the profile level the file did not
validate, so the first build would have stopped there whatever else was correct.
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
imported either. No Screen mounted the hook, so `expo-notifications` never
entered the bundle — the app would have shipped asking for the notification
permission for a feature the user could not reach. The 2026-08-22 entry above
said only the one-time ask was missing. That was wrong, and wrong in the
direction that hides the gap.

What the interface is now:

- `ReminderRow` — the switch and the time it is set to. `time: null` is off, so
  there is no flag in the interface that can disagree with one in the settings.
  The time opens Android's own clock dialog
  (`@react-native-community/datetimepicker`).
- Settings holds the Daily Reminder, under its own heading rather than under
  data: a Reminder belongs to the device and is not in an Export.
- A Habit's Screen holds that Habit's Reminder, inside the block that is hidden
  while the Habit is, with the other two opt-ins. ADR 0008 cancels a Hidden
  Habit's Reminder, so a switch there would sit on and do nothing.
- Creating the first Habit asks the one question ADR 0008 allows. Both answers
  record that it was asked; only one sets a time. A user who agrees and is then
  refused by the OS is told, instead of being returned to Home believing a
  Reminder is set.

`ReminderSettings` gained `asked`, which says the question was put and never
what the answer was, and the package gained `DEFAULT_TIME` — 20:00, evening and
not late, because by ADR 0002 a prompt has to arrive while there is still Day
left to Log in.

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
`WRITE_EXTERNAL_STORAGE` (both capped at API 32). None are used — Export,
Import and the Share Card go through `Paths.cache` and the OS share sheet /
document picker (`platform/handoff.ts`), never shared storage, and ADR 0004 is
the reason nothing in this app calls out to the network at all. `INTERNET` on
a "no backend" app is the one a security-minded user or a Play reviewer would
catch, so all three joined `SYSTEM_ALERT_WINDOW` in `blockedPermissions`.

What's left after blocking: `POST_NOTIFICATIONS` and `RECEIVE_BOOT_COMPLETED`
(both `expo-notifications`, both earned by the Daily Reminder) and `VIBRATE`
(`expo-haptics`). Every remaining permission now maps to a feature the app
actually has.

## 2026-09-17 — the first build, and a full store listing

The 2026-09-15 entry's first carried-forward item: resolved. `eas build
--profile preview` ran end to end and installed on a device. Skia, Reanimated,
the React Compiler and the new architecture compiled together for the first
time and none of it broke — the year grid renders and, the heavier path, the
Share Card's Skia canvas rendered and encoded a PNG correctly on-device. The
existing `Build Credentials C7XyyzfxRU` on EAS signed it, so nothing about
credentials needed setting up.

`store/android/screenshots/` and `store/android/listing.md` now hold the
listing: four screenshots (Home, a Habit's screen, the Share Card, Settings)
and the short/long description, category and contact email. The device that
took them was seeded with a synthetic ~260-day, 3-habit history — built the
same way `apps/web/e2e/fixtures.ts`'s `buildAccount` builds a test account —
so the year reads as lived-in rather than the one real Habit and one real Log
actually on that device. `listing.md` says as much, so nobody mistakes the
screenshots for real usage later.

The privacy policy the second carried-forward item asked for exists now:
https://jbethuel.com/privacy/squares. ADR 0004 still needs the amendment
acknowledging it — the app has one now, hosted outside the app, which the ADR
as written says doesn't happen.

The Play Console account under `jbethuel` turned out to be closed — Google
closes developer accounts for inactivity, and this one had been, since before
any Android work started here. No Data Safety form and no closed testing
track can exist until a new account (and a new $25) replaces it. That account
is being made outside this repo; the third carried-forward item — a listing
with no screenshots or copy — is otherwise done and waiting on it.

## 2026-09-17 — the application id becomes `squares.jbethuel.dev`

`android.package` and `ios.bundleIdentifier` were `dev.jbethuel.squares`. Both
are now `squares.jbethuel.dev`: the domain as it reads, not reversed. Changed
now because nothing has shipped under the old id; once a build is on Play, the
id cannot change.

What the old id leaves behind:

- The first production App Bundle, version code 3
  (build `a6efe894-8fa1-46c7-ba6d-d97bfa04fb38`), is signed as
  `dev.jbethuel.squares`. Do not upload it.
- EAS keeps Android credentials per application id. `Build Credentials
  C7XyyzfxRU` belongs to the old id, so the next build under the new one has
  no keystore until one is made, and a `--non-interactive` build stops there.
- The preview APK on the test device is now a different app from any new
  build. The two install side by side; uninstall the old one by hand.
