# Export carries every Habit name in the clear, Named or not

An Export writes the real `name` of every Habit, whether or not the user made
it a Named Habit. The Named Habit flag (`namedHabit`) governs only the
Reminder — see ADR 0010, which also drops the Share Card from what it
governs — and it does nothing to Export either way. The file then leaves
through whatever the OS share sheet offers: email, a messaging app, a cloud
folder, anything installed.

We keep it this way, deliberately. A Reminder and a Share Card show a Habit's
name to someone who is not the user, at a moment the user is not watching: a
lock screen seen by whoever is in the room, a card posted for an audience. The
Named Habit flag exists because naming a Habit there is a decision made once,
in Settings, for an event that later happens without the user present to
reconsider it. Export is different in kind: the user chooses the moment,
chooses the app the file goes to, and reads the result as their own data
leaving under their own hand — closer to a spreadsheet download than a
disclosure. Restricting Export to Named Habits only would make a "backup"
that cannot restore what it was taken from, and the reason Reminder hides a
name does not transfer to a file the user is deliberately making and sending.

Encrypting the file was considered and rejected. A passphrase needs recovery,
and ADR 0004 already ruled out the account that recovery would live in.

## Consequences

Export is the one place a Habit's name always appears, even with "Named
Habit" off everywhere else. A reader who assumes Export honours that flag
will be wrong, on purpose. If a future change wants to protect names inside
the file itself, it has to solve key recovery without an account first, which
is why nothing has been done here.
