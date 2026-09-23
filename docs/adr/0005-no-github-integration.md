# No GitHub integration

The app borrows the look of the GitHub contribution graph but doesn't read any
data from GitHub. Every Square is filled by a manual Log.

This is a scope decision, not a technical limit. People will keep proposing it
because it looks easy: a user's contribution calendar is available from just
their username, with no OAuth and no scopes.

We rejected it because the app is about the act of filling in a Square, not
about displaying activity from somewhere else. A Habit that fills itself in
isn't like the other Habits. It would also narrow the audience to software
developers.
