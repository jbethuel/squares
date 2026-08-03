# squares

A habit tracker built on the one mechanic that makes the GitHub contribution
graph compulsive: a year of small Squares you fill in by hand, one tap at a
time. The reward is the act of filling a Square and watching a year accumulate.

TypeScript + React (Next.js, static export), installable as a PWA. All data
lives on the device — no account, no backend, no analytics.

## Running it

```
npm install
npm run dev        # http://localhost:3000
```

```
npm run build      # static export into out/
npm run preview    # serve out/ at http://localhost:4173
```

```
npm test           # domain rules
npm run typecheck
npm run icons      # regenerate public/*.png from the Intensity ramp
```

## Layout

```
src/domain/     the rules — no React, fully tested
  date.ts         local calendar Days as YYYY-MM-DD
  types.ts        Habit, DayRecord, Intensity
  selectors.ts    Intensity, Chain, Total, the Grace Window
  mutations.ts    Tick, add/rename/archive, and sealDays
  grid.ts         Heatmap geometry
  storage.ts      localStorage + import validation
  store.tsx       the one React context
src/components/ Heatmap, HabitRow, Tail, Total, Toggle
src/screens/    Home, Detail, Edit, Settings
src/app/        Next shell, globals.css (all design tokens)
```

The vocabulary in `CONTEXT.md` is used verbatim in code: Habit, Tick, Day,
Square, Intensity, Chain, Total, Archive, Grace Window.

## The three rules the code exists to protect

**Day Records are immutable.** Each Day permanently stores which Habits were
Active and which were Ticked. `active` is stored, never re-derived, so archiving
a Habit you kept failing cannot shrink a past denominator and retroactively turn
a patchy year green (ADR 0001). `sealDays` writes a record for every elapsed Day
and refreshes only the ones still inside the Grace Window.

**The Grace Window is one Day.** Today and yesterday are open. The Day before is
closed permanently — `toggleTick` refuses it, rather than the UI merely hiding
it.

**Nothing that can go to zero is on Home.** The Total only rises. Chains are
per-Habit, opt-in, and never repaired.

## Design

Implemented from the Claude Design project `Squares.dc.html` (turn 1), which
answers the four open questions in `docs/design-brief.md`:

- **Day one** — the Overview contains only Days that have happened and always
  fills its width. Day one is one column of 40px Squares; the widening is the
  progress indicator. `gridGeometry` in `src/domain/grid.ts`.
- **A year on a phone** — 53 columns of ~5.4px fit 350px, so the whole year
  shows with no scrolling and no gesture.
- **Four heatmaps** — one year-grid on Home; each Habit row carries an 8-day
  tail that is simultaneously the tick target, the Chain preview and the
  "yesterday is open" cue. Full per-Habit years live in detail.
- **Colour** — the four Intensity levels ramp monotonically in lightness
  (0.40 → 0.55 → 0.70 → 0.85 in dark) with hue rotating 178 → 120 across the
  blue–yellow axis, so the ramp survives deuteranopia and greyscale. Defined
  once as `--lv0`…`--lv4` in `src/app/globals.css`.

The tick interaction is specified in that file too: press drops today's Square
to 0.9, commit snaps colour over 90ms while geometry springs to 1.14 and back
over 260ms, one 8ms haptic, and the Overview's today Square echoes in the same
frame with the Total rolling 180ms behind. Unticking is 120ms linear with no
overshoot, no haptic and no echo — correcting a mistake should feel
administrative.

### Not built

The **Share Card** is v2 and was delivered as a sketch only, so it is not
implemented. Its constraint is already encoded: `Habit.sharedName` defaults to
false and import forces it false, so no name can leak from an old file.

### Fonts

Hack (`public/fonts/*.woff2`) is the designed face, self-hosted so the app has
no external requests. The stack falls back to the system monospace.
