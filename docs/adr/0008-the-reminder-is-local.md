# The Reminder is local and never a push notification

The app schedules each Reminder on the device, and the device raises it. There
is no push service, no subscription endpoint and no server. A Reminder does not
use the network.

We record this decision because a notification is the first feature that looks
like a conflict with ADR 0004. The next person who wants a notification will
select Web Push or FCM before that person examines the requirement. Examples of
such a feature are a weekly summary, or a warning that a Streak will stop.

Web Push and FCM are not necessary. All the data for a Reminder is on the
device. The data belongs to the user, and the Reminder asks if the user Logged
these Habits. The app calculates nothing on a server, so it sends nothing to a
server. A push channel moves the data off the device for a feature that does not
need this.

## Consequences

The web build has no Reminder and cannot have one. This is not a gap to close
later. It is the reason that the phone app exists. See ADR 0007.

A Reminder is a property of the device and not of the data. An Export does not
contain a Reminder. If the user moves the data to a different phone, that phone
has no Reminder.

This rule is more strict than the rule for the Theme. The app stores the Theme
in the data, and the Theme moves with an Export. The difference is deliberate.
An Import that starts notifications on a new phone is an effect that the user
did not ask for.

Hide cancels the Reminder of a Habit. The user cannot Log a Hidden Habit. Thus
its Reminder asks for an operation that the user cannot do. The glossary gives a
Hidden Habit the same shape in all other places: it shows no Streak, and its
name goes on no Share Card.

Import removes each Reminder that it cannot match. The app stores Reminder times
on the device with the id of the Habit. The data does not contain the Reminder
times. Thus an Import can leave a Reminder that points to a Habit that no longer
exists.

The Daily Reminder is off until the user turns it on. But the app asks the user
one time, when the user makes the first Habit. By ADR 0002, the user cannot
recover a Day that the user missed. The Reminder is thus the only protection,
and a protection that the user does not know about gives no protection.

To ask the user is not the same as to turn the Reminder on. To turn it on is a
decision about the lock screen of the user, and the app must not make that
decision.

## A name on a lock screen

A Reminder for a Habit must identify that Habit. If it does not, the Reminder
has no value when the user has two Habits.

But the Share Card gives the constraint for this app: users track "took my meds"
and "no drinking", and a name that leaves the app is the worst possible defect.

A lock screen is more dangerous than a Share Card. The user makes a card
deliberately. A Reminder arrives at the set time, in front of any person in the
room.

Thus the app uses the existing control and does not add a second one. A Reminder
shows the name of its Habit only if that Habit is a Named Habit. If the Habit is
not a Named Habit, the Reminder says "1 Habit left" and opens the app.

A Named Habit thus controls the name outside the app, and not only on the Share
Card. Both places do the same thing. A user who permits the name in one place
permits it in the other place.
