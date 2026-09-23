# A Habit holds a list of Spans, so Hide can be undone

A Habit has a list of Spans. Each Span is a pair of dates, `{from, to}`, and is
half-open: `to` is the Day the Habit was Hidden, and the Habit isn't Active on
that Day.

A Habit doesn't have a single created date and hidden date, because one pair of
dates can't describe a Habit that stopped and started again.

Hide is a toggle on the Habit's Screen, and toggles go both ways. So a Habit can
have any number of Spans, and the data has to record which Days belong to which.

## Considered options

**Move the created date forward when the Habit is unhidden.** Cheaper, and no
migration needed. We rejected it because it records a start date that's wrong:
the Habit didn't start that Day. The error stays invisible until something
other than the Active check reads the field.

**Add a third field for the date it came back.** Correct for exactly one cycle.
The second Hide overwrites the first gap, and a toggle invites more than one
cycle.

## Consequences

The set of Habits for a Day is computed from Spans (see ADR 0001). So a Span
isn't just a record of when a Habit existed; it decides the Intensity of every
past Square. A bug in a Span is a bug in the whole Heatmap.

Hide doesn't reach back in time. Days spent Hidden are Days the Habit wasn't
Active, and it doesn't get them back when unhidden. The gap stays visible in the
Habit Heatmap. That's intended, not a bug.

There's no delete. Hide is the only way to take a Habit off Home, and wiping
storage entirely is the only thing that destroys data. There's no way to remove
one Habit's data and keep the rest, which is why Export is in v1.
