# Share Card naming is unconditional; Reminder naming stays opt-in

A Share Card now names every Habit that is not Hidden, always. There is no
per-Habit control over whether a name appears on the card anymore — Hide is
the only lever, and Hiding a Habit already removes it from the Overview
Heatmap the card draws from.

This splits a decision ADR 0008 made on purpose: one flag, Named Habit, gated
both the Share Card and the Reminder, because both let a name leave the app.
The two no longer share a control. The Reminder keeps its opt-in — ADR 0008's
reasoning still holds there: a lock screen "arrives... in front of any person
in the room," a risk a Share Card doesn't carry, since the user composes and
sends a card deliberately. The Share Card drops its opt-in because a card
that shows only shape and a number, with the names withheld, under-serves
what a Share Card is for: telling someone what the picture is of.

Named Habit survives as a term, narrowed to only what it still does — gate
the Reminder. Existing values were not carried forward into that narrower
meaning: every Habit's Reminder-naming reset to off when this shipped, so a
`true` set under the old, broader meaning could not silently opt a Habit into
the riskier surface it was never explicitly consented to for.

## Consequences

`CONTEXT.md`'s Share Card entry now says the card always names every visible
Habit; Named Habit now refers to the Reminder alone. A reader who assumes the
two travel together, the way ADR 0008 describes, needs this ADR to know they
were deliberately split.

The Share Card screen's "no habit names on this card, a year of shape and one
number" message and its per-Habit "tap a name to stop naming it" affordance
no longer apply — they described the opt-in this ADR removes.
