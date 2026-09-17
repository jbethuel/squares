import { useState } from "react";
import { TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Card, Label, Note, NoteFaint, PrimaryButton, QuietButton, Screen } from "@/components/ui";
import { addHabit } from "@squares/domain/mutations";
import { DEFAULT_TIME } from "@squares/domain/reminders";
import { useStore } from "@squares/domain/store";
import { MS, settle } from "@/platform/motion";
import { useReminders } from "@/platform/useReminders";
import { FS, MONO, useTheme } from "@/platform/theme";

const DEFAULT_CLOCK = `${String(DEFAULT_TIME.hour).padStart(2, "0")}:${String(DEFAULT_TIME.minute).padStart(2, "0")}`;

/**
 * Naming a new Habit, and nothing else.
 *
 * Everything about a Habit that already exists — its name, its Streak, its Share
 * Card opt-in, whether it is Hidden — lives on that Habit's own Screen. This
 * Screen has one field because creating a Habit needs one field.
 *
 * The one exception is the Daily Reminder, and it is the exception ADR 0008
 * names: the app asks once, as the first Habit is made. Not a setting on this
 * Screen — a question, asked after the Habit exists and answered on the way out.
 */
export default function NewHabit() {
  const t = useTheme();
  const router = useRouter();
  const { data, today, update } = useStore();
  const reminders = useReminders();
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  /**
   * "open" is the question; "refused" is the question answered yes and the
   * permission then declined, which has to be said rather than navigated past.
   */
  const [ask, setAsk] = useState<"hidden" | "open" | "refused">("hidden");

  const save = () => {
    const name = draft.trim();
    if (!name) return;
    // Read before the write: after it there is one Habit, and "is this the
    // first" can no longer be asked.
    const first = data.habits.length === 0;
    update((current) => addHabit(current, name, today));
    // Back to Home rather than into the new Habit's Screen: its opt-ins are off
    // by default on purpose, and the reward is the row appearing with its
    // Square one tap away.
    if (!first || reminders.asked) return router.back();
    setAsk("open");
  };

  /**
   * ADR 0008: to ask is not to turn on. Both answers record that the question
   * was put, so neither is asked again; only one of them sets a time.
   */
  const answer = async (wanted: boolean) => {
    reminders.recordAsked();
    if (wanted && !(await reminders.setDaily(DEFAULT_TIME))) return setAsk("refused");
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
        placeholder="example: read 10 pages"
        placeholderTextColor={t.faint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={save}
        returnKeyType="done"
        editable={ask === "hidden"}
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
      {ask === "hidden" ? (
        <View style={{ marginTop: 24 }}>
          <PrimaryButton label="save" onPress={save} disabled={draft.trim() === ""} />
        </View>
      ) : null}

      {/*
        The Habit is already saved by the time this appears. Answering it either
        way goes Home; there is no way to lose the Habit here, which is why the
        question can be asked at all rather than folded into the form above.
      */}
      {ask !== "hidden" ? (
        <Animated.View
          layout={settle()}
          entering={FadeIn.duration(MS.reveal)}
          exiting={FadeOut.duration(MS.reveal)}
        >
          <Card accent style={{ marginTop: 24 }}>
            {ask === "open" ? (
              <>
                {/*
                  Why this is worth one question: ADR 0002 means a missed Day
                  cannot be filled in later, so the Reminder is the only
                  protection there is — and a protection nobody knows about
                  protects nobody.
                */}
                <Note style={{ marginBottom: 6 }}>
                  you can log a habit only on the same day. after midnight, you cannot change that
                  day.
                </Note>
                <NoteFaint style={{ marginBottom: 14 }}>
                  a daily reminder sends one notification each day at {DEFAULT_CLOCK}. it does not
                  show the names of your habits. you can change the time in settings.
                </NoteFaint>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <PrimaryButton
                    label="remind me"
                    style={{ flex: 1 }}
                    onPress={() => void answer(true)}
                  />
                  <QuietButton
                    label="no thanks"
                    style={{ flex: 1 }}
                    onPress={() => void answer(false)}
                  />
                </View>
              </>
            ) : (
              <>
                {/*
                  Said rather than skipped past. The user agreed and the OS
                  refused, so going Home in silence would leave them believing a
                  Reminder is set.
                */}
                <Note style={{ marginBottom: 14 }}>
                  squares cannot send notifications, so the daily reminder is off. to turn it on,
                  first allow notifications for squares in the settings of your phone. then turn on
                  the daily reminder in squares settings.
                </Note>
                <PrimaryButton label="ok" onPress={() => router.back()} />
              </>
            )}
          </Card>
        </Animated.View>
      ) : null}
    </Screen>
  );
}
