import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Storage from "expo-sqlite/kv-store";
import {
  noReminders,
  parseReminderSettings,
  planReminders,
  reminderAt,
  serialiseReminders,
  REMINDERS_KEY,
  type PlannedReminder,
  type ReminderSettings,
} from "@squares/domain/reminders";
import type { AppData } from "@squares/domain/types";

/**
 * The phone's half of the Reminder. The rules — which Days are prompted, what a
 * Reminder is allowed to say — are in `@squares/domain/reminders`; nothing here
 * decides any of that. This file only makes the device hold what the plan says.
 *
 * ADR 0007: local scheduling only. There is no push service, no token and no
 * subscription endpoint in this file, and there must never be one.
 */

/**
 * Our notifications carry this prefix so a pending list can be told apart from
 * anything else the app might schedule later. Cancelling by prefix rather than
 * `cancelAllScheduledNotificationsAsync` keeps this feature from reaching past
 * its own edge.
 */
const PREFIX = "squares.reminder:";

/** The Android channel. It must exist before the OS will show the permission prompt. */
const CHANNEL = "reminders";

/**
 * Reminders live beside the record, in their own slot. ADR 0007: they are not in
 * an Export and a record carried to another phone arrives with none set — which
 * is only true because they are never written into `squares.v1`.
 */
export function loadReminders(): ReminderSettings {
  try {
    const blob = Storage.getItemSync(REMINDERS_KEY);
    return blob ? parseReminderSettings(JSON.parse(blob)) : noReminders();
  } catch {
    return noReminders();
  }
}

export function saveReminders(settings: ReminderSettings): void {
  try {
    Storage.setItemSync(REMINDERS_KEY, serialiseReminders(settings));
  } catch {
    // Same trade as the record's own writer: a blocked store must not take the
    // app down. The setting is still in memory and the next write will retry.
  }
}

/**
 * A Reminder that arrives while the user is already looking at their Squares is
 * the noise the glossary rules out — the prompt exists to bring them here. It
 * still lands in the tray, so nothing is lost if the app is open in a pocket.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Ask for the permission a Reminder needs, once the user has asked for one.
 *
 * The channel is created first because Android will not show the prompt until
 * one exists. Nothing here requests `SCHEDULE_EXACT_ALARM`: expo-notifications
 * falls back to an inexact alarm on its own, which costs a once-daily Reminder
 * a few minutes of drift in Doze and nothing else — see docs/research/.
 */
export async function ensureRemindersAllowed(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * FNV-1a over everything about a Reminder that is not already in its key.
 *
 * The key names the Day and the Habit, so it survives a replan — but the body
 * changes as Habits are Ticked and the time changes when the user moves it, and
 * a diff on the key alone would leave the device holding a stale one. Folding
 * both into the identifier means "same identifier" implies "same notification",
 * so an unchanged Reminder is left alone and a changed one is replaced.
 */
function identify(reminder: PlannedReminder): string {
  const payload = `${reminder.time.hour}:${reminder.time.minute}|${reminder.title}|${reminder.body}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${PREFIX}${reminder.key}#${hash.toString(36)}`;
}

async function pendingIds(): Promise<string[]> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  return pending.map((request) => request.identifier).filter((id) => id.startsWith(PREFIX));
}

async function cancelAllOurs(): Promise<void> {
  for (const id of await pendingIds()) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

/**
 * One sync at a time. Every Tick asks for one, and two overlapping runs would
 * read the same pending list and schedule the same Reminder twice.
 */
let inFlight: Promise<void> = Promise.resolve();

/**
 * Make the device hold exactly the Reminders the plan calls for.
 *
 * Call this after anything that can change the answer: a Tick, an Archive, a
 * change to the settings, a Day rolling over, and the app coming forward — the
 * plan covers a horizon precisely so that missing one of these is survivable,
 * but a Reminder the user has already earned their way out of should go quiet
 * as soon as the app can see it.
 */
export function syncReminders(data: AppData, settings: ReminderSettings): Promise<void> {
  inFlight = inFlight.then(() => reconcile(data, settings)).catch(() => {});
  return inFlight;
}

async function reconcile(data: AppData, settings: ReminderSettings): Promise<void> {
  const plan =
    settings.daily || Object.keys(settings.habits).length > 0 ? planReminders(data, settings) : [];

  // Nothing is set: leave the device holding nothing, without asking for a
  // permission the user never requested. The app asks nothing of someone who
  // never turns a Reminder on.
  if (plan.length === 0) {
    await cancelAllOurs();
    return;
  }

  if (!(await Notifications.getPermissionsAsync()).granted) {
    await cancelAllOurs();
    return;
  }

  const wanted = new Map(plan.map((reminder) => [identify(reminder), reminder]));
  const held = new Set(await pendingIds());

  for (const id of held) {
    if (!wanted.has(id)) await Notifications.cancelScheduledNotificationAsync(id);
  }

  for (const [id, reminder] of wanted) {
    if (held.has(id)) continue;
    // Scheduled with our own identifier rather than the generated one, so the
    // next sync can recognise it. Anything being replaced was cancelled above:
    // reusing an identifier is not documented to overwrite, so this never
    // relies on it doing so.
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title: reminder.title, body: reminder.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderAt(reminder),
        channelId: CHANNEL,
      },
    });
  }
}
