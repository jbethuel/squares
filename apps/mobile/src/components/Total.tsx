import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { FS, MONO, useTheme } from "@/platform/theme";

/** The Total rolls in behind the Square that caused it. */
const ROLL_DELAY_MS = 180;

/**
 * The number of Logs across all Habits in the last year. It only ever rises,
 * and nothing can break it — which is the whole reason it, and not a streak,
 * is the hero number on Home.
 *
 * Only the digits that changed animate. A Total going 99 → 100 rolls all three;
 * going 41 → 42 rolls the one that moved, and the 4 stays put, because rolling
 * the whole number for a single Log reads as the figure being replaced rather
 * than incremented.
 */
export function Total({ value }: { value: number }) {
  const t = useTheme();
  const [shown, setShown] = useState(value);
  const previous = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (value === shown) return;
    const timer = setTimeout(() => {
      previous.current = shown;
      setShown(value);
    }, ROLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value, shown]);

  const digits = String(shown).split("");
  const before = previous.current === undefined ? null : String(previous.current).split("");

  return (
    <View style={{ flexDirection: "row" }}>
      {digits.map((digit, index) => {
        const fromRight = digits.length - 1 - index;
        const was = before?.[before.length - 1 - fromRight];
        const changed = was !== undefined && was !== digit;
        const style = {
          fontFamily: MONO,
          fontWeight: "700" as const,
          fontSize: FS.hero,
          lineHeight: FS.hero,
          letterSpacing: -1.5,
          color: t.fg,
          fontVariant: ["tabular-nums" as const],
        };
        return changed ? (
          <Animated.Text key={`${fromRight}-${digit}`} entering={FadeInUp.duration(200)} style={style}>
            {digit}
          </Animated.Text>
        ) : (
          <Text key={`${fromRight}-${digit}`} style={style}>
            {digit}
          </Text>
        );
      })}
    </View>
  );
}
