# No GitHub integration

Despite being modelled on the GitHub contribution graph, this app never reads GitHub data. Every Square is filled by a manual Tick.

This is a scope decision, not a technical limitation, and it is worth recording because the opposite looks obvious: GitHub's contribution calendar is fetchable from a username alone, with no user OAuth and no scopes, so "just pull it in" will keep getting suggested.

It is rejected because the reward being modelled is *the act of filling a Square*, not the passive display of activity — auto-filling one Habit from an external source would make that Habit structurally unlike every other one, and would narrow the audience to developers.
