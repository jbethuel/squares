import { useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { LensPicker } from "@/components/LensPicker";
import { Card, Note, NoteFaint, PrimaryButton, Screen } from "@/components/ui";
import { DEFAULT_LENS, lensNoun, type Lens } from "@squares/domain/lens";
import { shareCardModel } from "@squares/domain/shareCard";
import { useStore } from "@squares/domain/store";
import { useCardExport } from "@/platform/useCardExport";
import { MS, settle } from "@/platform/motion";

export default function Share() {
  const { data, today } = useStore();

  // The card's own Lens. It is picked here rather than inherited from Home,
  // which this Screen is not reached from — a card that quietly depended on
  // what another Screen was last showing would be a card you cannot predict.
  const [lens, setLens] = useState<Lens>(DEFAULT_LENS);
  const model = useMemo(() => shareCardModel(data, today, lens), [data, today, lens]);
  const { card, status, save } = useCardExport(model);

  return (
    <Screen>
      <View style={{ marginBottom: 12 }}>
        <LensPicker
          value={lens}
          onChange={setLens}
          label="days to show on the card"
        />
      </View>

      {card ? (
        // Keyed on the card itself so a new Lens fades its card in rather than
        // swapping the image under a fixed frame — the card changes height as
        // well as content, and `layout` carries everything below it down.
        <Animated.Image
          key={card.height}
          layout={settle()}
          entering={FadeIn.duration(MS.reveal)}
          accessibilityRole="image"
          accessibilityLabel={`share card: ${model.tally} logs in ${lensNoun(model.lens)}.${
            model.names.length > 0 ? ` habits: ${model.names.join(", ")}.` : ""
          }`}
          source={{ uri: `data:image/png;base64,${card.base64}` }}
          style={{ width: "100%", aspectRatio: card.width / card.height, borderRadius: 14 }}
        />
      ) : (
        <NoteFaint>this device can&apos;t draw the card.</NoteFaint>
      )}

      {/*
        What is on the card, in words, before it is saved. ADR 0010: naming is
        unconditional, so this is a statement of fact rather than a control —
        Hide, on each Habit's own Screen, is the only way to keep one off.
      */}
      <Card style={{ marginTop: 16 }}>
        {model.names.length === 0 ? (
          <Note>no habits yet. add one on home to fill this card.</Note>
        ) : (
          <Note>your habit {model.names.length === 1 ? "name appears" : "names appear"} on this card:{" "}
            {model.names.join(", ")}.</Note>
        )}
      </Card>

      {/* One button, because on a phone the two were the same act. The share
          sheet is where "save to photos" and "save to files" both live. */}
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
