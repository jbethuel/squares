import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useStore } from "@squares/domain/store";
import {
  reconcileReminders,
  reminderFor,
  setDailyReminder,
  setHabitReminder,
  type ReminderSettings,
  type TimeOfDay,
} from "@squares/domain/reminders";
import { ensureRemindersAllowed, loadReminders, saveReminders, syncReminders } from "./reminders";

/**
 * The Reminder, wired to the record.
 *
 * Everything a Screen needs: what is set, how to change it, and the guarantee
 * that the device is holding the right notifications afterwards. The rules are
 * the package's and the scheduling is `./reminders`'; this is only the join.
 */
export interface Reminders {
  daily: TimeOfDay | null;
  /** The time this Habit is Reminded at, or null if it is not a Reminded Habit. */
  forHabit: (habitId: string) => TimeOfDay | null;
  /**
   * Turn the Daily Reminder on at a time, or off with null. Resolves false if
   * the user refused the permission, so the Screen can leave the control off
   * rather than showing an alarm that will never sound.
   */
  setDaily: (time: TimeOfDay | null) => Promise<boolean>;
  setForHabit: (habitId: string, time: TimeOfDay | null) => Promise<boolean>;
}

export function useReminders(): Reminders {
  const { data } = useStore();
  // Read straight through, not in an effect. The device store is synchronous —
  // which is why it was chosen — and loading a Day late would mean the first
  // sync ran against no Reminders and cancelled every one the device held.
  const [settings, setSettings] = useState<ReminderSettings>(loadReminders);

  /**
   * ADR 0008: Import drops Reminders it cannot match. Reminder times are keyed
   * by Habit id while the record is not, so a record replaced by Import can
   * leave Reminders aimed at Habits that no longer exist. Reconciling against
   * the current Habits here catches that wherever the Import happened.
   */
  useEffect(() => {
    setSettings((previous) => {
      const reconciled = reconcileReminders(previous, data.habits);
      if (reconciled !== previous) saveReminders(reconciled);
      return reconciled;
    });
  }, [data.habits]);

  // Every Tick, Archive and settings change lands here, because each one can
  // silence a Reminder or bring one back. A rollover arrives the same way: the
  // store reseals the record, which is a new `data`.
  useEffect(() => {
    void syncReminders(data, settings);
  }, [data, settings]);

  // A backgrounded app gets no rollover and no Tick, so the plan it left behind
  // can be a Day stale by the time the user is back.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void syncReminders(data, settings);
    });
    return () => subscription.remove();
  }, [data, settings]);

  const commit = useCallback(async (next: ReminderSettings, turningOn: boolean) => {
    // Only ask when there is something to ask for. A user turning their last
    // Reminder off is never shown a permission prompt.
    if (turningOn && !(await ensureRemindersAllowed())) return false;
    saveReminders(next);
    setSettings(next);
    return true;
  }, []);

  const setDaily = useCallback(
    (time: TimeOfDay | null) => commit(setDailyReminder(settings, time), time !== null),
    [commit, settings],
  );

  const setForHabit = useCallback(
    (habitId: string, time: TimeOfDay | null) =>
      commit(setHabitReminder(settings, habitId, time), time !== null),
    [commit, settings],
  );

  const forHabit = useCallback((habitId: string) => reminderFor(settings, habitId), [settings]);

  return { daily: settings.daily, forHabit, setDaily, setForHabit };
}
