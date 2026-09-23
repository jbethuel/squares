# The Daily Reminder always fires; a Reminded Habit still goes quiet

The Daily Reminder now fires on every Day with an Active Habit, whether or not
everything has already been Logged. Its text is now fixed, "log your habits". It
no longer counts what's left, and it never named a Habit (ADR 0008). Reminded
Habits haven't changed: each one still goes quiet once its Habit is Logged, and
still names the Habit only if it's a Named Habit.

This narrows a decision ADR 0008 made for both Reminders at once. `outstandingOn`
was "the whole of both silence rules", so a Day with nothing outstanding sent
neither Reminder. That suited the Reminded Habit, which is about one Habit and
has nothing to say once it's Logged. It suited the Daily Reminder badly. A
check-in you can't count on seeing at the same time every Day isn't much of a
check-in, and the one Day it went silent was the Day everything was done, which
is exactly when a user who half-remembers Logging might want the nudge to open
the app and check.

Counting outstanding Habits also made the Daily Reminder clash with a Reminded
Habit's fallback text. Both said "1 Habit left" when there was exactly one, so
a user with both turned on couldn't tell which had fired without opening the
app. That's the opposite of what "the Daily Reminder is about the Day; a
Reminded Habit is about one Habit" (`CONTEXT.md`) is supposed to guarantee.

## Consequences

`outstandingOn` keeps its doc comment but no longer claims to drive "both
silence rules". It now drives only the Reminded Habit's.

The Daily Reminder still doesn't fire on a Day with no Active Habit at all (no
Habits yet, or every Habit Hidden), since there's nothing to check in about.
That check is `activeOn`, not `outstandingOn`, and it doesn't look at whether
anything has been Logged.

`CONTEXT.md`'s Daily Reminder entry no longer says the Reminder is withheld once
every Habit is Logged.
