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
npm test           # unit: the rules, the components, the screens
npm run test:e2e   # end-to-end in a real browser
npm run test:all   # typecheck + both
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
  lens.ts         how much of the record a Heatmap draws
  palette.ts      the Intensity ramp as numbers, for canvas
  shareCard.ts    what a Share Card may contain, and how it is drawn
  storage.ts      localStorage + import validation
  store.tsx       the one React context
src/components/ Heatmap, HabitRow, Tail, Total, Toggle, LensPicker, ServiceWorker
src/screens/    Home, Detail, Edit, Settings, Share
src/hooks/      element width, delayed value, install prompt
src/app/        Next shell, globals.css (all design tokens)
src/test/       jsdom stubs and the fixture harness
e2e/            playwright specs and the device seed
```

The vocabulary in `CONTEXT.md` is used verbatim in code: Habit, Tick, Day,
Square, Intensity, Chain, Total, Archive, Grace Window, Lens, Frame.

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

- **Day one** — the Overview always fills its width, at every age and under
  every Lens. `gridGeometry` in `src/domain/grid.ts`.
- **A year on a phone** — 53 columns of ~5.4px fit 350px, so the whole year
  shows with no scrolling and no gesture.
- **Four heatmaps** — one year-grid on Home; each Habit row carries an 8-day
  tail that is simultaneously the tick target, the Chain preview and the
  "yesterday is open" cue. Full per-Habit years live in detail.
- **Colour** — the four Intensity levels ramp monotonically in lightness
  (0.40 → 0.55 → 0.70 → 0.85 in dark) with hue rotating 178 → 120 across the
  blue–yellow axis, so the ramp survives deuteranopia and greyscale. Defined
  once as `--lv0`…`--lv4` in `src/app/globals.css`.

### The theme

`system · light · dark`, in settings. Dark is the designed theme and light is a
port, so `system` resolves to dark unless the device actively asks for light —
the media query is `prefers-color-scheme: light`, not the absence of a dark
preference.

The preference is stored in `AppData` next to the Habits, so exporting and
re-importing a device restores it, and `storage.ts` falls back to `system` for a
file that omits it or carries a value that is not one of the three. Because it
lives in that blob rather than in its own key, CSS cannot reach it:
`layout.tsx` inlines a bootstrap script that reads localStorage and sets
`data-theme` before first paint, without which a light-theme launch opens on one
frame of the dark theme. While the app is open, `useApplyTheme` in `store.tsx`
follows the system if that is the preference, and moves the `theme-color` meta
with it so the browser chrome matches.

The tick interaction is specified in that file too: press drops today's Square
to 0.9, commit snaps colour over 90ms while geometry springs to 1.14 and back
over 260ms, one 8ms haptic, and the Overview's today Square echoes in the same
frame with the Total rolling 180ms behind. Unticking is 120ms linear with no
overshoot, no haptic and no echo — correcting a mistake should feel
administrative.

### The Lens

Both grids — the Overview on Home and a Habit's own — carry a `week · month ·
year` picker. A Lens is nothing but a **Frame**: a run of Days measured from
today, in `src/domain/lens.ts`. `gridGeometry` derives Square size from the
Frame, so the Week is the same component as the Year drawn at the 40px cap
instead of 5.4px, with no second layout.

A Frame is a fixed shape. The Week is always seven Squares, Sunday to Saturday.
The Month is always the whole month — 28, 29, 30 or 31. The Year is always 365,
rolling to today rather than 1 January to 31 December, so that it agrees with the
Total above it. Frames do not shrink to fit what has been lived: a Day still to
come and a Day from before the account existed are both drawn, at Intensity 0,
which is also what a Day you missed draws at.

That is a deliberate reversal of the design's original day-one answer, where the
Overview held only Days that had happened and its widening *was* the progress
indicator. A Frame that changed size as the week filled would not be a frame.
What replaces the widening as the "where am I" cue is the ring on today, which
is now on the detail grid as well as Home — under the Week and the Month the
Frame runs on past today, and without it a Day that has not happened reads
exactly like a Day that was missed.

The Lens is view state, held per screen and reset to the Year on reload. It is
not in `AppData` and never touches a Day Record: `toggleTick` is unchanged, the
Grace Window is unchanged, and the Total is the year's under every Lens.

### The Share Card

Drawn on-device to a canvas and saved as a 1280px PNG — no hosted page, no link
between users, and the app never posts anything. `shareCardModel` is a pure
function whose whole output is five fields: elapsed, weekday, levels, total and
names. There is no date, no handle and no per-Habit breakdown, because a
breakdown is a leak waiting to happen.

Names are the load-bearing part. `sharedName` defaults to false, a file that
omits it parses as false, archived Habits are dropped (their opt-in can no
longer be reached in settings to be withdrawn), and opted-in names render as one
lowercase line rather than rows. The screen states in words which names the card
carries before you can save it, so the answer is never more than a glance away.

It lives in settings, directly under those name opt-ins, rather than on Home.
Home keeps the one chip the design gives it, and what the card contains is never
on a different screen from what may be named.

The card is always the dark theme — it is a standalone image, not a screen.

The Intensity ramp therefore exists twice: as CSS custom properties for the app
and as numbers in `palette.ts` for the canvas. `palette.test.ts` parses
`globals.css` and asserts the two agree, so they cannot drift.

### Fonts

Hack (`public/fonts/*.woff2`) is the designed face, self-hosted so the app has
no external requests. The stack falls back to the system monospace.

## Tests

The suite is organised around the three rules above rather than around files, so
a test that fails names the promise that broke.

**Unit** (`vitest`), two projects:

- `domain` runs in node. The rules are plain TypeScript and are tested without a
  DOM, so a component can never quietly become load-bearing for them.
- `ui` runs in jsdom. `src/test/dom.ts` stubs the parts of a browser jsdom does
  not bring — a 350px viewport, a canvas that records instead of painting, a
  link that reports what it was asked to download. `src/test/harness.tsx` builds
  an account with the app's own mutations, so a fixture cannot drift from the
  rules it is meant to exercise.

Only the clock is faked, never `setTimeout`: the tick's 260ms spring, the echo
and the Total's 180ms roll are real timers and are asserted as such.

`src/app/page.test.tsx` renders under `StrictMode`, because `next.config.ts`
turns it on — a screen push that is not pure fails there rather than in a
browser. That is exactly what it caught: `pushState` was being called inside a
`setStack` updater, so every push wrote two history entries and getting back out
of a screen cost two taps.

**End-to-end** (`playwright`), against a real browser and a real localStorage.
`e2e/fixtures.ts` seeds the device once, before the app's first script runs and
*not* on subsequent navigations, so a reload restores what the test did rather
than what it started with.

`share.spec.ts` reads the canvas back as a PNG rather than trusting the sentence
above the button — a card that leaks a name is the one unforgivable bug.
`data.spec.ts` asserts that the app makes no external request at all, which is
ADR 0002 as a test rather than as a promise.

`npm run test:e2e` drives the dev server. `npm run test:e2e:static` builds and
serves the static export instead — the artefact that actually ships, worth
running before a release.
