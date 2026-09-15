import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { useStore } from "@squares/domain/store";
import {
  markAsked,
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
  /**
   * False until the one-time ask of ADR 0008 has been put to this user. It says
   * only that the question was asked — `daily` is what says what they answered.
   */
  asked: boolean;
  /** Record that the question has been put, whichever way it was answered. */
  recordAsked: () => void;
}

const RemindersContext = createContext<Reminders | null>(null);

/**
 * One instance, above every Screen — the same shape `StoreProvider` has, and
 * for a stronger reason than sharing state.
 *
 * The settings are held in this hook rather than in the record, so a second
 * mount would be a second copy: settings would disagree between Screens, and
 * both copies would reconcile the device's pending notifications against their
 * own idea of the plan, each cancelling what the other had just scheduled.
 *
 * It also has to sit above Home. Reconciling is driven by the effects below,
 * which only run while this is mounted, and Home is where Logs happen — the
 * event that silences a Reminder the user has already earned their way out of.
 */
export function RemindersProvider({ children }: { children: ReactNode }) {
  return <RemindersContext.Provider value={useRemindersState()}>{children}</RemindersContext.Provider>;
}

export function useReminders(): Reminders {
  const reminders = useContext(RemindersContext);
  if (!reminders) throw new Error("useReminders must be used inside a RemindersProvider");
  return reminders;
}

function useRemindersState(): Reminders {
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

  // Every Log, Hide and settings change lands here, because each one can
  // silence a Reminder or bring one back. A rollover arrives the same way: the
  // store reseals the record, which is a new `data`.
  useEffect(() => {
    void syncReminders(data, settings);
  }, [data, settings]);

  // A backgrounded app gets no rollover and no Log, so the plan it left behind
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

  // Written through on the spot rather than left to the effect above. The ask
  // happens as the Screen is leaving, and a flag that is only in state would be
  // gone by the next launch — which would ask a second time.
  const recordAsked = useCallback(() => {
    setSettings((previous) => {
      const next = markAsked(previous);
      if (next !== previous) saveReminders(next);
      return next;
    });
  }, []);

  return {
    daily: settings.daily,
    forHabit,
    setDaily,
    setForHabit,
    asked: settings.asked,
    recordAsked,
  };
}
