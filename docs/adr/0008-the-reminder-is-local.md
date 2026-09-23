# The Reminder is local, never a push notification

Every Reminder is scheduled on the device and fired by the device. There's no
push service, no subscription endpoint and no server, and a Reminder never uses
the network.

We're writing this down because notifications are the first feature that looks
like it conflicts with ADR 0004. The next person who wants a notification (say,
a weekly summary or a "your Streak is about to break" warning) will reach for
Web Push or FCM before checking whether they need it.

They don't. Everything a Reminder needs is already on the device. It's the
user's data, and the Reminder is only asking whether they've Logged these
Habits. Nothing is computed on a server, so nothing needs to be sent to one. A
push channel would move data off the device for a feature that doesn't need it
to.

## Consequences

The web build has no Reminder and can't have one. That's not a gap to fill
later; it's why the phone app exists. See ADR 0007.

Reminders belong to the device, not the data. An Export doesn't include them, so
moving your data to a new phone leaves that phone with no Reminders.

That's stricter than the Theme, which is stored in the data and travels with an
Export. The difference is deliberate: an Import that starts firing
notifications on a new phone is a side effect nobody asked for.

Hiding a Habit cancels its Reminder. A Hidden Habit can't be Logged, so its
Reminder would be asking for something the user can't do. This matches how the
glossary treats Hidden Habits everywhere else: no Streak, and no name on a Share
Card.

Import clears any Reminder it can't match. Reminder times are stored on the
device, keyed by Habit id, and aren't part of the data, so an Import could
otherwise leave a Reminder pointing at a Habit that no longer exists.

The Daily Reminder is off until the user turns it on, but the app offers it
once, when the first Habit is created. Per ADR 0002 a missed Day can't be
recovered, so the Reminder is the only safety net, and a safety net you don't
know about doesn't help.

Offering it isn't the same as turning it on. Turning it on is a decision about
the user's lock screen, and that's not the app's call.

## A name on the lock screen

A Reminder for a specific Habit has to identify it, or it's useless once you
have two Habits.

But the Share Card sets the constraint for this app: people track things like
"took my meds" and "no drinking", and a name leaking out of the app is the
worst bug we could ship.

The lock screen is riskier than a Share Card. You make a card deliberately; a
Reminder shows up at its scheduled time in front of whoever's in the room.

So instead of adding a second control, the app reuses the existing one. A
Reminder shows its Habit's name only if that Habit is a Named Habit. Otherwise
it says "1 Habit left" and opens the app.

That means Named Habit governs the name everywhere outside the app, not just on
the Share Card. Both places behave the same way: allowing the name in one allows
it in the other.

> **Amended by ADR 0010.** The Share Card part no longer applies. A Share Card
> now always names every Habit it draws, and Named Habit governs only the
> Reminder. The reasoning above for why the Reminder keeps its own opt-in still
> stands.
