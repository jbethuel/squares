import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Stack, useLocalSearchParams } from "expo-router";
import { Heatmap } from "@/components/Heatmap";
import { LensPicker } from "@/components/LensPicker";
import { ToggleRow } from "@/components/Toggle";
import { Divider, Label, Screen } from "@/components/ui";
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
import { renameHabit, setArchived, setChained, setSharedName } from "@squares/domain/mutations";
import {
  chainOf,
  dateAt,
  isArchived,
  isTicked,
  longestChainOf,
  tickCountIn,
  tickCountOf,
} from "@squares/domain/selectors";
import { useStore } from "@squares/domain/store";
import { MS, settle } from "@/platform/motion";
import { FS, MONO, useTheme } from "@/platform/theme";

export default function Detail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, today, update } = useStore();
  // Declared above the missing-Habit guard: a hook may not sit behind a return.
  const [lens, setLens] = useState<Lens>(DEFAULT_LENS);
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const habit = data.habits.find((h) => h.id === id);

  // The draft is dropped whenever the stored name changes under it, so the
  // field cannot go on showing a name the record no longer holds.
  useEffect(() => setDraft(null), [habit?.name]);

  if (!habit) return null;

  const archived = isArchived(habit, today);
  const frame = lensFrame(lens, today);
  const ticks = tickCountOf(data, habit.id, today);
  const chained = habit.chained && !archived;

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
        An unchained Habit has one number, not three. It used to show the Tick
        count as the hero and again in the third slot, with an em dash where the
        longest Chain would go — the same figure under two labels, next to a
        stat that reads as something that failed to load.

        An Archived Habit is shown no current Chain even when Chained: a Chain
        counts back from today, and a Habit that cannot be Ticked today would
        read 0 forever. What it did, and its longest run, are still true.
      */}
      {/*
        Turning "count a chain" on grows this row from one number to three, and
        Archiving takes one back. Both resettle rather than snapping, because
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
          value={chained ? chainOf(data, habit.id, today) : ticks}
          label={chained ? "chain" : "ticks"}
          hero
          colour={chained ? t.ramp[4] : t.fg}
        />
        {habit.chained ? (
          <>
            <Stat value={longestChainOf(data, habit.id, today)} label="longest" colour={t.fg} />
            {archived ? null : <Stat value={ticks} label="ticks" colour={t.fg} />}
          </>
        ) : null}
      </Animated.View>

      {/*
        The picker sits on its own line above the grid, as it does on Home,
        rather than sharing one with the label: at 350px the label wraps if it
        has to share, and a two-line caption above a grid reads as a fault.
      */}
      <Label style={{ marginBottom: 9 }}>every day of {lensNoun(lens)} · ticked or not</Label>
      <View style={{ marginBottom: 8 }}>
        <LensPicker value={lens} onChange={setLens} label={`how much of ${habit.name} to draw`} />
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
        levelFor={(offset) => (isTicked(data, habit.id, dateAt(today, offset)) ? 3 : 0)}
        label={`${habit.name}: ${tickCountIn(data, habit.id, today, frame.back)} ticks across ${lensNoun(lens)}`}
        markToday
      />

      {/*
        While a Habit is Archived neither the Card nor the Chain applies to it,
        so the controls for them are not on the Screen — a switch that sits on
        and provably does nothing is worse than no switch. Both come back
        holding their remembered state when the Habit does.
      */}
      {archived ? null : (
        <Animated.View
          layout={settle()}
          entering={FadeIn.duration(MS.reveal)}
          exiting={FadeOut.duration(MS.reveal)}
          style={{ gap: 7, marginTop: 22 }}
        >
          <ToggleRow
            label="count a chain"
            on={habit.chained}
            onToggle={() => update((current) => setChained(current, habit.id, !habit.chained))}
          />
          {/* The label says what it puts where. "share" alone would not say
              that the thing being shared is the name. */}
          <ToggleRow
            label="name on share card"
            on={habit.sharedName}
            onToggle={() =>
              update((current) => setSharedName(current, habit.id, !habit.sharedName))
            }
          />
        </Animated.View>
      )}

      {/*
        Archive sits below a rule and last, because it is the only switch here
        that changes what Home shows. It asks nothing first: it is reversible
        now, and a switch that can be moved back does not need a confirmation.
      */}
      <Divider style={{ marginVertical: 20 }} />
      <ToggleRow
        label="archive"
        hint={archived ? "off home. past ticks stay." : "stops counting today"}
        on={archived}
        onToggle={() => update((current) => setArchived(current, habit.id, !archived, today))}
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
