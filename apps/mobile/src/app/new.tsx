import { useState } from "react";
import { TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Label, PrimaryButton, Screen } from "@/components/ui";
import { addHabit } from "@squares/domain/mutations";
import { useStore } from "@squares/domain/store";
import { FS, MONO, useTheme } from "@/platform/theme";

/**
 * Naming a new Habit, and nothing else.
 *
 * Everything about a Habit that already exists — its name, its Streak, its Share
 * Card opt-in, whether it is Hidden — lives on that Habit's own Screen. This
 * Screen has one field because creating a Habit needs one field.
 */
export default function NewHabit() {
  const t = useTheme();
  const router = useRouter();
  const { today, update } = useStore();
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  const save = () => {
    const name = draft.trim();
    if (!name) return;
    update((current) => addHabit(current, name, today));
    // Back to Home rather than into the new Habit's Screen: its opt-ins are off
    // by default on purpose, and the reward is the row appearing with its
    // Square one tap away.
    router.back();
  };

  return (
    <Screen>
      <Label>name</Label>
      {/*
        The field does not take focus by itself, on purpose. It used to on the
        web, and a new Habit then opened with the keyboard already up — which on
        the one Screen a first-time user meets is the keyboard covering the way
        out. One tap on the field is the price of that.
      */}
      <TextInput
        value={draft}
        onChangeText={setDraft}
        maxLength={40}
        placeholder="something you do daily"
        placeholderTextColor={t.faint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={save}
        returnKeyType="done"
        style={{
          marginTop: 8,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: focused ? t.accent : t.lineStrong,
          backgroundColor: t.surfaceInput,
          padding: 14,
          fontFamily: MONO,
          fontSize: FS.md,
          color: t.fg,
        }}
      />
      {/* Nothing here about the Share Card or Streaks. Both default to off, and
          both belong to a Habit that exists — this Screen creates one. */}
      <View style={{ marginTop: 24 }}>
        <PrimaryButton label="save" onPress={save} disabled={draft.trim() === ""} />
      </View>
    </Screen>
  );
}
