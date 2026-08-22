import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { Tail } from "./Tail";
import * as haptics from "@/platform/haptics";
import { MS, settle } from "@/platform/motion";
import { longLabel, type DateKey } from "@squares/domain/date";
import { streakOf, dateAt, isLogged, logCountOf } from "@squares/domain/selectors";
import type { AppData, Habit } from "@squares/domain/types";
import { FS, MONO, useTheme } from "@/platform/theme";

/** The spring is 260ms; the pulse is released just after it lands. */
const PULSE_MS = 300;

interface HabitRowProps {
  habit: Habit;
  data: AppData;
  today: DateKey;
  elapsed: number;
  /** Always 0: ADR 0002 leaves no Day but today to Log. */
  offset: number;
  onLog: (habitId: string, date: DateKey, turnedOn: boolean) => void;
  onOpen?: (habitId: string) => void;
}

export function HabitRow({
  habit,
  data,
  today,
  elapsed,
  offset,
  onLog,
  onOpen,
}: HabitRowProps) {
  const t = useTheme();
  const [pressed, setPressed] = useState(false);
  const [pulse, setPulse] = useState<"log" | "unlog" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const date = dateAt(today, offset);
  const logged = isLogged(data, habit.id, date);

  const commit = useCallback(() => {
    const turningOn = !logged;
    onLog(habit.id, date, turningOn);
    setPulse(turningOn ? "log" : "unlog");
    // One haptic on commit, and only on the tap that adds. Correcting a mistake
    // should feel administrative — which is why the other branch is a named
    // no-op rather than nothing at all. See `platform/haptics.ts`.
    if (turningOn) haptics.log();
    else haptics.unlog();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPulse(null), PULSE_MS);
  }, [logged, onLog, habit.id, date]);

  const streak = streakOf(data, habit.id, today);
  const count = logCountOf(data, habit.id, today);
  const subtitle = !habit.streaks
    ? `${count} log${count === 1 ? "" : "s"}`
    : streak > 0
      ? `streak ${streak} day${streak === 1 ? "" : "s"}`
      : elapsed === 1
        ? "no streak yet"
        : "streak broken";

  /*
    The row answering a Log. The web eases the background over 90ms and the
    border over 160ms — the fill lands with the tap and the edge follows it —
    so the two are interpolated separately here rather than swapped together.
  */
  const lit = logged || pressed;
  const fill = useDerivedValue(() => withTiming(lit ? 1 : 0, { duration: MS.press }), [lit]);
  const edge = useDerivedValue(() => withTiming(logged ? 1 : 0, { duration: MS.edge }), [logged]);

  const surface = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(fill.value, [0, 1], [t.surface, t.surfaceOn]),
    borderColor: interpolateColor(edge.value, [0, 1], [t.line, t.rowOnLine]),
  }));

  return (
    // Two views, not one. The layout animation owns the outer one's opacity
    // while it runs, so the yesterday row's 0.82 has to live on a wrapper
    // inside it — sharing them makes the row flash to full opacity every time
    // the list resettles, which Reanimated warns about by name.
    <Animated.View
      // A Habit hidden from its own Screen leaves this list; a new one joins
      // it. Both should push the rows below them rather than teleport.
      layout={settle()}
      entering={FadeIn.duration(MS.reveal)}
      exiting={FadeOut.duration(MS.reveal)}
    >
    <Animated.View
      style={[
        {
          flexDirection: "row",
          alignItems: "stretch",
          minHeight: 56,
          borderRadius: 12,
          borderWidth: 1,
          opacity: offset > 0 ? 0.82 : 1,
        },
        surface,
      ]}
    >
      {/*
        The Log target is the row, 56px tall, with no dialog and no second
        screen. Nothing else on Home is tappable at this size, so the thumb
        cannot miss. The chevron is a separate, deliberately small target.
      */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: logged }}
        accessibilityLabel={`${habit.name}, ${logged ? "logged" : "not logged"} for ${longLabel(date)}`}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={commit}
        style={{
          flex: 1,
          minWidth: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 10,
          paddingHorizontal: 14,
        }}
      >
        {/* The subtitle changes length as a Streak grows — "streak 9 days" to
            "streak 10 days" — so the block resettles instead of reflowing. */}
        <Animated.View layout={settle()} style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: MONO, fontSize: FS.md, color: t.fg }}>
            {habit.name}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              marginTop: 3,
              fontFamily: MONO,
              fontSize: FS.xs,
              color: logged && habit.streaks ? t.streakFg : t.muted,
            }}
          >
            {subtitle}
          </Text>
        </Animated.View>
        <Tail
          base={offset}
          elapsed={elapsed}
          isLogged={(o) => isLogged(data, habit.id, dateAt(today, o))}
          streaks={habit.streaks}
          pressed={pressed}
          pulse={pulse}
        />
      </Pressable>
      {/*
        The chevron is small; its hit box is not. The row is already 56px tall,
        so only the width needed raising — 26px to 44px.
      */}
      {onOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${habit.name}`}
          onPress={() => {
            haptics.selected();
            onOpen(habit.id);
          }}
          style={{ minWidth: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: MONO, fontSize: FS.md, color: t.dim }}>›</Text>
        </Pressable>
      ) : null}
    </Animated.View>
    </Animated.View>
  );
}
