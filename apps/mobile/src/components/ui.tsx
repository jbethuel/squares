import type { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as haptics from "@/platform/haptics";
import { settle, usePressScale } from "@/platform/motion";
import { FS, MONO, useTheme } from "@/platform/theme";

/**
 * The pieces `globals.css` names as classes, as components.
 *
 * The web has one stylesheet every Screen shares, so `.note` is written once and
 * used forty times. React Native has no cascade, so this file is that
 * stylesheet: the type steps, the buttons, the surfaces. A Screen that inlines
 * its own `fontSize: 11` is the phone's version of the seventeen-sizes problem
 * the type scale was introduced to end.
 *
 * Every colour comes from `useTheme()` rather than a module constant, because
 * the Theme can change while the app is open — the switch is on Settings.
 */

/* ---- type ---- */

type TextProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

export function Title({ children, style }: TextProps) {
  const t = useTheme();
  return (
    <Text style={[{ fontFamily: MONO, fontWeight: "700", fontSize: FS.lg, color: t.fg }, style]}>
      {children}
    </Text>
  );
}

/** A heading inside a Screen rather than at the top of one. */
export function SubTitle({ children, style }: TextProps) {
  const t = useTheme();
  return (
    <Text style={[{ fontFamily: MONO, fontWeight: "700", fontSize: FS.md, color: t.fg }, style]}>
      {children}
    </Text>
  );
}

export function Caption({ children, style }: TextProps) {
  const t = useTheme();
  return (
    <Text style={[{ fontFamily: MONO, fontSize: FS.sm, lineHeight: 20, color: t.muted }, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, style }: TextProps) {
  const t = useTheme();
  return (
    <Text style={[{ fontFamily: MONO, fontSize: FS.xs, color: t.dim }, style]}>{children}</Text>
  );
}

export function Note({ children, style }: TextProps) {
  const t = useTheme();
  return (
    <Text style={[{ fontFamily: MONO, fontSize: FS.xs, lineHeight: 19, color: t.muted }, style]}>
      {children}
    </Text>
  );
}

export function NoteFaint({ children, style }: TextProps) {
  const t = useTheme();
  return (
    <Text style={[{ fontFamily: MONO, fontSize: FS.xs, lineHeight: 19, color: t.faint }, style]}>
      {children}
    </Text>
  );
}

/* ---- surfaces ---- */

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ height: 1, backgroundColor: t.line }, style]} />;
}

export function Card({
  children,
  accent = false,
  style,
}: {
  children: ReactNode;
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: 12,
          borderWidth: 1,
          padding: 16,
          borderColor: accent ? t.accentEdge : t.line,
          backgroundColor: accent ? t.surfaceInput : t.surface,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ---- buttons ---- */

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The full-width commit at the bottom of a form.
 *
 * It springs rather than dimming on press. A button this size is the one place
 * the press is worth showing as movement — the row-sized controls elsewhere
 * change surface instead, because a 56px row that shrinks reads as a wobble.
 */
export function PrimaryButton({ label, onPress, disabled, style }: ButtonProps) {
  const t = useTheme();
  const press = usePressScale(0.98);
  return (
    <Animated.View style={[press.style, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          // The tap with a consequence behind it — saving a Habit, replacing a
          // year. `committed` is the heavier knock for exactly this.
          haptics.committed();
          onPress();
        }}
        style={{
          borderRadius: 10,
          borderWidth: 1,
          borderColor: t.accent,
          backgroundColor: t.accent,
          paddingVertical: 15,
          alignItems: "center",
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <Text style={{ fontFamily: MONO, fontWeight: "700", fontSize: FS.sm, color: t.onAccent }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function QuietButton({ label, onPress, disabled, style }: ButtonProps) {
  const t = useTheme();
  const press = usePressScale(0.98);
  return (
    <Animated.View style={[press.style, style]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          // The quiet half of a pair — "keep mine" beside "replace". It is a
          // decision, so it is felt, but it is the one that changes nothing.
          haptics.selected();
          onPress();
        }}
        style={{
          borderRadius: 10,
          borderWidth: 1,
          borderColor: t.lineStrong,
          paddingVertical: 13,
          alignItems: "center",
        }}
      >
        <Text style={{ fontFamily: MONO, fontSize: FS.sm, color: t.muted }}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * A settings row. One step up the scale from the notes and captions around it,
 * because it is the thing being read and tapped rather than something
 * explaining it.
 */
export function ListButton({ label, onPress, style }: ButtonProps) {
  const t = useTheme();
  const press = usePressScale(0.985);
  return (
    // `layout` so a list that gains or loses a row — the Hidden block, when a
    // Habit comes back out of it — closes the gap rather than snapping shut.
    <Animated.View layout={settle()} style={[press.style, style]}>
      <Pressable
        accessibilityRole="button"
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          haptics.selected();
          onPress();
        }}
        style={{
          borderRadius: 10,
          borderWidth: 1,
          borderColor: t.line,
          backgroundColor: press.pressed ? t.surfaceOn : t.surface,
          padding: 14,
        }}
      >
        <Text style={{ fontFamily: MONO, fontSize: FS.md, color: t.fg }}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** 44px of hit box around a visually quiet control. */
export function Chip({
  label,
  onPress,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  const t = useTheme();
  const press = usePressScale(0.94);
  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          // A chip is either one of a set of options — the Theme picker — or
          // the way to another Screen. Both are the selection click rather than
          // an impact.
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
          paddingHorizontal: 12,
          borderColor: selected ? t.accent : t.lineStrong,
          backgroundColor: selected ? t.accent : "transparent",
        }}
      >
        <Text style={{ fontFamily: MONO, fontSize: FS.xs, color: selected ? t.onAccent : t.muted }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/* ---- the Screen itself ---- */

/**
 * The scroll container every Screen sits in.
 *
 * The web's `.app` pads 20px and leaves room at the bottom for the fixed back
 * bar. There is no bar here — ADR 0006 traded it for the platform header — so
 * the bottom padding is the safe-area inset plus the same air, which on a phone
 * with a home indicator is about what the bar used to occupy anyway.
 *
 * `bare` is for a Screen with no header above it, which is Home and only Home.
 * Everywhere else the native header has already taken the status bar's room,
 * and paying for it twice drops the first line half an inch down the Screen.
 */
export function Screen({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{
        padding: 20,
        paddingTop: 20 + (bare ? insets.top : 0),
        paddingBottom: 24 + insets.bottom,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export const gap = (size: number) => StyleSheet.create({ s: { gap: size } }).s;
