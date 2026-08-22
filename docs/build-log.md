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
