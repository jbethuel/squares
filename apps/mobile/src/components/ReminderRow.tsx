import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import DateTimePicker from "@react-native-community/datetimepicker";
import { DEFAULT_TIME, type TimeOfDay } from "@squares/domain/reminders";
import { Toggle } from "@/components/Toggle";
import * as haptics from "@/platform/haptics";
import { MS, settle, usePressScale } from "@/platform/motion";
import { FS, MONO, useTheme } from "@/platform/theme";

/**
 * Zero-padded and on the 24-hour clock, whatever the device reads elsewhere.
 *
 * The OS dialog takes the time in whichever form this user set, so the entry is
 * already theirs; this is the read-back, and it sits in a monospace column with
 * `YYYY-MM-DD` Days. A width that changes with the hour would make the one
 * number on the row jump as it is set.
 */
function clock(time: TimeOfDay): string {
  return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
}

/** The picker wants a Date. Only the clock fields are read back off it. */
function asDate(time: TimeOfDay): Date {
  const date = new Date();
  date.setHours(time.hour, time.minute, 0, 0);
  return date;
}

/**
 * A Reminder: the switch that turns it on, and the time it is set to.
 *
 * `time` is the whole state — null is off. ADR 0008 keeps a Reminder out of the
 * record, so there is no flag here that can disagree with a time, exactly as
 * there is none in `ReminderSettings`.
 *
 * `onSet` resolves false when the user refuses the notification permission.
 * That is why it is awaited rather than fired: the row has to stay off, and say
 * why, instead of showing a switch that is on above an alarm that cannot sound.
 */
export function ReminderRow({
  label,
  hint,
  time,
  onSet,
}: {
  label: string;
  hint?: string;
  time: TimeOfDay | null;
  onSet: (time: TimeOfDay | null) => Promise<boolean>;
}) {
  const t = useTheme();
  const press = usePressScale();
  const [picking, setPicking] = useState(false);
  const [refused, setRefused] = useState(false);
  const on = time !== null;

  const toggle = async () => {
    haptics.switched();
    setRefused(!(await onSet(on ? null : DEFAULT_TIME)) && !on);
  };

  return (
    <Animated.View layout={settle()}>
      <Animated.View layout={settle()} style={press.style}>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityState={{ checked: on }}
          accessibilityHint={on ? `set for ${clock(time)}` : undefined}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          onPress={() => void toggle()}
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
            backgroundColor: press.pressed ? t.surfaceOn : t.surface,
          }}
        >
          <Animated.View layout={settle()} style={{ flexShrink: 1, gap: 3 }}>
            <Text style={{ fontFamily: MONO, fontSize: FS.md, color: t.fg }}>{label}</Text>
            {/*
              The refusal replaces the hint rather than stacking under it. It is
              the only thing worth reading on the row at that moment, and it
              goes when the switch is tried again.
            */}
            {refused ? (
              <Text style={{ fontFamily: MONO, fontSize: FS.xs, color: t.muted }}>
                notifications are off for squares. turn them on in settings.
              </Text>
            ) : hint ? (
              <Text style={{ fontFamily: MONO, fontSize: FS.xs, color: t.muted }}>{hint}</Text>
            ) : null}
          </Animated.View>
          <View>
            <Toggle on={on} />
          </View>
        </Pressable>
      </Animated.View>

      {/*
        The time is its own control below the switch, not a second tap target
        inside it. Nesting one Pressable in another means the row scales under a
        press meant for the chip, and a switch you can miss by 8px is worse than
        a chip on its own line.
      */}
      {on ? (
        <Animated.View
          layout={settle()}
          entering={FadeIn.duration(MS.reveal)}
          exiting={FadeOut.duration(MS.reveal)}
          style={{ flexDirection: "row", marginTop: 7 }}
        >
          <TimeChip label={clock(time)} onPress={() => setPicking(true)} />
        </Animated.View>
      ) : null}

      {/*
        Mounting the picker is what opens it. On Android that is the platform
        clock dialog; on iOS it is an inline spinner, which is why it is mounted
        under the row rather than over it. iOS is not in v1 — AGENTS.md only
        says nothing here may assume it never arrives.
      */}
      {picking ? (
        <DateTimePicker
          value={asDate(time ?? DEFAULT_TIME)}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, picked) => {
            setPicking(false);
            // 'dismissed' is a cancel, and carries no date. Setting the time it
            // was already on would be harmless; scheduling on it would not.
            if (event.type !== "set" || !picked) return;
            void onSet({ hour: picked.getHours(), minute: picked.getMinutes() });
          }}
        />
      ) : null}
    </Animated.View>
  );
}

/**
 * The time, as a button. `Chip` in `ui.tsx` is the selected-one-of-a-set
 * control — the Theme picker and the Lens — and this is neither: it is always
 * the one value, and pressing it opens a dialog rather than choosing anything.
 */
function TimeChip({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  const press = usePressScale(0.94);
  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`reminder time, ${label}`}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          haptics.selected();
          onPress();
        }}
        style={{
          minHeight: 44,
          minWidth: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          borderWidth: 1,
          paddingHorizontal: 14,
          borderColor: t.accentEdge,
          backgroundColor: press.pressed ? t.surfaceOn : "transparent",
        }}
      >
        <Text style={{ fontFamily: MONO, fontSize: FS.md, color: t.fg }}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}
