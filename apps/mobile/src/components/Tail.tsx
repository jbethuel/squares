import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTheme, type Theme } from "@/platform/theme";

export const TAIL_DAYS = 8;

const SIZE = 15;
const GAP = 4;

interface TailProps {
  /** Offset of the rightmost Square. 0 everywhere: only today can be Logged. */
  base: number;
  elapsed: number;
  isLogged: (offset: number) => boolean;
  /** Bridges are only drawn for a Streak Habit. */
  streaks: boolean;
  pressed: boolean;
  pulse: "log" | "unlog" | null;
}

/**
 * A week and a bit at 15px, doing two jobs at once — which is why it earns the
 * space on Home. It is the Log target (today is the rightmost Square), and it
 * is the Streak preview (consecutive Squares are bridged, so a Streak reads as
 * one object rather than a number).
 *
 * ADR 0002: no Square but the rightmost is a target. A missed Day is drawn the
 * same as any other empty Day, because nothing can be done about it.
 */
export function Tail({ base, elapsed, isLogged, streaks, pressed, pulse }: TailProps) {
  const t = useTheme();
  const squares = [];

  for (let index = TAIL_DAYS - 1; index >= 0; index--) {
    const offset = base + index;
    const target = index === 0;
    const unborn = offset >= elapsed;
    const logged = !unborn && isLogged(offset);
    // The Day to the right of this one, which a bridge would reach across.
    const nextLogged = index > 0 && offset - 1 < elapsed && isLogged(offset - 1);

    squares.push(
      <TailSquare
        key={offset}
        theme={t}
        logged={logged}
        unborn={unborn}
        today={target}
        bridged={logged && nextLogged && streaks}
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
  logged: boolean;
  unborn: boolean;
  today: boolean;
  bridged: boolean;
  pressed: boolean;
  pulse: "log" | "unlog" | null;
}

function TailSquare({
  theme,
  logged,
  unborn,
  today,
  bridged,
  pressed,
  pulse,
}: SquareProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (pressed) {
      scale.value = withTiming(0.9, { duration: 90 });
    } else if (pulse === "log") {
      /*
        The overshoot is the weight. The web releases from 1.14 with a bezier
        that passes above 1; a spring is the same shape stated as physics, and
        is what React Native has. Correcting a mistake is administrative, so an
        unlog takes the linear branch below: no overshoot, no haptic, no echo.
      */
      scale.value = withSequence(
        withTiming(1.14, { duration: 0 }),
        withSpring(1, { damping: 11, stiffness: 180, mass: 0.6 }),
      );
    } else {
      scale.value = withTiming(1, { duration: pulse === "unlog" ? 120 : 260 });
    }
  }, [pressed, pulse, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // A Day that has not happened is outlined, not filled; so is yesterday while
  // it is still open and still empty. Everything else is a shade of the ramp.
  const hollow = unborn;

  return (
    <Animated.View
      style={[
        {
          width: SIZE,
          height: SIZE,
          borderRadius: 4,
          backgroundColor: hollow ? "transparent" : logged ? theme.ramp[3] : theme.ramp[0],
          ...(hollow
            ? {
                borderWidth: 1,
                borderStyle: unborn ? ("dashed" as const) : ("solid" as const),
                borderColor: unborn ? theme.ghost : theme.ring,
              }
            : null),
          // Today's Square carries the ring: it is the Log target.
          ...(today ? { boxShadow: `0 0 0 1.5px ${theme.tailRing}` } : null),
        },
        animated,
      ]}
    >
      {/*
        A Streak reads as one continuous object rather than a number: consecutive
        Squares are bridged, and a Log that extends one visibly grows a limb.
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
