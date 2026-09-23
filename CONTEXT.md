# Habit Heatmap

Habit Heatmap is a single-user habit tracker. You Log each Habit once a Day
with one tap, each tap fills a Square, and the Squares add up to a year.

This file is the glossary. Each concept gets exactly one name, and the code uses
these names verbatim.

## Language

### Tracking

**Habit**:
Something the user has decided to do every Day, and that the app tracks.
_Avoid_: goal, task, routine, activity.

**Log**:
The single tap that marks a Habit as done for a Day. A Log is binary: no
quantity, no note, no rating. "Log" is both a noun and a verb, as in "41 logs"
or "log today".
_Avoid_: tick, tap, check-in, entry, completion.

**Day**:
A local calendar date, midnight to midnight. One Square is one Day. The Day is
fixed at the moment of the Log and never recalculated.

Only today can be Logged. A Day closes at local midnight, and after that
nothing can change it.
_Avoid_: date, session, period.

**Day Record**:
The permanent data for one Day: which Habits were Logged on it. It's sealed at
local midnight and never written to again.
_Avoid_: entry, log, snapshot.

**Span**:
An unbroken run of Days during which a Habit was Active. A Span starts on the
Day the Habit was created and ends on the Day it was Hidden. The latest Span
stays open while the Habit is Active.

Unhiding a Habit starts a new Span rather than extending the old one, so the
gap between them is permanent.
_Avoid_: active span, period, interval, lifetime, stint.

**Active Habit**:
A Habit that falls inside one of its Spans on a given Day, meaning the user was
tracking it that Day.

Being Active on a Day isn't enough to affect that Day's Intensity; the Habit
also has to be visible now.
_Avoid_: enabled, current, live.

**Hide**:
Taking a Habit out of the app. Once Hidden:

- The Habit is no longer Active.
- It can't be Logged.
- It sends no Reminder.
- It and all its data drop out of the Overview Heatmap, and the Squares it
  contributed to are re-shaded.

Hide is reversible, not a delete. Every Log of a Hidden Habit is kept, and the
user can find the Habit and unhide it, at which point its Squares come back.

The Days it spent Hidden don't come back, though. That gap is permanent.
_Avoid_: archive, delete, remove, disable, pause.

**Hidden Habit**:
A Habit that is currently Hidden. It doesn't appear on Home, in the Overview
Heatmap or on any Share Card. It only shows up in the list of Hidden Habits and
on its own read-only Screen, and it can't be Logged.
_Avoid_: archived habit, inactive habit, deleted habit.

### Reminding

**Daily Reminder**:
One notification a Day, at a time the user picks, prompting them to do that
Day's Logs.

It's off until the user turns it on. The app offers it once, when the user
creates their first Habit, because a missed Day can't be recovered.

It fires on every Day that has an Active Habit, even if everything has already
been Logged. See ADR 0012.

Its text never changes: it doesn't name a Habit or count what's left. That's
what separates it from a Reminded Habit.

Reminders belong to the device, not the data. An Export doesn't include them,
so moving your data to a new phone leaves that phone with no Reminders.
Reminders never use the network.
_Avoid_: nudge, alert, alarm, push, ping.

**Reminded Habit**:
A Habit with its own Reminder at its own time. It's opt-in per Habit; by
default a Habit has no Reminder.

The Reminder is skipped if that Habit has already been Logged, and never sent
while the Habit is Hidden, since a Hidden Habit can't be Logged.

The Daily Reminder is about the Day; a Reminded Habit is about one Habit. They're
separate, and the user can have both on.
_Avoid_: habit alarm, per-habit reminder, streak reminder.

### Display

**Heatmap**:
A Frame of Squares, one per Day. The Lens sets how long the Frame is.

On a Screen, the Heatmap is labelled at its edges: Monday, Wednesday and Friday
down the side, and the Frame's months (or the single month's name) along the
top. Share Cards have no labels.
_Avoid_: graph, calendar, grid, contribution graph.

**Square**:
The cell for one Day in a Heatmap.
_Avoid_: cell, tile, box, dot, pixel.

**Lens**:
How much data a Heatmap shows: the Week, the Month or the Year.

The Lens sets the number of Squares, their size, and the Heatmap's shape. The
Month and Year are calendar blocks with weekday rows; the Week is a single
Sunday-to-Saturday row.

The Week and Month fit on screen. The Year doesn't, so it keeps its Square size,
scrolls sideways, and opens at today.

The Lens never changes what a Square means (one Square is always one Day), and
it never changes the Total, which always covers the Year.

A Share Card has its own Lens, chosen when the card is made, and shows a Tally
instead of the Total.
_Avoid_: view, range, period, zoom, filter.

**Frame**:
The set of Days a Lens draws. A Frame always has the same shape:

- The Week is always seven Squares, Sunday to Saturday.
- The Month is always the whole month.
- The Year is always the 365 Squares ending today.

Every Day in the Frame is drawn, including future Days and Days before the app
was installed. Those are drawn at Intensity 0, which is also what a missed Day
looks like.

A Frame is a calendar, and it never shrinks to fit the data, whether on a Screen
or on a Share Card.

When a Frame extends past today, today gets a ring. Without it, a missed Day and
a future Day would look the same.
_Avoid_: window, span, range, view.

**Overview Heatmap**:
The Heatmap covering every Habit that isn't Hidden. Each Square has an
Intensity.

It reflects the data as it stands today, not as it was when each Day was sealed.
Hiding a Habit re-shades its Squares, and unhiding it restores the old shading.
_Avoid_: combined, merged, master, dashboard.

**Habit Heatmap**:
The Heatmap for a single Habit. Each Square is binary: Logged or not. A Hidden
Habit still has one, on its own Screen.
_Avoid_: individual, detail view.

**Intensity**:
How shaded a Square is in the Overview Heatmap: the share of that Day's counted
Habits that were Logged.

A Habit counts toward a Day only if both are true:

- It was Active on that Day.
- It isn't Hidden now.

So a fully shaded Square always means a complete Day, however many Habits there
are.

A Habit created last week doesn't affect the Intensity of earlier Days, because
it wasn't Active then.
_Avoid_: level, heat, score, completion rate.

**Streak**:
How many consecutive Days a Habit has been Logged. Streaks are per Habit; there's
no Streak across Habits. The app never repairs a Streak.

A Streak breaks on a missed Day, and today isn't missed until it's over. So at
one minute past midnight, with nothing Logged yet, the Streak keeps its value.
_Avoid_: chain, run, combo.

**Streak Habit**:
A Habit that displays its Streak. It's opt-in per Habit; by default the Streak
is hidden.

Otherwise a Streak Habit is like any other Habit: it's Logged the same way and
counts toward Intensity and the Total. The only difference is whether the number
is shown.

The Streak is always being calculated, so turning it on shows the Habit's
current Streak rather than starting from zero.

A Hidden Habit never shows a Streak. Streaks count back from today, and a Hidden
Habit can't be Logged today, so the value would always be 0.
_Avoid_: chained habit, streaked habit, tracked habit.

**Longest Streak**:
The highest a Habit's Streak has ever been. It can never go down, which makes it
the one number a Hidden Habit can still meaningfully show.
_Avoid_: record, best, personal best, high score.

**Total**:
The number of Logs over the past year across every Habit that isn't Hidden. It's
shown with the Overview Heatmap.

Each Log adds to it, and only hiding a Habit takes away from it. That keeps the
Total consistent with the Squares below it.

The Lens doesn't affect the Total; it always covers the Year. A weekly Total
would drop to zero every Sunday.
_Avoid_: score, points, streak, contributions.

**Tally**:
The number of Logs inside the Frame being drawn. Share Cards show a Tally.

Unlike the Total, a Tally isn't always for the Year. It can be small or zero,
and it changes as the Frame moves. Home never shows a Tally.
_Avoid_: total, score, count, subtotal.

**Theme**:
The app's colour scheme: the Dark Theme or the Light Theme. The user picks
System, Light or Dark; System means Dark unless the device asks for Light.

The Theme belongs to the app, not the data, and it never changes a Day, a Log
or a Share Card. Share Cards are always Dark.
_Avoid_: mode, appearance, skin, night mode.

### Keeping

**Export**:
Writing all the data to a file and handing that file to the device. It's the
only copy that survives if the app's storage is cleared, and the only way to get
data out of the app, since the app never deletes anything.

How the file leaves is up to the device: the app hands it over, and the device
either downloads it or opens a share sheet.
_Avoid_: backup, download, save, dump.

**Import**:
Reading an Export file. Import replaces everything on the device with the
file's contents. It never merges, and nothing combines data from two devices.

If the device already has any Habits or Logs, Import asks for confirmation. It
can't be undone.

To move to a new device, Export on the old one and Import on the new one. The
move is one-way: once you've Exported, stop using the old device, because any
Log made there afterwards can't be carried over. Import always replaces, never
combines.

Import doesn't bring Reminders with it, since those belong to the device, not
the data. After an Import, the app clears any Reminder that doesn't match a
Habit in the new data.
_Avoid_: load, restore, sync, merge, transfer, migrate, backup.

### Sharing

**Share Card**:
An image drawn on the device, saved there, and then shared by the user if they
choose. There are two kinds: the Overview Card and the Habit Card.

Each Share Card has its own Lens, chosen when the card is made, and draws that
Lens's full Frame. For example, a Week card made on a Wednesday shows all seven
Days.

A Share Card shows a Tally rather than the Total, and always uses the Dark
Theme.

Share Cards have no web page, and there's no link between users. No Share Card
can show a Hidden Habit (see Hidden Habit).
_Avoid_: badge, profile, screenshot, story.

**Overview Card**:
The Share Card that draws the Overview Heatmap and its Tally for every Habit
that isn't Hidden. It always lists all of those Habits' names; there's no way to
make one without them (ADR 0010). The only way to keep a Habit off an Overview
Card is to Hide it.

It shows just the combined shape, one Tally and the names. No Streak, no Longest
Streak, and no per-Habit Log count.
_Avoid_: the card, share card (when a Habit Card is also possible).

**Habit Card**:
The Share Card for a single Habit's Heatmap. It shows the same binary Squares as
that Habit's Screen, plus its Tally and its name. The name is always shown,
since the card is about that Habit (ADR 0011).

It shows a Streak only for a Streak Habit, matching the Habit's Screen. Like the
Overview Card, it never shows the Longest Streak or a Log count.
_Avoid_: individual card, per-habit card.

**Named Habit**:
A Habit whose Reminder is allowed to show its name on the lock screen. It's
opt-in per Habit; by default a Habit's Reminder doesn't show the name.

It's off by default because a Reminder arrives at a fixed time, when other people
may be around. Unlike making a Share Card, the user doesn't choose that moment
(ADR 0010). This setting has no effect on Share Cards, which always show the
names of the Habits they draw.

A Hidden Habit sends no Reminder, so its name never reaches the lock screen and
the setting does nothing.
_Avoid_: public habit, shared habit, visible habit, name on share card.
