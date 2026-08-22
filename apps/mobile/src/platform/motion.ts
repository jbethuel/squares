import { useCallback, useState } from "react";
import {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type WithSpringConfig,
  type WithTimingConfig,
} from "react-native-reanimated";

/**
 * How long things take, in one place.
 *
 * These are `globals.css`'s numbers. The web writes them as `transition`
 * durations spread across thirty rules; React Native has no cascade to hold
 * them, so they would otherwise be thirty literals typed on thirty different
 * days — which is exactly the problem the type scale was introduced to end.
 *
 * **Reduced motion is not handled here, and does not need to be.** Reanimated
 * defaults every `withTiming`, `withSpring` and layout builder to
 * `ReduceMotion.System`, so all of this switches itself off when the OS
 * accessibility setting is on. That is the same guarantee `globals.css` gets
 * from its `prefers-reduced-motion` block, and for the same reason: colour is a
 * fact and still snaps in, it is the springs and the slides that go.
 */
export const MS = {
  /** A surface answering a press. Fast enough to read as the press itself. */
  press: 90,
  /** A colour changing because the record changed. */
  fill: 300,
  /** A border following a fill. */
  edge: 160,
  /** A switch sliding. */
  toggle: 160,
  /** Taking a Log back: linear, no overshoot. Administrative. */
  undo: 120,
  /** A block appearing or leaving. */
  reveal: 180,
} as const;

export const TIMING: WithTimingConfig = { duration: MS.edge };

/**
 * The spring the Log lands on.
 *
 * The web releases today's Square from 1.14 with a bezier that passes above 1
 * over 260ms. A spring is that shape stated as physics, which is what React
 * Native has; these numbers are tuned to overshoot once and settle in about the
 * same time.
 */
export const SPRING: WithSpringConfig = { damping: 11, stiffness: 180, mass: 0.6 };

/** A softer spring, for something the size of a button rather than a Square. */
export const SPRING_SOFT: WithSpringConfig = { damping: 18, stiffness: 260, mass: 0.7 };

/**
 * The transition a row uses when the thing above it grew or went away.
 *
 * One shared builder so that a Habit row, a settings block and the grace strip
 * all resettle at the same speed — a list where each item eases differently
 * reads as a list that is broken.
 */
export const settle = () => LinearTransition.duration(MS.reveal);

/**
 * A control that shrinks under the thumb and springs back.
 *
 * Returns the handlers and the style together, because a button that scales on
 * press but never releases is worse than one that never moved: the two halves
 * belong to the same object and are easy to half-wire by hand.
 */
export function usePressScale(to = 0.97) {
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    setPressed(true);
    scale.value = withTiming(to, { duration: MS.press });
  }, [scale, to]);

  const onPressOut = useCallback(() => {
    setPressed(false);
    scale.value = withSpring(1, SPRING_SOFT);
  }, [scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return { pressed, onPressIn, onPressOut, style };
}
