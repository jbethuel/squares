# A Habit Card is still a Share Card — Hide stays unreachable by either kind

The Share Card now comes in two kinds: the Overview Card (the original,
drawing every visible Habit at once) and the Habit Card (new, drawing one
Habit's own Heatmap, its own Tally, and its name, reached from that Habit's
own Screen).

Extending sharing to one Habit at a time reopened a question ADR 0010 had
already settled for the Overview Card: what can Hide keep off a card. The
Habit Heatmap already renders for a Hidden Habit, on that Habit's own Screen —
that view is for the user's own eyes, on a Screen the app shows to nobody
else. A Habit Card is different in kind: it exists to leave the device. Hide's
guarantee since the original ADR is "not on Home, not in the Overview, not on
a Share Card" (see `CONTEXT.md`, Hidden Habit). A second kind of Share Card is
still a Share Card, and carving an exception into it the first time a second
kind exists would be exactly the erosion Hide is there to prevent. So a Habit
Card sits inside the same `hidden ? null : …` guard as the Habit's other
toggles: Hiding a Habit removes its own "make a share card" row along with
everything else that stops applying.

This creates a deliberate asymmetry with Export, not an oversight. Export
already carries a Hidden Habit's full history, because Export exists to
survive a re-install and Hide is not a delete (`CONTEXT.md`, Hide). A Share
Card is not a backup; it is a thing shown to somebody else, and that is
exactly the operation Hide turns off.

## Consequences

A Habit Card matches the Overview Card's minimalism rather than the Habit's
own Screen: shape, Tally, and the Habit's name — unconditional, per ADR 0010,
since a Habit Card that could hide its own subject would be pointless. Its
Streak appears only if the Habit is a Streak Habit, mirroring what that
Habit's own Screen already shows; Longest Streak and a raw Log count stay off,
the same as they stay off the Overview Card.

The entry point lives on the Habit's own Screen, directly after "count a
streak" — the row immediately above governs whether the card below it carries
a Streak at all. It is available whether or not that Habit is a Streak
Habit; only Hide removes it.
