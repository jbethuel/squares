import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useRouter } from "expo-router";
import {
  Card,
  Divider,
  ListButton,
  Note,
  NoteFaint,
  PrimaryButton,
  QuietButton,
  Screen,
  SubTitle,
  Chip,
} from "@/components/ui";
import { exportRecord, importRecord } from "@/platform/handoff";
import { setTheme } from "@squares/domain/mutations";
import { hiddenHabits } from "@squares/domain/selectors";
import { useStore } from "@squares/domain/store";
import type { AppData, ThemePreference } from "@squares/domain/types";
import * as haptics from "@/platform/haptics";
import { MS, settle } from "@/platform/motion";
import { FS, MONO, useTheme } from "@/platform/theme";

const THEMES: ThemePreference[] = ["system", "light", "dark"];

/**
 * The rule between two blocks of settings.
 *
 * Every block is a label and the controls under it. Without a rule the label
 * does the whole job of saying where one block ends, and a label reads as a
 * caption on the block *above* it as readily as a heading for the one below —
 * so the export buttons look like they belong to the share card.
 */
function Rule() {
  return <Divider style={{ marginVertical: 22 }} />;
}

export default function Settings() {
  const t = useTheme();
  const router = useRouter();
  const { data, today, update, replace } = useStore();
  const [pending, setPending] = useState<AppData | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const hidden = hiddenHabits(data, today);

  const doExport = async () => {
    /*
      Not "exported". `expo-sharing` resolves the same way whether the file was
      saved or the sheet was swiped away — see `handoff.ts` — so the strongest
      honest claim is that the sheet was opened. The web can say more because
      `navigator.share()` rejects on dismissal; telling someone their year is
      backed up when it is not is the one thing this line must never do.
    */
    setStatus((await exportRecord(data, today)) ? "sent to the share sheet" : null);
  };

  const doImport = async () => {
    setStatus(null);
    const result = await importRecord();
    if (result.kind === "cancelled") return;
    // A refusal is felt as well as read: the line that says why appears at the
    // bottom of a block the thumb is nowhere near.
    if (result.kind === "not-ours") {
      haptics.refused();
      return setStatus("that file is not a squares export");
    }
    if (result.kind === "unreadable") {
      haptics.refused();
      return setStatus("could not read that file");
    }
    // An import replaces the year on this device, and there is no undo, so a
    // year that already has something in it has to be confirmed first.
    if (data.habits.length === 0) {
      replace(result.data);
      setStatus("imported");
      return;
    }
    setPending(result.data);
  };

  return (
    <Screen>
      {/*
        Nothing per-Habit lives here. A Habit's Streak and its Share Card name are
        set on that Habit's own Screen, which is the only place that knows
        anything about one Habit — two places to change one flag is how they
        drift.
      */}
      <SubTitle style={{ marginBottom: 9 }}>share card</SubTitle>
      {/* The line the opt-ins used to carry, now that they are not next to the
          card to say it themselves. */}
      <Note style={{ marginBottom: 10 }}>
        anonymous unless you name a habit on its own screen.
      </Note>
      <ListButton label="make a share card ›" onPress={() => router.push("/share")} />

      <Rule />

      <SubTitle style={{ marginBottom: 9 }}>data · lives on this device only</SubTitle>
      <View style={{ gap: 7 }}>
        <ListButton label="export .json" onPress={() => void doExport()} />
        <ListButton label="import .json" onPress={() => void doImport()} />
      </View>

      {pending ? (
        // The confirm appears under the two buttons and pushes the rest of the
        // Screen down. Sliding it in is the difference between "a question
        // arrived" and "the page changed".
        <Animated.View
          layout={settle()}
          entering={FadeIn.duration(MS.reveal)}
          exiting={FadeOut.duration(MS.reveal)}
        >
        <Card accent style={{ marginTop: 10 }}>
          <Note style={{ marginBottom: 12 }}>
            replace this device&apos;s year with {pending.habits.length} habits and{" "}
            {Object.keys(pending.days).length} logged days? this cannot be undone.
          </Note>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <PrimaryButton
              label="replace"
              style={{ flex: 1 }}
              onPress={() => {
                replace(pending);
                setPending(null);
                setStatus("imported");
              }}
            />
            <QuietButton label="keep mine" style={{ flex: 1 }} onPress={() => setPending(null)} />
          </View>
        </Card>
        </Animated.View>
      ) : null}

      {/*
        No empty stand-in under the buttons. A slot held open for a status that
        is absent almost always is a permanent gap paid for a jump that happens
        on the user's own tap — and with a rule beneath it, the gap reads as
        something missing rather than as breathing room.
      */}
      {status ? (
        <Animated.View
          layout={settle()}
          entering={FadeIn.duration(MS.reveal)}
          exiting={FadeOut.duration(MS.reveal)}
        >
          <NoteFaint style={{ marginTop: 10 }}>{status}</NoteFaint>
        </Animated.View>
      ) : null}

      {/*
        No install block. That was the web asking to be put on the home screen,
        which is what installing this app already did.
      */}

      <Rule />

      {/* No label over this one: the row says "theme" itself, and a heading
          above it saying the same word twice is worse than none. */}
      <View
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
          backgroundColor: t.surface,
        }}
      >
        <Text style={{ fontFamily: MONO, fontSize: FS.md, color: t.fg }}>theme</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {THEMES.map((theme) => (
            <Chip
              key={theme}
              label={theme}
              selected={data.theme === theme}
              onPress={() => update((current) => setTheme(current, theme))}
            />
          ))}
        </View>
      </View>

      <Rule />

      {/*
        Hidden Habits are the one per-Habit thing listed here, and it is not a
        setting — it is the only route back to a Screen Home no longer shows.
        Without it, Hide would be a switch that cannot be moved back.
      */}
      <SubTitle style={{ marginBottom: 9 }}>hidden</SubTitle>
      {/* A Habit taken back out of the Hide leaves this list while the
          Screen is open, so the rows below it close the gap. */}
      <Animated.View layout={settle()} style={{ gap: 7 }}>
        {hidden.map((habit) => (
          <ListButton
            key={habit.id}
            label={`${habit.name} ›`}
            onPress={() => router.push(`/habit/${habit.id}`)}
          />
        ))}
        {hidden.length === 0 ? <NoteFaint>none.</NoteFaint> : null}
      </Animated.View>

      <Rule />

      {/* Below the last rule and under no label: this is what the Screen
          promises, not another thing on it to set. */}
      <NoteFaint>
        no account. no sync. no analytics. uninstalling clears your progress. do frequent backups
        using export .json.
      </NoteFaint>
    </Screen>
  );
}
