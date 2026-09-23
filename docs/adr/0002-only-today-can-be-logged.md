# Only today can be Logged

A Log always goes on today; you can't Log any other Day. A Day closes at local
midnight, and nothing can change it after that.

You can undo today's Log until midnight, since today isn't a permanent record
yet.

The whole app rests on a year you fill in by hand. That year means something
only because you can't go back and fill it in later. If you could Log earlier
Days, every empty Square would become a chore to catch up on rather than a fact,
and the data would stop meaning anything.

## Considered options

**A one-Day grace window, so you can Log yesterday.** People will keep
suggesting this. We rejected it because one Day is the worst possible length.

It's too short to actually protect anyone: forget for two Days and the window
has already failed you. But it's long enough to make you feel protected, so you
only discover its limit when you lose data.

**A user-configurable window.** Also rejected. It would make every Heatmap mean
something different depending on the device, and a Share Card has no way to show
which window produced it.

## Consequences

A missed Day can't be recovered, which makes the Daily Reminder the only defence
against a broken Streak.

The Daily Reminder is still off by default, because the app shouldn't turn on
notifications on the user's behalf. It does offer it once, when the first Habit
is created, since protection you don't know about doesn't protect you.

If you Log late at night, you're a minute away from losing the Day. That's the
cost of this decision, and the contribution graph has the same cost.

The app must never show a Streak as broken at 00:01. A Streak breaks on a missed
Day, and today isn't missed until it's over.

So if today has been Logged, the Streak counts back from today; otherwise it
counts back from yesterday. Without this rule, the app would tell every user
they'd failed every morning.

Days are sealed by the clock, not by user actions, so the app has to notice the
date changing both while it's open and while it's in the background.
