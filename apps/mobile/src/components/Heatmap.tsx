import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { monthLabels, weekdayLabels, type AxisLabel } from "@squares/domain/axis";
import { monthYearLabel, type DateKey } from "@squares/domain/date";
import {
  AXIS_GUTTER,
  CALENDAR_ROWS,
  gridGeometry,
  gridHeight,
  gridSquares,
  gridWidth,
  scrollGeometry,
  type Frame,
  type GridGeometry,
} from "@squares/domain/grid";
import type { MonthAxis } from "@squares/domain/lens";
import type { Intensity } from "@squares/domain/types";
import { MS } from "@/platform/motion";
import { FS, MONO, useTheme, type Theme } from "@/platform/theme";

/** The strip of names above the grid. Empty, it still holds the gutter level. */
const STRIP_H = 15;

interface HeatmapProps {
  /** The run of Days to draw. Every Day in it gets a Square. */
  frame: Frame;
  /** Today's weekday, 0 = Sunday, which fixes today's row in its column. */
  weekday: number;
  /** Seven for a calendar block, one for a Week on its side. See `lensRows`. */
  rows?: number;
  /** Draw at a fixed Square size and run off the side. The Year does this. */
  scrolls?: boolean;
  today: DateKey;
  months?: MonthAxis;
  levelFor: (offset: number) => Intensity;
  label: string;
  /** Ring today's Square. */
  markToday?: boolean;
  /** Flash today's Square in the top shade: the echo of a Tick. */
  echo?: boolean;
}

/**
 * The Heatmap, in React Native primitives.
 *
 * Everything about where a Square goes is answered in `@squares/domain/grid`
 * and `@squares/domain/axis`, exactly as it is for the web — this component
 * only places what comes back. That is the whole point of the seam: a Square
 * that lands in the wrong column here would have to land in the wrong column
 * there too.
 *
 * The web draws the grid as CSS grid and positions the names in px off the same
 * `size + gap` step. There is no CSS grid here, so the Squares are positioned in
 * px off that step as well, which makes the two implementations closer rather
 * than further apart: one layout rule, applied twice.
 */
export function Heatmap({
  frame,
  weekday,
  rows = CALENDAR_ROWS,
  scrolls = false,
  today,
  months = "none",
  levelFor,
  label,
  markToday = false,
  echo = false,
}: HeatmapProps) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const { back, ahead } = frame;

  // The weekday names run down the side of a calendar block. On a scrolling
  // grid they sit outside the scroller and stay put; on a fitted one they take
  // their room out of the width. In the Week's single row they go on top.
  const sideAxis = rows > 1;

  const geometry: GridGeometry | null = useMemo(
    () =>
      scrolls
        ? scrollGeometry({ back, ahead }, weekday, rows)
        : width > 0
          ? gridGeometry(width - (sideAxis ? AXIS_GUTTER : 0), { back, ahead }, weekday, rows)
          : null,
    [scrolls, width, back, ahead, weekday, rows, sideAxis],
  );

  const squares = useMemo(
    () => (geometry ? gridSquares(geometry.cols, { back, ahead }, weekday, rows) : []),
    [geometry, back, ahead, weekday, rows],
  );

  const step = geometry ? geometry.size + geometry.gap : 0;

  const topLabels = useMemo((): AxisLabel[] => {
    if (step === 0) return [];
    // A one-row Week has no side to put weekdays on, so they go up here.
    if (rows === 1) return weekdayLabels();
    if (months === "months") return monthLabels(squares, today, step);
    if (months === "month") return [{ track: 0, text: monthYearLabel(today) }];
    return [];
  }, [today, rows, months, squares, step]);

  /*
    How far the grid sits from the left of the space it was given. Squares cap
    at MAX_SQUARE, so under the Week and the Month the grid is narrower than its
    container and is centred. The names are positioned in px and have to start
    from the same place, or a month name floats half a grid away from the month
    it names. A scrolling grid starts hard left and has no inset.
  */
  const inset =
    geometry && !scrolls ? (width - (sideAxis ? AXIS_GUTTER : 0) - gridWidth(geometry)) / 2 : 0;

  // A Frame that runs off the side opens at its newest end. The record reads
  // right to left the way it is written — today first, and the year behind it.
  const openAtToday = useCallback(() => {
    if (scrolls) scroller.current?.scrollToEnd({ animated: false });
  }, [scrolls]);

  const strip =
    geometry && topLabels.length > 0 ? (
      <View style={{ height: STRIP_H, width: geometry ? gridWidth(geometry) + inset : 0 }}>
        {topLabels.map((axisLabel) => (
          // Keyed by track, not text: a rolling year starts and ends in the
          // same month, so "aug" can legitimately appear twice.
          <Text
            key={axisLabel.track}
            numberOfLines={1}
            style={{
              position: "absolute",
              left: inset + axisLabel.track * step,
              top: 0,
              fontFamily: MONO,
              fontSize: FS.xs,
              lineHeight: FS.xs,
              color: t.dim,
            }}
          >
            {axisLabel.text}
          </Text>
        ))}
      </View>
    ) : null;

  const grid = geometry ? (
    <Animated.View
      /*
        Keyed on the shape rather than on the Lens, which this component is not
        told. A Lens change rebuilds the geometry from the ground up — different
        Square size, different column count — so there is nothing to tween
        between; the honest transition is the new grid arriving. Ticking does
        not change any of these, so a Tick never remounts the year.
      */
      key={`${rows}-${scrolls}-${back}-${ahead}`}
      entering={FadeIn.duration(MS.reveal)}
      style={{ width: gridWidth(geometry), height: gridHeight(geometry), marginLeft: inset }}
    >
      {squares.map((square) => {
        // Only there to complete a column — outside the frame entirely.
        if (square.kind !== "framed") return null;
        const box = {
          position: "absolute" as const,
          left: square.column * step,
          top: square.row * step,
          width: geometry.size,
          height: geometry.size,
          borderRadius: geometry.radius,
        };
        /*
          Today is the only Square that ever changes while it is on screen, so
          it is the only animated one. A Frame is up to 365 Squares and giving
          every one of them its own animation hook to watch a colour that
          cannot change would cost the whole year to move one Day.
        */
        if (square.offset === 0 && markToday) {
          return <Today key={square.key} theme={t} level={levelFor(0)} echo={echo} box={box} />;
        }
        return (
          <View key={square.key} style={[box, { backgroundColor: t.ramp[levelFor(square.offset)] }]} />
        );
      })}
    </Animated.View>
  ) : null;

  const body = (
    <View style={{ flex: 1, minWidth: 0 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {scrolls ? (
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={openAtToday}
        >
          <View>
            {strip}
            {grid}
          </View>
        </ScrollView>
      ) : (
        <View>
          {strip}
          {grid}
        </View>
      )}
    </View>
  );

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ flexDirection: "row", minHeight: 44 }}
    >
      {/*
        The weekday names sit outside the scroller, so they stay put while the
        Year runs past them. A gutter that scrolled away with the grid would
        leave the rows unlabelled exactly when you had scrolled far enough to
        lose track.
      */}
      {geometry && sideAxis ? (
        <View style={{ width: AXIS_GUTTER }}>
          {/* Empty, and the same height as the strip: it drops the weekday
              names to sit level with the grid rather than with the month names
              beside them. */}
          {strip ? <View style={{ height: STRIP_H }} /> : null}
          <View style={{ height: gridHeight(geometry) }}>
            {weekdayLabels().map((axisLabel) => (
              <Text
                key={axisLabel.track}
                numberOfLines={1}
                style={{
                  position: "absolute",
                  top: axisLabel.track * step + geometry.size / 2 - FS.xs / 2,
                  fontFamily: MONO,
                  fontSize: FS.xs,
                  lineHeight: FS.xs,
                  color: t.dim,
                }}
              >
                {axisLabel.text}
              </Text>
            ))}
          </View>
        </View>
      ) : null}
      {body}
    </View>
  );
}

/**
 * Today's Square: the other half of the echo.
 *
 * A Tick lands in two places at once — the Tail in the row, and this. The web
 * eases the fill over 300ms and the ring over 320ms, and flashes the ring in
 * the top shade for the length of the echo. Both rings are drawn as overlays
 * rather than as a border: a border in React Native is inset, which would make
 * today read a size smaller than every other Day.
 */
function Today({
  theme,
  level,
  echo,
  box,
}: {
  theme: Theme;
  level: number;
  echo: boolean;
  box: {
    position: "absolute";
    left: number;
    top: number;
    width: number;
    height: number;
    borderRadius: number;
  };
}) {
  const colour = theme.ramp[level]!;
  // The shade this Square is easing *from*. Held in state as well as a ref so
  // that the worklet reading it re-runs with the old colour still available:
  // interpolating a colour to itself is a no-op, which is the easy way to write
  // this and have it silently snap.
  const previous = useRef(colour);
  const [from, setFrom] = useState(colour);
  const progress = useSharedValue(1);
  const flash = useDerivedValue(() => withTiming(echo ? 1 : 0, { duration: MS.fill }), [echo]);

  useEffect(() => {
    if (previous.current === colour) return;
    setFrom(previous.current);
    previous.current = colour;
    progress.value = 0;
    progress.value = withTiming(1, { duration: MS.fill });
  }, [colour, progress]);

  const surface = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [from, colour]),
  }));
  const ring = useAnimatedStyle(() => ({ opacity: 1 - flash.value }));
  const echoRing = useAnimatedStyle(() => ({ opacity: flash.value }));

  const outline = (width: number, tint: string) => ({
    position: "absolute" as const,
    left: -width,
    top: -width,
    right: -width,
    bottom: -width,
    borderWidth: width,
    borderColor: tint,
    borderRadius: box.borderRadius + width,
  });

  return (
    <Animated.View style={[box, surface]}>
      <Animated.View style={[outline(1.5, theme.ring), ring]} />
      <Animated.View style={[outline(2.5, theme.ramp[4]!), echoRing]} />
    </Animated.View>
  );
}
