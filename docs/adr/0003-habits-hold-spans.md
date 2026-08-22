# A Habit holds a list of Spans, so the user can undo Hide

A Habit contains a list of Spans. A Span is a pair of dates, `{from, to}`. The
pair is half-open: the date in `to` is the Day when the user Hid the Habit, and
the Habit is not Active on that Day.

A Habit does not contain a creation date and a hidden-on date. One pair of dates
cannot show a Habit that stopped and started again.

Hide is a control on the Screen of the Habit. A control must operate in two
directions. Thus a Habit can have any number of Spans, and the data must show
which Days belong to which Span.

## Considered options

**Move the creation date forward when the Habit comes back.** This option is
less expensive and needs no migration. We rejected it because it writes a first
Day that is not correct. The Habit did not start on that Day. The error stays
hidden until a function other than the Active test reads that field.

**Add a third field for the Day when the Habit came back.** This option is
correct for one cycle only. At the second Hide, the app writes over the first
gap. A control that operates in two directions invites more than one cycle.

## Consequences

The app calculates the set of Habits for a Day from the Spans. See ADR 0001.
Thus a Span is not only a record of when a Habit existed. A Span controls the
Intensity of each Square in the past. An error in a Span is an error in the full
Heatmap.

Hide does not move backward in time. The Days when a Habit was Hidden are Days
when the Habit was not Active. The Habit does not get those Days when it comes
back. The gap stays in the Habit Heatmap. This is correct behaviour and not a
defect.

The app has no delete operation. Hide is the only way to remove a Habit from
Home. A full erase of the storage is the only operation that destroys data. No
operation removes the data of one Habit and keeps the rest. Thus Export is in
v1.
