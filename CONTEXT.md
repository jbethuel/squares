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
A Habit inside one of its Active Spans on a given Day. Only Active Habits count toward that Day's Intensity.
_Avoid_: enabled, current, live.

**Active Span**:
An unbroken run of Days from the Day a Habit was taken up to the Day it was Archived — the last Span left open while the Habit is still going. A Habit taken out of the Archive opens a new Span rather than extending the old one, so a Habit that was retired and later taken up again carries a gap in the middle that nothing can close.
_Avoid_: period, interval, lifetime, stint.

**Archive**:
Retiring a Habit from today forward. History is untouched — Days on which it was Active still count it. There is no way to remove a Habit from the past.

Archiving is a state, not an act: a Habit can be taken out of the Archive again, and is then Active from that Day forward. The Days it spent Archived stay Archived forever — coming back is never backdated, and the gap it leaves is as permanent as any other part of the record.
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
changes how many Squares are drawn, how large they are, and what shape they are
drawn in — the Month and the Year are calendar blocks of weekday rows, the Week
is a single row running Sunday to Saturday. It never changes what a Square means
— one Square is one Day under every Lens — and it never changes the Total, which
is always the Year's. A Share Card has a Lens of its own, chosen where the card
is made, and shows a Tally rather than the Total.
_Avoid_: view, range, period, zoom, filter.

**Frame**:
The run of Days a Lens draws, and a fixed shape: the Week is always seven
Squares, Sunday to Saturday; the Month is always the whole month; the Year is
always 365 Squares ending today. Every Day in the Frame is drawn, including Days
still to come and Days from before the account existed — all of them at
Intensity 0, which is also what a Day you missed draws at. A Frame is a calendar
and does not shrink to fit what you did with it. This holds on a Share Card as
much as on a Screen: wherever a Frame runs past today, today is ringed, because
otherwise a Day you missed and a Day that has not happened are the same empty
Square.
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
A Habit whose Chain the user has explicitly opted into seeing. Habits are unchained by default — an unchained Habit is Ticked and counts toward Intensity and Total exactly like any other, it is simply never shown a consecutive-Day count. An Archived Habit is shown no Chain either: a Chain counts back from today, and a Habit that cannot be Ticked today would read 0 forever.
_Avoid_: streak habit, tracked habit, untracked habit.

**Total**:
The number of Ticks across all Habits in the last year, shown on the Overview Heatmap. Only ever rises; nothing can break it. The Lens never changes it — a Total scoped to the week would fall to zero every Sunday, and nothing that can go to zero is on Home.
_Avoid_: score, points, streak, contributions.

**Tally**:
The number of Ticks inside the Frame that is drawn. A Share Card carries one, because a card of a single Week over a number counting the Year is a card nobody can read. Unlike the Total a Tally is not the Year's, can be small or zero, and falls as the Frame moves — which is why it is a different word and never appears on Home.
_Avoid_: total, score, count, subtotal.

**Theme**:
Which of the two palettes the app draws itself in — the Dark one it was designed in, or the Light port. The user's choice is System, Light or Dark, and System means dark unless the device asks for light. It is a property of the app, not of the record: no Day, Tick or Share Card changes with it, and a Share Card is always Dark.
_Avoid_: mode, appearance, skin, night mode.

### Keeping

**Export**:
The whole record written out as a file and handed to the device — the only copy that survives this app's storage being cleared. How the file leaves is the platform's business, not the user's: the app asks the device to take it and the device decides whether that is a download or a share sheet.
_Avoid_: backup, download, save, dump.

### Sharing

**Share Card**:
A PNG of the Overview Heatmap and its Tally, rendered on the device and saved to it. It is drawn at a Lens of its own, picked where the card is made, and it draws that Lens's whole Frame — a Week card made on a Wednesday still shows all seven Days, or it would not read as a week. There is no hosted page and no link between users.
_Avoid_: badge, profile, screenshot, story.

**Named Habit**:
A Habit whose name the user has explicitly opted into showing on the Share Card. Habits are unnamed there by default — a Share Card carries no Habit names unless each one was individually opted in. An Archived Habit is never named on a Card whatever its opt-in says: a name on a Card reads as something the user does, and a retired Habit is not that.
_Avoid_: public habit, shared habit, visible habit.
