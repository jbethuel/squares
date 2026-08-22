# Habit Heatmap

Habit Heatmap is a habit tracker for one user. The user records each Habit once
each Day with one tap. Each tap fills one Square. The Squares make a year of
data.

This document is the glossary. It gives one name to each concept. The code uses
these names without change.

## Language

### Tracking

**Habit**:
A thing that the user decided to do each Day. The app tracks the Habit.
_Avoid_: goal, task, routine, activity.

**Log**:
The single tap that records a Habit as done for a Day. A Log is binary. A Log
has no quantity, no note and no rating. The app uses "Log" as a noun and as a
verb. Examples: "41 logs", "log today".
_Avoid_: tick, tap, check-in, entry, completion.

**Day**:
A local calendar date from midnight to midnight. One Square shows one Day. The
app finds the Day at the time of the Log. The app does not calculate that Day
again.

The user can Log only today. The Day closes at local midnight. After the Day
closes, no operation can change it.
_Avoid_: date, session, period.

**Day Record**:
The permanent data for one Day. A Day Record contains the Habits that the user
Logged on that Day. The app seals the Day Record at local midnight. After that,
the app does not write to the Day Record again.
_Avoid_: entry, log, snapshot.

**Span**:
A continuous set of Days when a Habit was Active. A Span starts on the Day when
the user made the Habit. A Span ends on the Day when the user Hid the Habit. The
last Span stays open while the Habit is Active.

If the user shows a Hidden Habit again, the app makes a new Span. The app does
not extend the old Span. Thus a gap stays between the two Spans. No operation
can remove that gap.
_Avoid_: active span, period, interval, lifetime, stint.

**Active Habit**:
A Habit that is inside one of its Spans on a given Day. An Active Habit shows
that the user tracked that Habit on that Day.

An Active Habit does not always change the Intensity of that Day. The Habit must
also be visible now.
_Avoid_: enabled, current, live.

**Hide**:
The operation that removes a Habit from the app. After the operation:

- The Habit is not Active.
- The user cannot Log the Habit.
- The app does not send a Reminder for the Habit.
- The Habit and all its data leave the Overview Heatmap. The Squares that the
  Habit changed get a new Intensity.

Hide is a state and not a permanent operation. The app keeps all the Logs of a
Hidden Habit. The user can find the Habit and show it again. Then the Squares of
that Habit come back.

The app does not give back the Days when the Habit was Hidden. That gap is
permanent.
_Avoid_: archive, delete, remove, disable, pause.

**Hidden Habit**:
A Habit that is in the Hide state. A Hidden Habit is not on Home, not in the
Overview Heatmap and not on a Share Card. The app shows a Hidden Habit only in
the list of Hidden Habits, and on a Screen that the user can read. The user
cannot Log a Hidden Habit.
_Avoid_: archived habit, inactive habit, deleted habit.

### Reminding

**Daily Reminder**:
One notification each Day at a time that the user selects. The Daily Reminder
tells the user to make the Logs for that Day.

The Daily Reminder is off until the user turns it on. The app asks the user one
time, when the user makes the first Habit. The app asks because the user cannot
recover a Day that the user missed.

The app does not send the Daily Reminder if the user Logged all Habits for that
Day.

A Reminder is a property of the device and not of the data. An Export does not
contain a Reminder. If the user moves the data to a different phone, that phone
has no Reminder. A Reminder does not use the network.
_Avoid_: nudge, alert, alarm, push, ping.

**Reminded Habit**:
A Habit that has its own Reminder at its own time. The user must select this for
each Habit. A Habit has no Reminder by default.

The app does not send the Reminder if the user Logged that Habit. The app does
not send the Reminder while the Habit is Hidden, because the user cannot Log a
Hidden Habit.

The Daily Reminder is for one Day. A Reminded Habit is for one Habit. The two
are different, and the user can turn on both.
_Avoid_: habit alarm, per-habit reminder, streak reminder.

### Display

**Heatmap**:
A Frame of Squares with one Square for each Day. The Lens gives the length of
the Frame.

On a Screen, the app puts names at the edges of the Heatmap. At the side, the
app puts Monday, Wednesday and Friday. Above, the app puts the months of the
Frame, or the name of the one month. A Share Card has no such names.
_Avoid_: graph, calendar, grid, contribution graph.

**Square**:
The cell for one Day in a Heatmap.
_Avoid_: cell, tile, box, dot, pixel.

**Lens**:
The quantity of data that a Heatmap draws. The Lens is the Week, the Month or
the Year.

The Lens changes the number of Squares, the size of the Squares and the shape of
the Heatmap. The Month and the Year are calendar blocks with rows of weekdays.
The Week is one row from Sunday to Saturday.

The Week and the Month fit on the Screen. The Year does not fit. The Year keeps
the size of its Squares and moves off the side of the Screen. The Year opens at
today.

The Lens does not change the sense of a Square. One Square is one Day for all
three values of the Lens. The Lens does not change the Total, which is always
for the Year.

A Share Card has its own Lens. The user selects that Lens when the user makes
the Share Card. A Share Card shows a Tally and not the Total.
_Avoid_: view, range, period, zoom, filter.

**Frame**:
The set of Days that a Lens draws. A Frame has a constant shape:

- The Week is always seven Squares, from Sunday to Saturday.
- The Month is always the full month.
- The Year is always 365 Squares that end on today.

The app draws all the Days in the Frame. This includes Days in the future and
Days before the user installed the app. The app draws these Days at Intensity 0.
A Day that the user missed also has Intensity 0.

A Frame is a calendar. The app does not make the Frame smaller to fit the data.
This is true on a Share Card and on a Screen.

If a Frame goes past today, the app puts a ring around today. Without the ring,
a Day that the user missed and a Day in the future look the same.
_Avoid_: window, span, range, view.

**Overview Heatmap**:
The Heatmap for all the Habits that are not Hidden. Each Square has an
Intensity.

The Overview Heatmap shows the data as it is today. It does not show the data as
the app sealed it. If the user Hides a Habit, the Squares of that Habit get a
new Intensity. If the user shows the Habit again, the old Intensity comes back.
_Avoid_: combined, merged, master, dashboard.

**Habit Heatmap**:
The Heatmap for one Habit. Each Square is binary: the user Logged the Habit, or
the user did not Log the Habit. A Hidden Habit also has a Habit Heatmap on its
own Screen.
_Avoid_: individual, detail view.

**Intensity**:
The shade of a Square in the Overview Heatmap. The Intensity is the ratio of the
Habits that the user Logged on that Day to the Habits that the app counts for
that Day.

The app counts a Habit for a Day only if both conditions are true:

- The Habit was Active on that Day.
- The Habit is not Hidden now.

A Square at full shade always shows a complete Day. This is true for any number
of Habits.

A Habit that the user made last week does not change the Intensity of earlier
Days, because that Habit was not Active on those Days.
_Avoid_: level, heat, score, completion rate.

**Streak**:
The number of continuous Days when the user Logged a Habit. A Streak is for one
Habit. There is no Streak for a group of Habits. The app does not repair a
Streak.

A Streak stops when the user misses a Day. Today is not a missed Day until today
ends. Thus one minute after midnight, with no Log, the Streak keeps its value.
_Avoid_: chain, run, combo.

**Streak Habit**:
A Habit that shows its Streak. The user must select this for each Habit. A Habit
does not show its Streak by default.

A Habit that does not show its Streak is the same as any other Habit. The user
Logs it, and it changes the Intensity and the Total. The app only does not show
the number.

The app always calculates the Streak. If the user turns this on, the app shows
the Streak that the Habit has now. The app does not start at zero.

A Hidden Habit does not show a Streak. A Streak counts back from today, and the
user cannot Log a Hidden Habit today. Thus the value would always be 0.
_Avoid_: chained habit, streaked habit, tracked habit.

**Longest Streak**:
The largest value that a Streak of a Habit had. The Longest Streak cannot
decrease. Thus it is the one number that a Hidden Habit can show.
_Avoid_: record, best, personal best, high score.

**Total**:
The number of Logs in the last year for all the Habits that are not Hidden. The
app shows the Total with the Overview Heatmap.

The Total increases with each Log. The Total decreases only when the user Hides
a Habit. This keeps the Total in agreement with the Squares below it.

The Lens does not change the Total. The Total is always for the Year. A Total
for the Week would go to zero each Sunday.
_Avoid_: score, points, streak, contributions.

**Tally**:
The number of Logs inside the Frame that the app draws. A Share Card shows a
Tally.

A Tally is not always for the Year. A Tally can be small or zero, and it changes
when the Frame moves. The app does not show a Tally on Home.
_Avoid_: total, score, count, subtotal.

**Theme**:
The set of colours that the app uses. There are two: the Dark Theme and the
Light Theme. The user selects System, Light or Dark. System gives the Dark Theme
unless the device asks for the Light Theme.

The Theme is a property of the app and not of the data. The Theme does not
change a Day, a Log or a Share Card. A Share Card always uses the Dark Theme.
_Avoid_: mode, appearance, skin, night mode.

### Keeping

**Export**:
The operation that writes all the data to a file and gives the file to the
device. The file is the only copy that stays if the storage of the app is
cleared. It is also the only way to move the data out of the app, because the
app deletes no data.

The device controls how the file leaves. The app gives the file to the device.
The device then makes a download or opens a share sheet.
_Avoid_: backup, download, save, dump.

### Sharing

**Share Card**:
A PNG image of the Overview Heatmap and its Tally. The app draws the image on
the device and saves it to the device.

A Share Card has its own Lens, which the user selects when the user makes the
card. The card draws the full Frame of that Lens. Example: a Week card that the
user makes on a Wednesday shows all seven Days.

There is no web page for a Share Card, and there is no link between users.
_Avoid_: badge, profile, screenshot, story.

**Named Habit**:
A Habit that can show its name outside the app. The name can go on a Share Card,
and on the lock screen with the Reminder of a Reminded Habit.

The user must select this for each Habit. A Habit does not show its name by
default. A Share Card shows no Habit names unless the user selected each name. A
Reminder for a Habit without a name says "1 Habit left".

One selection controls both places, because both do the same thing: they let
another person read the name.

A Hidden Habit is on no Share Card, because a Hidden Habit is not in the
Overview Heatmap.
_Avoid_: public habit, shared habit, visible habit.
