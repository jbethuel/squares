import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { MS, settle, usePressScale } from "@/platform/motion";
import * as haptics from "@/platform/haptics";
import { FS, MONO, useTheme } from "@/platform/theme";

const TRACK_W = 40;
const TRACK_H = 23;
const PAD = 3;
const KNOB = 17;
/** How far the knob travels: the track, less its padding and its own width. */
const THROW = TRACK_W - PAD * 2 - KNOB;

/**
 * The switch.
 *
 * The web moves the knob by flipping `justify-content`, which no browser
 * animates — so on the web the knob jumps and only the track colour eases. It
 * jumps because CSS cannot do better, not because jumping was the design. Here
 * it slides, over the same 160ms the track already had.
 */
export function Toggle({ on }: { on: boolean }) {
  const t = useTheme();
  const progress = useDerivedValue(() => withTiming(on ? 1 : 0, { duration: MS.toggle }), [on]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [t.trackOff, t.accent]),
  }));

  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * THROW }],
    backgroundColor: interpolateColor(progress.value, [0, 1], [t.knobOff, t.onAccent]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: TRACK_W,
          height: TRACK_H,
          borderRadius: TRACK_H / 2,
          padding: PAD,
          justifyContent: "center",
        },
        track,
      ]}
    >
      <Animated.View style={[{ width: KNOB, height: KNOB, borderRadius: KNOB / 2 }, knob]} />
    </Animated.View>
  );
}

/**
 * A label, an optional hint, and the switch. Matches the settings list row: a
 * switch and a list row are the same kind of thing, on a Habit's Screen as much
 * as in settings.
 */
export function ToggleRow({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string;
  hint?: ReactNode;
  on: boolean;
  onToggle: () => void;
}) {
  const t = useTheme();
  const press = usePressScale();

  return (
    <Animated.View layout={settle()} style={press.style}>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: on }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          haptics.switched();
          onToggle();
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingVertical: 13,
          paddingHorizontal: 14,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: t.line,
          backgroundColor: press.pressed ? t.surfaceOn : t.surface,
        }}
      >
        {/* The hint changes as the switch moves — "stops counting today" becomes
            "off home. past ticks stay." — so the row resettles rather than
            snapping to its new height. */}
        <Animated.View layout={settle()} style={{ flexShrink: 1, gap: 3 }}>
          <Text style={{ fontFamily: MONO, fontSize: FS.md, color: t.fg }}>{label}</Text>
          {hint ? (
            <Text style={{ fontFamily: MONO, fontSize: FS.xs, color: t.muted }}>{hint}</Text>
          ) : null}
        </Animated.View>
        <View>
          <Toggle on={on} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
