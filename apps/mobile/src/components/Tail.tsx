import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { GRACE_DAYS } from "@squares/domain/types";
import { useTheme, type Theme } from "@/platform/theme";

export const TAIL_DAYS = 8;

const SIZE = 15;
const GAP = 4;

interface TailProps {
  /** Offset of the rightmost Square: 0 on Home, 1 in the yesterday section. */
  base: number;
  elapsed: number;
  isTicked: (offset: number) => boolean;
  /** Bridges are only drawn for a Chained Habit. */
  chained: boolean;
  pressed: boolean;
  pulse: "tick" | "untick" | null;
}

/**
 * A week and a bit at 15px, doing three jobs at once — which is why it earns
 * the space on Home. It is the tick target (today is the rightmost Square), it
 * is the Chain preview (consecutive Squares are bridged, so a Chain reads as
 * one object rather than a number), and it is the "yesterday is still open" cue
 * (the second-from-right Square is hollow when yesterday was missed).
 */
export function Tail({ base, elapsed, isTicked, chained, pressed, pulse }: TailProps) {
  const t = useTheme();
  const squares = [];

  for (let index = TAIL_DAYS - 1; index >= 0; index--) {
    const offset = base + index;
    const target = index === 0;
    const unborn = offset >= elapsed;
    const ticked = !unborn && isTicked(offset);
    // The Day to the right of this one, which a bridge would reach across.
    const nextTicked = index > 0 && offset - 1 < elapsed && isTicked(offset - 1);
    const openAndEmpty = !target && !unborn && !ticked && offset <= GRACE_DAYS;

    squares.push(
      <TailSquare
        key={offset}
        theme={t}
        ticked={ticked}
        unborn={unborn}
        openAndEmpty={openAndEmpty}
        today={target}
        bridged={ticked && nextTicked && chained}
        pressed={target && pressed}
        pulse={target ? pulse : null}
      />,
    );
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", alignItems: "center", gap: GAP }}
    >
      {squares}
    </View>
  );
}

interface SquareProps {
  theme: Theme;
  ticked: boolean;
  unborn: boolean;
  openAndEmpty: boolean;
  today: boolean;
  bridged: boolean;
  pressed: boolean;
  pulse: "tick" | "untick" | null;
}

function TailSquare({
  theme,
  ticked,
  unborn,
  openAndEmpty,
  today,
  bridged,
  pressed,
  pulse,
}: SquareProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (pressed) {
      scale.value = withTiming(0.9, { duration: 90 });
    } else if (pulse === "tick") {
      /*
        The overshoot is the weight. The web releases from 1.14 with a bezier
        that passes above 1; a spring is the same shape stated as physics, and
        is what React Native has. Correcting a mistake is administrative, so an
        untick takes the linear branch below: no overshoot, no haptic, no echo.
      */
      scale.value = withSequence(
        withTiming(1.14, { duration: 0 }),
        withSpring(1, { damping: 11, stiffness: 180, mass: 0.6 }),
      );
    } else {
      scale.value = withTiming(1, { duration: pulse === "untick" ? 120 : 260 });
    }
  }, [pressed, pulse, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // A Day that has not happened is outlined, not filled; so is yesterday while
  // it is still open and still empty. Everything else is a shade of the ramp.
  const hollow = unborn || openAndEmpty;

  return (
    <Animated.View
      style={[
        {
          width: SIZE,
          height: SIZE,
          borderRadius: 4,
          backgroundColor: hollow ? "transparent" : ticked ? theme.ramp[3] : theme.ramp[0],
          ...(hollow
            ? {
                borderWidth: 1,
                borderStyle: unborn ? ("dashed" as const) : ("solid" as const),
                borderColor: unborn ? theme.ghost : theme.ring,
              }
            : null),
          // Today's Square carries the ring: it is the tick target.
          ...(today ? { boxShadow: `0 0 0 1.5px ${theme.tailRing}` } : null),
        },
        animated,
      ]}
    >
      {/*
        A Chain reads as one continuous object rather than a number: consecutive
        Squares are bridged, and a Tick that extends one visibly grows a limb.
      */}
      {bridged ? <Bridge colour={theme.ramp[3]} /> : null}
    </Animated.View>
  );
}

function Bridge({ colour }: { colour: string }) {
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = withTiming(1, { duration: 140 });
  }, [grow]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scaleX: grow.value }] }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: SIZE / 2 - 2,
          left: SIZE,
          width: GAP,
          height: 4,
          backgroundColor: colour,
          transformOrigin: "left center",
        },
        animated,
      ]}
    />
  );
}
