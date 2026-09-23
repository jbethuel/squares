# A Habit Card is still a Share Card, so Hide keeps it off too

There are now two kinds of Share Card: the Overview Card (the original, which
draws every visible Habit at once) and the Habit Card (new, which draws one
Habit's Heatmap, its Tally and its name, and is made from that Habit's Screen).

Sharing a single Habit reopened a question ADR 0010 had settled for the Overview
Card: what can Hide keep off a card? A Hidden Habit's Heatmap is still shown on
its own Screen, but that's for the user alone. A Habit Card exists to leave the
device. Hide has promised from the start that a Habit is "not on Home, not in the
Overview, not on a Share Card" (see Hidden Habit in `CONTEXT.md`). A second kind
of Share Card is still a Share Card, and making an exception the first time a
second kind appears is exactly the kind of erosion Hide is meant to prevent. So
the Habit Card sits inside the same `hidden ? null : …` guard as the Habit's
other toggles, and hiding a Habit removes its "make a share card" row along with
everything else that no longer applies.

This is a deliberate asymmetry with Export, not an oversight. Export carries a
Hidden Habit's full history, because Export exists to survive a reinstall and
Hide isn't a delete (see Hide in `CONTEXT.md`). A Share Card isn't a backup; it's
something you show to someone else, which is exactly what Hide turns off.

## Consequences

A Habit Card follows the Overview Card's minimalism rather than the Habit's
Screen: the shape, the Tally and the Habit's name. The name is always shown, per
ADR 0010, since a Habit Card that hid its own subject would be pointless. The
Streak appears only for a Streak Habit, matching the Habit's Screen. Longest
Streak and the raw Log count stay off, as they do on the Overview Card.

The entry point is on the Habit's Screen, directly below "count a streak",
because that row decides whether the card below it shows a Streak. It's there
whether or not the Habit is a Streak Habit; only Hide removes it.
