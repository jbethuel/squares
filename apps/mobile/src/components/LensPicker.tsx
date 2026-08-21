import { Pressable, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { LENSES, type Lens } from "@squares/domain/lens";
import * as haptics from "@/platform/haptics";
import { MS } from "@/platform/motion";
import { FS, MONO, useTheme } from "@/platform/theme";

/**
 * Three words above a Heatmap. Deliberately not a chip row like the theme
 * picker in settings: this sits directly above the grid on Home, which the
 * design gives one piece of chrome, so the current Lens is marked by weight and
 * a quiet surface rather than by the accent colour.
 *
 * The surface fades in and out rather than switching. Three of these are on
 * screen at once and the grid under them is redrawing at the same moment; a
 * hard swap on top of that reads as two unrelated things happening.
 */
export function LensPicker({
  value,
  onChange,
  label,
}: {
  value: Lens;
  onChange: (lens: Lens) => void;
  /** Named for assistive tech, since two of these can be on screen in a session. */
  label: string;
}) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{ flexDirection: "row", justifyContent: "flex-end", gap: 2 }}
    >
      {LENSES.map((lens) => (
        <LensButton
          key={lens}
          lens={lens}
          on={value === lens}
          onPress={() => {
            // Nothing to feel when the Lens you tapped is already drawn.
            if (value === lens) return;
            haptics.selected();
            onChange(lens);
          }}
        />
      ))}
    </View>
  );
}

function LensButton({ lens, on, onPress }: { lens: Lens; on: boolean; onPress: () => void }) {
  const t = useTheme();
  const progress = useDerivedValue(() => withTiming(on ? 1 : 0, { duration: MS.edge }), [on]);

  const surface = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ["transparent", t.surfaceRaised]),
  }));
  const text = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [t.dim, t.fg]),
  }));

  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={onPress}>
      <Animated.View
        style={[{ borderRadius: 8, paddingVertical: 6, paddingHorizontal: 9 }, surface]}
      >
        <Animated.Text style={[{ fontFamily: MONO, fontSize: FS.xs }, text]}>{lens}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}
