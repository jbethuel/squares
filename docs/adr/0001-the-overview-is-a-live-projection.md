# The Overview Heatmap is a live projection of the visible Habits

The app calculates the Overview Heatmap from the Habits that are not Hidden now.

A Day Record contains only the Logs. The app does not store the set of Habits
for a Day. The app calculates that set at read time. It uses the Spans of the
Habits that are on Home now.

If the user Hides a Habit, all the Squares of that Habit get a new Intensity. If
the user shows the Habit again, the old Intensity comes back.

This decision makes the word "Hide" correct. A Habit that the user removed from
the app must be absent from the app. This includes the Days in the past.

## Considered options

**Store the set of Habits for each Day.** In this option, each Day Record
contains two sets: the Habits that were Active, and the Habits that the user
Logged. The Intensity of a Square is then constant after the app seals the Day.

This option makes a better record. The Heatmap becomes data and not a view. No
later operation can change a Square in the past.

We rejected this option because it makes Hide impossible. With a stored set,
Hide removes a Habit from Home but keeps its data in the Overview Heatmap. The
Squares then disagree with the Habits above them, and the user cannot understand
the difference.

The alternative in that design is two controls: one control to stop a Habit and
one control to conceal it. This gives four states for each Habit. The app must
stay simple, so we rejected this also.

**Delete the Logs when the user Hides a Habit.** This option gives the same
display, but it destroys data. We rejected it. Hide is a control that the user
can operate more than one time. A control that destroys data cannot do this.

## Consequences

The Total decreases when the user Hides a Habit. The Total counts the Logs of
the visible Habits. Thus the Logs of the Hidden Habit leave the Total. A number
below a Heatmap must agree with the Heatmap.

The user cannot make the same Share Card again after a Hide. A card from Tuesday
is different from a card from Wednesday if the user Hid a Habit between the two
days. A Share Card is a PNG file on the device. The file stays correct, but it
no longer agrees with the app.

Hide changes today and also the Days in the past. If the user Logs a Habit in
the morning and Hides it in the afternoon, the Square for today gets a new
Intensity immediately.

Spans become necessary. A Span is the only data that shows that a Habit was not
Active on a given Day. Without Spans, the app must count all the visible Habits.
Then each new Habit changes the Intensity of all the earlier Days. See ADR 0003.

There is no stored set to compare with the calculated set. Thus an error in the
Span logic changes all the Squares in the past, and no test data finds the error.
The Span logic needs the most tests in `packages/domain`.
