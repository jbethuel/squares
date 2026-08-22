import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { HabitRow } from "@/components/HabitRow";
import { Heatmap } from "@/components/Heatmap";
import { LensPicker } from "@/components/LensPicker";
import { Total } from "@/components/Total";
import { Caption, Chip, Divider, Label, Screen } from "@/components/ui";
import { weekdayOf, type DateKey } from "@squares/domain/date";
import {
  DEFAULT_LENS,
  lensFrame,
  lensLegend,
  lensMonths,
  lensNoun,
  lensRows,
  lensScrolls,
  type Lens,
} from "@squares/domain/lens";
import { toggleLog } from "@squares/domain/mutations";
import {
  dateAt,
  elapsedDays,
  intensityAt,
  visibleHabits,
  totalLogs,
  totalLogsIn,
} from "@squares/domain/selectors";
import { useStore } from "@squares/domain/store";
import * as haptics from "@/platform/haptics";
import { MS, settle, usePressScale } from "@/platform/motion";
import { FS, MONO, useTheme } from "@/platform/theme";

const ECHO_MS = 300;

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const { data, today, update } = useStore();
  const [echo, setEcho] = useState(false);
  const [lens, setLens] = useState<Lens>(DEFAULT_LENS);
  const echoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(echoTimer.current), []);

  const elapsed = elapsedDays(data, today);
  const habits = visibleHabits(data, today);

  const handleLog = useCallback(
    (habitId: string, date: DateKey, turnedOn: boolean) => {
      update((current) => toggleLog(current, habitId, date, today));
      // The echo: in the same frame, today's Square in the Overview steps up
      // one Intensity level and flashes a ring in the top shade. Not staggered
      // — the same event happening in two places.
      if (turnedOn && date === today) {
        setEcho(true);
        clearTimeout(echoTimer.current);
        echoTimer.current = setTimeout(() => setEcho(false), ECHO_MS);
      }
    },
    [update, today],
  );

  const frame = lensFrame(lens, today);
  const legend = lensLegend(lens);

  return (
    <Screen bare>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        {/*
          The Total is the year's under every Lens. A Total scoped to the week
          would fall to zero every Sunday, and nothing that can go to zero is on
          Home — the Lens redraws the grid, it does not rescore it.
        */}
        <View>
          <Total value={totalLogs(data, today)} />
          {/* No span on day one: "last 1 days" is wrong and "last 1 day" is
              sad. On the first morning the word alone is the whole caption. */}
          <Caption style={{ marginTop: 5 }}>
            {elapsed === 1 ? "logs" : `logs · last ${elapsed} days`}
          </Caption>
        </View>
        {/* One chip is all the chrome Home gets. The Share Card lives in
            settings, next to the name opt-ins that govern it. */}
        <Chip label="settings" onPress={() => router.push("/settings")} />
      </View>

      <View style={{ marginBottom: 8 }}>
        <LensPicker value={lens} onChange={setLens} label="how much of the record to draw" />
      </View>

      <Heatmap
        frame={frame}
        weekday={weekdayOf(today)}
        rows={lensRows(lens)}
        scrolls={lensScrolls(lens)}
        today={today}
        months={lensMonths(lens)}
        levelFor={(offset) => intensityAt(data, dateAt(today, offset), today)}
        // Logs are counted over the part of the frame that has happened: the
        // rest of it has nothing in it yet by definition.
        label={`Overview heatmap: ${totalLogsIn(data, today, frame.back)} logs across ${lensNoun(lens)}`}
        markToday
        echo={echo}
      />

      {/*
        Only the Week keeps a legend. The Year and the Month name their own edges
        above the grid, and two lines answering "where does this start" is one
        line too many. The Week's ends are the one thing the names on top cannot
        say: `mon wed fri` does not tell you the row runs Sunday to Saturday.
      */}
      {legend ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 9 }}>
          <Label>{legend.start}</Label>
          <Label>{legend.note}</Label>
          <Label>{legend.end}</Label>
        </View>
      ) : null}

      <Divider style={{ marginTop: 22, marginBottom: 16 }} />

      <Animated.View layout={settle()} style={{ gap: 8 }}>
        {habits.map((habit) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            data={data}
            today={today}
            elapsed={elapsed}
            offset={0}
            onLog={handleLog}
            onOpen={(id) => router.push(`/habit/${id}`)}
          />
        ))}
        <AddRow
          label={habits.length === 0 ? "name your first habit" : "+ new habit"}
          onPress={() => router.push("/new")}
        />
      </Animated.View>

      {/* The one line Home carries, and only while there is nothing else to
          read. Once a Habit exists the rows are the instructions. */}
      {habits.length === 0 ? (
        <Animated.Text
          layout={settle()}
          exiting={FadeOut.duration(MS.reveal)}
          style={{
            fontFamily: MONO,
            fontSize: FS.xs,
            lineHeight: 19,
            color: t.dim,
            textAlign: "center",
            marginTop: 20,
          }}
        >
          three is the ceiling. start with one.
        </Animated.Text>
      ) : null}
    </Screen>
  );
}

/** The one affordance the design does not have, and the app cannot do without. */
function AddRow({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  const press = usePressScale(0.985);
  return (
    <Animated.View layout={settle()} style={press.style}>
      <Pressable
        accessibilityRole="button"
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          haptics.selected();
          onPress();
        }}
        style={{
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: t.lineStrong,
        }}
      >
        <Text style={{ fontFamily: MONO, fontSize: FS.sm, color: t.muted }}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}
