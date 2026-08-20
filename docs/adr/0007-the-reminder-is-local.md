# The Reminder is local, and never push

Every Reminder is scheduled on the device by the app and raised by the device. There is no push service, no subscription endpoint and no server. Nothing about a Reminder touches the network.

This is worth recording because a notification is the first feature here that *looks* like it must break ADR 0002, and the next person who wants one — a weekly summary, a warning that a Chain is about to end — will reach for Web Push or FCM before checking whether they need to.

They do not. Everything a Reminder needs is already on the device: it is the user's own record, and the question it asks is whether these Habits were Ticked yet. Nothing is computed elsewhere, so nothing has to be sent anywhere. A push channel would move the record, or a summary of it, off the device to serve a feature that never needed it to leave.

## Consequences

The web build has no Reminder at all and cannot have one. That is not a gap to close later; it is the reason the phone app exists (ADR 0006).

A Reminder belongs to the device, not to the record. It is not in an Export, and a record carried to another phone arrives with none set. This is a stricter rule than the one Theme follows — Theme is stored in `AppData` and does travel — and the difference is deliberate: an Import that silently began raising alarms on a new phone would be a side effect nobody asked for.

Archiving a Habit cancels its Reminder. An Archived Habit cannot be Ticked, so its Reminder would prompt forever for something that cannot be done. That is the shape the glossary already gives an Archived Habit elsewhere: no Chain is shown, and no name reaches a Share Card.

Import drops Reminders it cannot match. Reminder times are keyed by Habit id on the device while the record is not, so a record replaced by Import can leave Reminders pointing at Habits that no longer exist.

## A name on a lock screen

A Reminded Habit's Reminder has to identify its Habit, or it is useless the moment there are two of them. But `shareCard.ts` states the constraint this app holds itself to: people track "took my meds" and "no drinking", and a leaked name is the one unforgivable bug. A lock screen is a worse place to leak one than a Share Card — a card is made deliberately, while a Reminder arrives unbidden at whatever time was set, in front of whoever is in the room.

The existing opt-in is reused rather than duplicated. A Reminder names its Habit only if that Habit is a Named Habit; otherwise it says "1 Habit left" and opens the app. Named Habit therefore widens from "on the Share Card" to "outside the app", which is what it always meant: the two exposures are the same act, and a user willing to take a name to one is willing to take it to the other.
