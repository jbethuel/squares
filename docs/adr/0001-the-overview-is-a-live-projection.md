# The Overview Heatmap is a live projection of the visible Habits

The Overview Heatmap is computed from whichever Habits aren't Hidden right now.

A Day Record stores only the Logs, not which Habits existed that Day. That set
is worked out at read time from the Spans of the Habits currently on Home.

Hiding a Habit re-shades every Square it touched, and unhiding it restores the
old shading.

This is what makes "Hide" honest. If you take a Habit out of the app, it should
be gone from the app, including from past Days.

## Considered options

**Store the set of Habits for each Day.** Each Day Record would hold two sets:
the Habits that were Active and the Habits that were Logged. A Square's
Intensity would then be fixed once the Day is sealed.

That makes a better record. The Heatmap becomes data rather than a view, and
nothing can later change a past Square.

We rejected it because it makes Hide impossible. With a stored set, Hide would
take a Habit off Home but leave its data in the Overview Heatmap. The Squares
would disagree with the Habits listed above them, and the user would have no
way to make sense of it.

The workaround would be two controls, one to stop a Habit and one to conceal it,
giving four states per Habit. That's too much for an app that needs to stay
simple, so we rejected it too.

**Delete a Habit's Logs when it's Hidden.** This looks the same on screen but
destroys data. We rejected it: Hide is meant to be toggled back and forth, and
you can't do that with something destructive.

## Consequences

The Total drops when a Habit is Hidden. It counts the Logs of visible Habits,
so a Hidden Habit's Logs fall out of it. A number under a Heatmap has to agree
with the Heatmap.

You can't reproduce an old Share Card after a Hide. A card made on Tuesday will
differ from one made on Wednesday if a Habit was Hidden in between. The card is
just a PNG on the device, so it stays correct as a snapshot, but it no longer
matches the app.

Hide affects today as well as the past. Log a Habit in the morning, Hide it in
the afternoon, and today's Square is re-shaded immediately.

Spans become necessary. They're the only data that says a Habit wasn't Active on
a given Day. Without them, every visible Habit would count for every Day, and
adding a Habit would change the Intensity of all earlier Days. See ADR 0003.

There's no stored set to check the computed one against, so a bug in the Span
logic silently changes every past Square, and no test fixture will catch it.
The Span logic needs the most tests in `packages/domain`.
