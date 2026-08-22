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

### Still open

The code has not changed. This entry is the specification for that change.

These renames are mechanical:

- `toggleTick`, `ticked`
- `chainOf`, `longestChainOf`, `chained`
- `isArchived`, `archivedHabits`, `liveHabits`, `setArchived`

These changes are not mechanical:

- `GRACE_DAYS` and `isOpen` become one test for today.
- The app drops `DayRecord.active` and calculates the set of Habits from the
  Spans. The storage goes to `version: 3`. The app migrates a v1 or v2 file at
  import: it discards `active` and calculates the set again.
- An imported year can thus look different from the year that the user last saw.
  We accepted this. The alternative is a reconciler that runs one time for each
  user, and no test can find an error in it.
- Intensity, Total and the Share Card must all exclude the Hidden Habits.
- A Hidden Habit needs a Screen that the user can read: its Heatmap, its number
  of Logs, its Longest Streak, and the control to show it again. The Screen
  shows no Streak, because the value is always 0.
- The Daily Reminder needs its one question during the creation of the first
  Habit.

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
