# Share Cards always name their Habits; Reminder naming stays opt-in

A Share Card now names every Habit that isn't Hidden. There's no longer a
per-Habit setting for whether a name appears on the card. Hide is the only way
to keep a Habit off, and hiding it already removes it from the Overview Heatmap
the card is drawn from.

This splits a decision ADR 0008 made on purpose. One flag, Named Habit,
controlled both the Share Card and the Reminder, because both let a name leave
the app. Now they're separate. The Reminder keeps its opt-in, since ADR 0008's
reasoning still holds there: a lock-screen notification appears in front of
whoever's in the room, while a Share Card is composed and sent deliberately. The
Share Card drops its opt-in because a card showing only a shape and a number,
with the names withheld, fails at the one thing a Share Card is for: telling
people what the picture is of.

Named Habit stays as a term, narrowed to what it still does: control the
Reminder. Existing values weren't carried over into the narrower meaning. Every
Habit's Reminder naming was reset to off when this shipped, so that a `true` set
under the old, broader meaning couldn't quietly opt a Habit into the riskier
case the user never explicitly agreed to.

## Consequences

`CONTEXT.md`'s Share Card entry now says the card always names every visible
Habit, and Named Habit refers to the Reminder only. Anyone who assumes the two
go together, as ADR 0008 describes, needs this ADR to know they were split on
purpose.

The Share Card screen's "no habit names on this card, a year of shape and one
number" message and its per-Habit "tap a name to stop naming it" control no
longer apply, since they described the opt-in this ADR removes.
