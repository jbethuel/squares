# squares

A habit tracker built on the one mechanic that makes the GitHub contribution
graph compulsive: a year of small Squares you fill in by hand, one tap at a
time. The reward is the act of filling a Square and watching a year accumulate.

TypeScript + React (Next.js, static export), installable as a PWA. All data
lives on the device — no account, no backend, no analytics.

## Quick start

```
pnpm install
pnpm dev              # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on :3000 |
| `pnpm build` | Static export into `out/` |
| `pnpm preview` | Serve `out/` on :4173 |
| `pnpm test` | Unit tests (vitest) |
| `pnpm test:watch` | Unit tests, watching |
| `pnpm test:e2e` | End-to-end against the dev server |
| `pnpm test:e2e:static` | End-to-end against the built export — the artefact that ships |
| `pnpm test:all` | Typecheck, then unit, then end-to-end |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm icons` | Regenerate `public/*.png` from the Intensity ramp |

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

## Vocabulary

`CONTEXT.md` is the glossary, and its terms are used verbatim in code: Habit,
Tick, Day, Square, Intensity, Chain, Total, Archive, Grace Window, Lens, Frame.
Read it before changing anything in `src/domain/`.

## The three rules the code exists to protect

**Day Records are immutable.** Each Day permanently stores which Habits were
Active and which were Ticked. `active` is stored, never re-derived. Archiving a
Habit you kept failing therefore cannot shrink a past denominator and turn a
patchy year green (ADR 0001). `sealDays` writes a record for every elapsed Day,
and refreshes only the ones still inside the Grace Window.

**The Grace Window is one Day.** Today and yesterday are open. The Day before is
closed permanently, and `toggleTick` refuses it outright — the UI does not merely
hide it.

**Nothing that can go to zero is on Home.** The Total only rises. Chains are
per-Habit, opt-in, and never repaired.

Each rule is asserted in both the unit and end-to-end suites. Breaking one should
fail a test that names the rule, not a test that names a file.

## Design

Implemented from the Claude Design project `Squares.dc.html` (turn 1), which
answers the four open questions in `docs/design-brief.md`:

- **Day one** — the Overview always fills its width, at every age and under every
  Lens. See `gridGeometry` in `src/domain/grid.ts`.
- **A year on a phone** — 53 columns of ~5.4px fit 350px, so the whole year shows
  with no scrolling and no gesture.
- **Four heatmaps** — one year-grid on Home. Each Habit row carries an 8-day tail
  that is at once the tick target, the Chain preview and the "yesterday is open"
  cue. Full per-Habit years live in detail.
- **Colour** — the four Intensity levels ramp monotonically in lightness
  (0.40 → 0.55 → 0.70 → 0.85 in dark), with hue rotating 178 → 120 across the
  blue–yellow axis, so the ramp survives deuteranopia and greyscale. Defined once
  as `--lv0`…`--lv4` in `src/app/globals.css`.

Three design facts are load-bearing enough to state here. Everything else about
how the app got its shape is in `docs/build-log.md`.

**A Frame is a fixed shape.** A Lens is nothing but a Frame — a run of Days
measured from today (`src/domain/lens.ts`). The Week is always seven Squares,
Sunday to Saturday. The Month is always the whole month. The Year is always 365,
rolling to today rather than 1 January to 31 December, so it agrees with the
Total above it. Frames do not shrink to fit what has been lived: a Day still to
come and a Day from before the account existed are both drawn, at Intensity 0,
which is also what a missed Day draws at. The Lens is view state — it never
touches a Day Record, and the Total is the year's under every Lens.

**The Share Card cannot leak a name.** It is drawn on-device to a canvas and
saved as a 1280px PNG. There is no hosted page and no link between users.
`shareCardModel` is pure, and its whole output is five fields: elapsed, weekday,
levels, total and names. There is no date, no handle and no per-Habit breakdown,
because a breakdown is a leak waiting to happen. `sharedName` defaults to false,
a file that omits it parses as false, and archived Habits are dropped. The card
is always the dark theme, because it is a standalone image rather than a screen.

**Dark is the designed theme; light is a port.** So `system` resolves to dark
unless the device actively asks for light — the media query is
`prefers-color-scheme: light`, not the absence of a dark preference. The
preference lives in `AppData` beside the Habits, so an export restores it. CSS
cannot reach it there, so `layout.tsx` inlines a bootstrap script that sets
`data-theme` before first paint.

Hack (`public/fonts/*.woff2`) is the designed face, self-hosted so the app makes
no external request. The stack falls back to the system monospace.

## Tests

The suite is organised around the three rules rather than around files, so a test
that fails names the promise that broke.

**Unit** (`vitest`), two projects:

- `domain` runs in node. The rules are plain TypeScript and are tested without a
  DOM, so a component can never quietly become load-bearing for them.
- `ui` runs in jsdom. `src/test/dom.ts` stubs what jsdom does not bring — a 350px
  viewport, a canvas that records instead of painting, a link that reports what it
  was asked to download. `src/test/harness.tsx` builds an account with the app's
  own mutations, so a fixture cannot drift from the rules it exercises.

Only the clock is faked, never `setTimeout`. The tick's 260ms spring, the echo
and the Total's 180ms roll are real timers and are asserted as such.

`src/app/page.test.tsx` renders under `StrictMode`, because `next.config.ts`
turns it on. An impure screen push fails there rather than in a browser.

Two tests read `src/app/globals.css` as source text, because the values in it
cannot be reached any other way: `palette.test.ts` asserts the Intensity ramp
matches the numbers `palette.ts` gives the canvas, and `typography.test.ts`
asserts no text control is declared under 16px, which is the size below which iOS
zooms the page on focus.

**End-to-end** (`playwright`), against a real browser and a real localStorage.
`e2e/fixtures.ts` seeds the device once, before the app's first script runs and
*not* on later navigations, so a reload restores what the test did rather than
what it started with. `share.spec.ts` reads the canvas back as a PNG rather than
trusting the sentence above the button — a card that leaks a name is the one
unforgivable bug. `data.spec.ts` asserts the app makes no external request at
all, which is ADR 0002 as a test rather than as a promise.

## Where the details are

| Document | What it holds |
| --- | --- |
| `CONTEXT.md` | The glossary. The terms the code uses verbatim. |
| `docs/adr/` | Decisions that would be expensive to reverse, and what was rejected. |
| `docs/build-log.md` | What was built, what was decided along the way, and what is still open. |
| `docs/design-brief.md` | The original design brief, including the four open questions. |
