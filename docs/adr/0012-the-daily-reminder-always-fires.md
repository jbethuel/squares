# The Daily Reminder always fires; a Reminded Habit still goes silent

The Daily Reminder now fires on every Day that has an Active Habit, whether
or not the user already Logged every Habit for that Day. Its body is now a
constant, "log your habits" — it no longer counts what is left, and never
did name a Habit (ADR 0008). A Reminded Habit is unchanged: it still goes
silent the moment its own Habit is Logged, and still names the Habit only if
that Habit is a Named Habit.

This narrows a decision ADR 0008 made about both Reminders at once:
`outstandingOn` was "the whole of both silence rules," so a Day with nothing
outstanding sent neither Reminder. That served the Reminded Habit well — it
is about one Habit, and has nothing left to say once that Habit is Logged.
It served the Daily Reminder poorly: a check-in the user cannot rely on
seeing at the same time every Day is not a check-in, and the one Day it went
quiet was the Day everything was actually done, which is exactly when a user
who half-remembers Logging might most want the prompt to open the app and
look.

The Daily Reminder counting outstanding Habits also collided with a
Reminded Habit's own fallback text: both said "1 Habit left" when there was
exactly one, so a user with both turned on could not tell which one had
fired without opening the app — the opposite of what "the Daily Reminder is
for one Day, a Reminded Habit is for one Habit" (CONTEXT.md) is supposed to
guarantee.

## Consequences

`outstandingOn` keeps its doc comment but loses the claim that it drives
"both silence rules" — it now drives only the Reminded Habit's.

The Daily Reminder still does not fire on a Day with no Active Habit at all
(no Habit exists yet, or every Habit is Hidden) — there is nothing to check
in about. That gate is `activeOn`, not `outstandingOn`: it does not look at
whether anything is Logged.

`CONTEXT.md`'s Daily Reminder entry no longer says the app withholds it once
every Habit is Logged.
