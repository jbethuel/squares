# Export includes every Habit name in plain text, Named or not

An Export writes out every Habit's real `name`, whether or not it's a Named
Habit. The Named Habit flag (`namedHabit`) only affects the Reminder (ADR 0010
removed the Share Card from its scope) and has no bearing on Export. The file
then leaves through whatever the OS share sheet offers: email, a messaging app,
a cloud folder, or anything else installed.

That's deliberate. A Reminder or a Share Card shows a Habit's name to someone
other than the user, at a moment the user isn't in control of: a lock screen
seen by whoever is nearby, or a card posted for an audience. The Named Habit
flag exists because naming a Habit there is decided once, in Settings, for
something that later happens without the user around to reconsider.

Export is a different kind of thing. The user picks the moment, picks where the
file goes, and sees it as their own data leaving by their own hand. It's closer
to downloading a spreadsheet than to disclosing something. Limiting Export to
Named Habits would produce a backup that can't restore what it was taken from,
and the reason a Reminder hides a name doesn't apply to a file the user is
deliberately making and sending.

We considered encrypting the file and rejected it. A passphrase needs a
recovery path, and ADR 0004 already ruled out the account that recovery would
depend on.

## Consequences

Export is the one place a Habit's name always appears, even when Named Habit is
off. Anyone assuming Export respects that flag will be wrong, and that's
intended. A future change that wants to protect names inside the file will first
have to solve key recovery without an account, which is why nothing has been
done here.
