import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Heatmap } from "@/components/Heatmap";
import { LensPicker } from "@/components/LensPicker";
import { ReminderRow } from "@/components/ReminderRow";
import { ToggleRow } from "@/components/Toggle";
import { Divider, Label, ListButton, Screen } from "@/components/ui";
import { weekdayOf } from "@squares/domain/date";
import {
  DEFAULT_LENS,
  lensFrame,
  lensMonths,
  lensNoun,
  lensRows,
  lensScrolls,
  type Lens,
} from "@squares/domain/lens";
import { renameHabit, setHidden, setStreaks, setNamedHabit } from "@squares/domain/mutations";
import {
  streakOf,
  dateAt,
  isHidden,
  isLogged,
  longestStreakOf,
  logCountIn,
  logCountOf,
} from "@squares/domain/selectors";
import { useStore } from "@squares/domain/store";
import { MS, settle } from "@/platform/motion";
import { useReminders } from "@/platform/useReminders";
import { FS, MONO, useTheme } from "@/platform/theme";

export default function Detail() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, today, update } = useStore();
  // Declared above the missing-Habit guard: a hook may not sit behind a return.
  const [lens, setLens] = useState<Lens>(DEFAULT_LENS);
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const reminders = useReminders();
  const habit = data.habits.find((h) => h.id === id);

  // The draft is dropped whenever the stored name changes under it, so the
  // field cannot go on showing a name the record no longer holds.
  useEffect(() => setDraft(null), [habit?.name]);

  if (!habit) return null;

  const hidden = isHidden(habit, today);
  const frame = lensFrame(lens, today);
  const logs = logCountOf(data, habit.id, today);
  const streaks = habit.streaks && !hidden;

  // Blank reverts rather than rejects: there is no error to show and no button
  // to disable, because there is no save.
  const commitName = () => {
    setFocused(false);
    if (draft === null) return;
    update((current) => renameHabit(current, habit.id, draft));
    setDraft(null);
  };

  return (
    <Screen>
      {/* The header carries the name too, but it is the platform's and cannot
          be edited. This is the field that changes it. */}
      <Stack.Screen options={{ title: habit.name }} />

      <TextInput
        accessibilityLabel="habit name"
        value={draft ?? habit.name}
        onChangeText={setDraft}
        maxLength={40}
        onFocus={() => setFocused(true)}
        onBlur={commitName}
        onSubmitEditing={commitName}
        returnKeyType="done"
        style={{
          fontFamily: MONO,
          fontWeight: "700",
          fontSize: FS.lg,
          color: t.fg,
          borderBottomWidth: 1,
          borderBottomColor: focused ? t.accent : t.line,
          paddingBottom: 4,
        }}
      />

      {/*
        A Habit with no Streak has one number, not three — the Log count as the
        hero, and nothing under a label that reads as something that failed to
        load.

        A Hidden Habit is shown no current Streak even when it is a Streak
        Habit: a Streak counts back from today, and a Habit that cannot be
        Logged today would read 0 forever. Its Longest Streak cannot fall, so
        that one is shown, and it is what the Screen is for — deciding whether
        to bring the Habit back.
      */}
      {/*
        Turning "show streak" on grows this row from one number to three, and
        Hide takes one back. Both resettle rather than snapping, because
        the grid beneath them moves when they do.
      */}
      <Animated.View
        layout={settle()}
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 26,
          marginTop: 22,
          marginBottom: 24,
        }}
      >
        <Stat
          value={streaks ? streakOf(data, habit.id, today) : logs}
          label={streaks ? "streak" : "logs"}
          hero
          colour={streaks ? t.ramp[4] : t.fg}
        />
        {habit.streaks ? (
          <>
            <Stat value={longestStreakOf(data, habit.id, today)} label="longest streak" colour={t.fg} />
            {hidden ? null : <Stat value={logs} label="logs" colour={t.fg} />}
          </>
        ) : null}
      </Animated.View>

      {/*
        The picker sits on its own line above the grid, as it does on Home,
        rather than sharing one with the label: at 350px the label wraps if it
        has to share, and a two-line caption above a grid reads as a fault.
      */}
      <Label style={{ marginBottom: 9 }}>your logs for {lensNoun(lens)}</Label>
      <View style={{ marginBottom: 8 }}>
        <LensPicker value={lens} onChange={setLens} label="days to show" />
      </View>
      {/*
        A Habit Heatmap is binary and uses level 3 only. A gradient here would
        be a lie — there is nothing to be partial about.

        Today is ringed here as well as on Home. Under the Week and the Month
        the frame runs on past today, so without the ring there is no way to
        tell a Day that was missed from one that has not happened.
      */}
      <Heatmap
        frame={frame}
        weekday={weekdayOf(today)}
        rows={lensRows(lens)}
        scrolls={lensScrolls(lens)}
        today={today}
        months={lensMonths(lens)}
        levelFor={(offset) => (isLogged(data, habit.id, dateAt(today, offset)) ? 3 : 0)}
        label={`${habit.name}: ${logCountIn(data, habit.id, today, frame.back)} logs in ${lensNoun(lens)}`}
        markToday
      />

      {/*
        While a Habit is Hidden neither the Streak nor its Reminder applies to
        it — ADR 0008 cancels a Hidden Habit's Reminder outright — so the
        controls for them are not on the Screen — a switch that sits on and
        provably does nothing is worse than no switch. Both come back holding
        their remembered state when the Habit does. The Habit Card's own row
        sits inside this same block for the same reason: ADR 0011 gives a
        Hidden Habit no Habit Card at all, not even a link to try to make one.
      */}
      {hidden ? null : (
        <Animated.View
          layout={settle()}
          entering={FadeIn.duration(MS.reveal)}
          exiting={FadeOut.duration(MS.reveal)}
          style={{ gap: 7, marginTop: 22 }}
        >
          <ToggleRow
            label="show streak"
            on={habit.streaks}
            onToggle={() => update((current) => setStreaks(current, habit.id, !habit.streaks))}
          />
          {/* Positioned here rather than with "hide" at the bottom: the switch
              directly above decides whether the card this opens can carry a
              Streak at all. ADR 0011. */}
          <ListButton
            label="make a share card ›"
            onPress={() => router.push(`/habit/${habit.id}/share`)}
          />
          {/* The label says where it applies. "name" alone would not say this
              is the Reminder's name — the Share Card has no toggle of its
              own; ADR 0010 has it always name every visible Habit. */}
          <ToggleRow
            label="show name in reminder"
            on={habit.namedHabit}
            onToggle={() =>
              update((current) => setNamedHabit(current, habit.id, !habit.namedHabit))
            }
          />
          {/*
            Inside the not-Hidden block with the other two, and for the same
            reason: ADR 0008 cancels a Hidden Habit's Reminder, because it would
            ask for a Log the user is not allowed to make. The time is kept, and
            comes back with the Habit.

            The hint is the lock-screen rule, stated on the Screen that holds the
            switch which decides it — the Named Habit toggle is directly above.
          */}
          <ReminderRow
            label="remind me"
            hint={
              habit.namedHabit
                ? "the notification shows this habit's name."
                : "the notification won't show this habit's name."
            }
            time={reminders.forHabit(habit.id)}
            onSet={(time) => reminders.setForHabit(habit.id, time)}
          />
        </Animated.View>
      )}

      {/*
        Hide sits below a rule and last, because it is the only switch here
        that changes what Home shows. It asks nothing first: it is reversible
        now, and a switch that can be moved back does not need a confirmation.
      */}
      <Divider style={{ marginVertical: 20 }} />
      <ToggleRow
        label="hide"
        hint={
          hidden
            ? "hidden from home, logs kept. turn off to bring it back."
            : "takes this habit off home. nothing is deleted."
        }
        on={hidden}
        onToggle={() => update((current) => setHidden(current, habit.id, !hidden, today))}
      />
    </Screen>
  );
}

function Stat({
  value,
  label,
  colour,
  hero = false,
}: {
  value: number;
  label: string;
  colour: string;
  hero?: boolean;
}) {
  const t = useTheme();
  return (
    <Animated.View
      layout={settle()}
      entering={FadeIn.duration(MS.reveal)}
      exiting={FadeOut.duration(MS.reveal)}
    >
      <Text
        style={{
          fontFamily: MONO,
          fontWeight: "700",
          fontSize: hero ? FS.display : FS.xl,
          lineHeight: hero ? FS.display : FS.xl,
          letterSpacing: hero ? -1.5 : 0,
          color: colour,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
      <Text style={{ marginTop: 5, fontFamily: MONO, fontSize: FS.xs, color: t.muted }}>
        {label}
      </Text>
    </Animated.View>
  );
}
