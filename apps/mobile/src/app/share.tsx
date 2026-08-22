import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { LensPicker } from "@/components/LensPicker";
import { Card, Note, NoteFaint, PrimaryButton, Screen } from "@/components/ui";
import { exportCard } from "@/platform/handoff";
import { renderShareCard } from "@/platform/shareCardSkia";
import { DEFAULT_LENS, lensNoun, type Lens } from "@squares/domain/lens";
import { visibleHabits } from "@squares/domain/selectors";
import { shareCardModel } from "@squares/domain/shareCard";
import { useStore } from "@squares/domain/store";
import * as haptics from "@/platform/haptics";
import { MS, settle } from "@/platform/motion";
import { FS, MONO, useTheme } from "@/platform/theme";

export default function Share() {
  const t = useTheme();
  const router = useRouter();
  const { data, today } = useStore();
  const [status, setStatus] = useState<string | null>(null);

  // The card's own Lens. It is picked here rather than inherited from Home,
  // which this Screen is not reached from — a card that quietly depended on
  // what another Screen was last showing would be a card you cannot predict.
  const [lens, setLens] = useState<Lens>(DEFAULT_LENS);
  const model = useMemo(() => shareCardModel(data, today, lens), [data, today, lens]);
  // Drawn once. What is on screen is the PNG that gets saved, not a second
  // rendering of it that could disagree.
  const card = useMemo(() => renderShareCard(model), [model]);
  // The Habits behind the names on the card. Hidden Habits are never named,
  // so every one of these still has a live Screen to open.
  const named = visibleHabits(data, today).filter((habit) => habit.sharedName);

  const save = async () => {
    if (!card) return;
    // Where the device offers a sheet this is that sheet, driven by the user.
    // The app never posts anything itself. As on Settings, the claim stops at
    // what the API actually reports — see `handoff.ts`.
    setStatus((await exportCard(card.base64)) ? "sent to the share sheet" : null);
  };

  return (
    <Screen>
      <View style={{ marginBottom: 12 }}>
        <LensPicker
          value={lens}
          onChange={setLens}
          label="how much of the record to put on the card"
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
          accessibilityLabel={`Share card: ${model.tally} logs across ${lensNoun(model.lens)}${
            model.names.length > 0 ? `, naming ${model.names.join(", ")}` : ", no habit names"
          }`}
          source={{ uri: `data:image/png;base64,${card.base64}` }}
          style={{ width: "100%", aspectRatio: card.width / card.height, borderRadius: 14 }}
        />
      ) : (
        <NoteFaint>the card could not be drawn on this device.</NoteFaint>
      )}

      {/*
        What is on the card, in words, before it is saved. The card is anonymous
        by default and this is the line that proves it — a card that leaks a name
        is the one unforgivable bug, so the answer is never more than one glance
        away.
      */}
      {/* The disclosure grows a line for every Named Habit, so it resettles
          rather than shunting the save button down. */}
      <Card style={{ marginTop: 16 }}>
        {model.names.length === 0 ? (
          <Note>no habit names on this card. a year of shape and one number.</Note>
        ) : (
          <>
            {/*
              Each name is the way to its own opt-in. Withdrawing a name is the
              safety-critical act in this app, so it is one tap from the card
              that carries it — read the name here, tap it, and the switch that
              removes it is the next thing on the screen.
            */}
            <Note style={{ marginBottom: 8 }}>
              this card names{" "}
              {named.map((habit, index) => (
                <Text key={habit.id}>
                  {index > 0 ? " · " : null}
                  <Text
                    accessibilityRole="button"
                    onPress={() => {
                      haptics.selected();
                      router.push(`/habit/${habit.id}`);
                    }}
                    style={{
                      fontFamily: MONO,
                      fontSize: FS.xs,
                      color: t.streakFg,
                      textDecorationLine: "underline",
                    }}
                  >
                    {habit.name.trim().toLowerCase()}
                  </Text>
                </Text>
              ))}
              . everything else stays anonymous.
            </Note>
            <NoteFaint>tap a name to stop naming it.</NoteFaint>
          </>
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
