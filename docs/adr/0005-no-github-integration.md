# No GitHub integration

The app uses the design of the GitHub contribution graph, but the app does not
read data from GitHub. The user fills each Square with a manual Log.

This is a decision about scope and not a technical limit. Persons will continue
to propose the opposite, because it looks easy: a GitHub contribution calendar
is available from a user name, with no OAuth and no scopes.

We rejected it because the app models the operation that fills a Square. The app
does not model a display of activity from a different system. If one Habit fills
automatically, that Habit is not the same as the other Habits. The audience also
becomes software developers only.
