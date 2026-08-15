# Habit Heatmap

A single-user habit tracker built on the mechanic that makes the GitHub contribution graph compulsive: a year of Squares you fill in by hand, one tap at a time.

## Language

### Tracking

**Habit**:
Something you have decided to do daily and are tracking.
_Avoid_: goal, task, routine, activity.

**Tick**:
The single tap that records a Habit as done for a Day. Binary — there is no quantity, note or rating. Tick is the counted noun and the app says it wherever it labels a number: "41 ticks". Tap is the spoken verb and the app says it wherever it asks for the act: "tap a square".
_Avoid_: check-in, log, entry, completion.

**Day**:
A local calendar date, midnight to midnight, resolved at the moment of the Tick and never recomputed. The span one Square covers.
_Avoid_: date, session, period.

**Grace Window**:
The span after a Day closes during which its Squares can still be Ticked — currently one Day. Yesterday is open; the day before is closed permanently.
_Avoid_: backfill, retroactive edit, catch-up.

**Day Record**:
The permanent record of one Day: which Habits were Active and which were Ticked. Never rewritten once the Grace Window closes.
_Avoid_: entry, log, snapshot.

**Active Habit**:
A Habit that existed and was not Archived on a given Day. Only Active Habits count toward that Day's Intensity.
_Avoid_: enabled, current, live.

**Archive**:
Retiring a Habit from today forward. History is untouched — Days on which it was Active still count it. There is no way to remove a Habit from the past.
_Avoid_: delete, remove, disable, pause, hide.

### Display

**Heatmap**:
A Frame of Squares, one per Day. How long the Frame is, is the Lens.
_Avoid_: graph, calendar, grid, contribution graph.

**Square**:
One Day's cell in a Heatmap.
_Avoid_: cell, tile, box, dot, pixel.

**Lens**:
How much of the record a Heatmap draws: the Week, the Month or the Year. A Lens
changes how many Squares are drawn, and therefore how large they are. It never
changes what a Square means — one Square is one Day under every Lens — and it
never changes the Total, which is always the Year's.
_Avoid_: view, range, period, zoom, filter.

**Frame**:
The run of Days a Lens draws, and a fixed shape: the Week is always seven
Squares, Sunday to Saturday; the Month is always the whole month; the Year is
always 365 Squares ending today. Every Day in the Frame is drawn, including Days
still to come and Days from before the account existed — all of them at
Intensity 0, which is also what a Day you missed draws at. A Frame is a calendar
and does not shrink to fit what you did with it.
_Avoid_: window, span, range, view.

**Overview Heatmap**:
The Heatmap across all Habits. Each Square is shaded by Intensity.
_Avoid_: combined, merged, master, dashboard.

**Habit Heatmap**:
The Heatmap for a single Habit. Each Square is binary — Ticked or not.
_Avoid_: individual, detail view.

**Intensity**:
The shade of a Square on the Overview Heatmap, derived from the proportion of that Day's Active Habits that were Ticked. A full-shade Square always means a complete Day, whatever the Habit count was at the time.
_Avoid_: level, heat, score, completion rate.

**Chain**:
Strictly consecutive Days on which a Habit was Ticked. Belongs to a single Habit — there is no Chain across Habits, and a Chain is never forgiven or repaired.
_Avoid_: streak, run, combo.

**Chained Habit**:
A Habit whose Chain the user has explicitly opted into seeing. Habits are unchained by default — an unchained Habit is Ticked and counts toward Intensity and Total exactly like any other, it is simply never shown a consecutive-Day count.
_Avoid_: streak habit, tracked habit, untracked habit.

**Total**:
The number of Ticks across all Habits in the last year, shown on the Overview Heatmap. Only ever rises; nothing can break it.
_Avoid_: score, points, streak, contributions.

**Theme**:
Which of the two palettes the app draws itself in — the Dark one it was designed in, or the Light port. The user's choice is System, Light or Dark, and System means dark unless the device asks for light. It is a property of the app, not of the record: no Day, Tick or Share Card changes with it, and a Share Card is always Dark.
_Avoid_: mode, appearance, skin, night mode.

### Keeping

**Export**:
The whole record written out as a file and handed to the device — the only copy that survives this app's storage being cleared. How the file leaves is the platform's business, not the user's: the app asks the device to take it and the device decides whether that is a download or a share sheet.
_Avoid_: backup, download, save, dump.

### Sharing

**Share Card**:
A PNG of the Overview Heatmap and its Total, rendered on the device and saved to it. There is no hosted page and no link between users.
_Avoid_: badge, profile, screenshot, story.

**Named Habit**:
A Habit whose name the user has explicitly opted into showing on the Share Card. Habits are unnamed there by default — a Share Card carries no Habit names unless each one was individually opted in.
_Avoid_: public habit, shared habit, visible habit.
