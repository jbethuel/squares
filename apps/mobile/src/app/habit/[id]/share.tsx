import { useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Stack, useLocalSearchParams } from "expo-router";
import { LensPicker } from "@/components/LensPicker";
import { Card, Note, NoteFaint, PrimaryButton, Screen } from "@/components/ui";
import { DEFAULT_LENS, lensNoun, type Lens } from "@squares/domain/lens";
import { streakLabel } from "@squares/domain/selectors";
import { habitCardModel } from "@squares/domain/shareCard";
import { useStore } from "@squares/domain/store";
import { useCardExport } from "@/platform/useCardExport";
import { MS, settle } from "@/platform/motion";

/**
 * The Habit Card (ADR 0011). Line for line this is the Overview Card's
 * Screen with one thing swapped: `habitCardModel` instead of `shareCardModel`.
 */
export default function HabitShare() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, today } = useStore();
  const habit = data.habits.find((h) => h.id === id);

  const [lens, setLens] = useState<Lens>(DEFAULT_LENS);
  // ADR 0011: null for a Habit that is Hidden or gone — the same state that
  // Habit's own Screen already treats as nothing to show.
  const model = useMemo(() => habitCardModel(data, id, today, lens), [data, id, today, lens]);
  const { card, status, save } = useCardExport(model);

  if (!model) return null;

  return (
    <Screen>
      <Stack.Screen options={{ title: habit ? `share ${habit.name}` : "share" }} />

      <View style={{ marginBottom: 12 }}>
        <LensPicker
          value={lens}
          onChange={setLens}
          label="days to show on the card"
        />
      </View>

      {card ? (
        <Animated.Image
          key={card.height}
          layout={settle()}
          entering={FadeIn.duration(MS.reveal)}
          accessibilityRole="image"
          accessibilityLabel={`share card: ${model.tally} logs in ${lensNoun(model.lens)}. habits: ${model.names.join(", ")}.${
            model.streak !== null ? ` ${streakLabel(model.streak)}.` : ""
          }`}
          source={{ uri: `data:image/png;base64,${card.base64}` }}
          style={{ width: "100%", aspectRatio: card.width / card.height, borderRadius: 14 }}
        />
      ) : (
        <NoteFaint>squares cannot make the card on this device.</NoteFaint>
      )}

      {/* Always exactly one name, and no anonymous case: ADR 0011 gives a
          Hidden Habit no Habit Card at all, and every other Habit gets one. */}
      <Card style={{ marginTop: 16 }}>
        <Note>this card shows the name of this habit: {model.names.join(", ")}.</Note>
      </Card>

      <View style={{ marginTop: 20 }}>
        <PrimaryButton label="save .png" onPress={() => void save()} />
      </View>

      {status ? (
        <Animated.View entering={FadeIn.duration(MS.reveal)} exiting={FadeOut.duration(MS.reveal)}>
          <NoteFaint style={{ marginTop: 12 }}>{status}</NoteFaint>
        </Animated.View>
      ) : null}
    </Screen>
  );
}
