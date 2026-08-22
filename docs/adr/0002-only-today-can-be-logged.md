# The user can Log only today

A Log goes on today. The user cannot Log a different Day. The Day closes at
local midnight, and no operation can change it after that.

The user can remove a Log from today until local midnight, because today is not
yet a permanent record.

The app uses the mechanic of a year that the user fills by hand. The year has
value because the user cannot fill it later. If the user can add a Log to an
earlier Day, each empty Square becomes a task and not a fact. The data then has
no value.

## Considered options

**A window of one Day, where the user can Log yesterday.** This is the option
that persons will continue to propose. We rejected it because this length is the
worst length.

The window is too short to give protection. If the user forgets for two Days,
the window has already failed. But the window is long enough that the user
believes that protection exists. The user then finds the limit of the window
when the user loses data.

**A window that the user configures.** We rejected this option. It makes the
sense of each Heatmap different on each device. A Share Card does not show the
value of the window that made it.

## Consequences

The user cannot recover a Day that the user missed. Thus the Daily Reminder is
the only protection against a broken Streak.

The Daily Reminder stays off by default. The app must not turn on notifications
for the user. But the app asks the user one time, when the user makes the first
Habit. A protection that the user does not know about gives no protection.

A user who Logs late at night is one minute from the loss of the Day. This is
the cost of the decision. The contribution graph has the same cost.

The app must not show that a Streak stopped at one minute after midnight. A
Streak stops on a Day that the user missed, and today is not a missed Day until
today ends.

Thus the app counts a Streak back from today if the user Logged today. If the
user did not Log today, the app counts back from yesterday. Without this rule,
the app tells each user each morning that the user failed.

The app seals a Day with a clock event and not with a user event. The app must
find the change of Day while it is open and while it is in the background.
