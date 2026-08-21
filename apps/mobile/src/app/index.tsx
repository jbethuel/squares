import { StyleSheet, Text, View } from "react-native";
import { useStore } from "@squares/domain/store";
import { intensityAt } from "@squares/domain/selectors";
import { totalTicks } from "@squares/domain/selectors";
import { RAMP, SURFACE } from "@/platform/theme";

/**
 * Scaffold Home. Not the design — the Heatmap, the Tail and the Total all still
 * have to be built in React Native primitives — but it renders real numbers from
 * the real record through the shared rules, which is what this scaffold is for.
 */
export default function Home() {
  const { data, today } = useStore();
  const total = totalTicks(data, today);

  return (
    <View style={styles.screen}>
      <Text style={styles.total}>{total}</Text>
      <Text style={styles.caption}>
        {total === 1 ? "tick" : "ticks"} in the last year
      </Text>

      {/* The ramp, straight from the shared palette. Proof the colours crossed. */}
      <View style={styles.ramp}>
        {RAMP.dark.map((colour, level) => (
          <View key={level} style={[styles.square, { backgroundColor: colour }]} />
        ))}
      </View>

      <Text style={styles.caption}>
        today is {today}, at intensity {intensityAt(data, today)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: SURFACE.bg,
  },
  total: { color: SURFACE.fg, fontSize: 48, fontVariant: ["tabular-nums"] },
  caption: { color: SURFACE.muted, fontSize: 13 },
  ramp: { flexDirection: "row", gap: 4, marginVertical: 16 },
  square: { width: 24, height: 24, borderRadius: 5 },
});
