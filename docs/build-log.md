# Build log

What was built from the design, what was decided along the way, and what is
still open. Written 2026-08-03, brought up to date 2026-08-11.

The source is the Claude Design project `Squares.dc.html` (turn 1), read through
the design MCP. It answers the four OPEN questions in `docs/design-brief.md` and
carries a tappable prototype, the Intensity palette for both themes, the grid at
four ages of an account, a light/desktop pass, and a v2 sketch of the Share
Card.

## PR #1 — the app (merged)

Next.js 15 + React 19 + TypeScript, static export, installable as a PWA. 42
files.

**Domain (`src/domain/`), plain TypeScript, no React.** The rules live here
rather than in components because they are the product:

- `sealDays` materialises a Day Record for every elapsed Day. `active` is
  stored, never re-derived, so archiving a Habit cannot shrink a past
  denominator and retroactively brighten a patchy year (ADR 0001). Open Days are
  refreshed; closed Days are written once and never touched.
- `toggleTick` refuses a Day outside the Grace Window outright, rather than the
  UI merely not offering it.
- `intensityOf` is quartiles of that Day's Active set, so full shade means a
  complete Day at any Habit count.
- `chainOf` counts back from today, or from yesterday while today is still open,
  so a Chain is not reported broken at 00:01.

**`gridGeometry`** is the design's answers to questions A and B in one function.
The Overview contains only Days that have happened and always fills its width:
day one is a single column of 40px Squares, a settled year is 53 columns of
5.43px inside 350px, and the same component scales to desktop. The widening is
the progress indicator — no number, no badge, no fake data.

**The tick**, per the design, to the millisecond: press drops today's Square to
0.9; commit snaps colour over 90ms while geometry springs through 1.14 over
260ms on `cubic-bezier(.2,1.3,.35,1)`; one 8ms haptic; the Overview's today
Square echoes in the same frame; the Total rolls 180ms behind. Unticking is
120ms linear with no overshoot, no haptic and no echo. All of it respects
`prefers-reduced-motion`, which keeps the colour change and drops the spring.

**Screens:** Home, Habit detail, Add/edit/archive, Settings, plus the day-one
empty state.

**Also:** service worker (stale-while-revalidate, so the app opens offline),
web manifest, and icons generated from the Intensity ramp by a dependency-free
PNG encoder (`scripts/make-icons.mjs`) so the icon cannot drift from the
palette.

**The theme** is `system · light · dark` in settings, stored in `AppData`
alongside the Habits so a restored export restores it. Dark is the designed
theme and light is a port, so `system` resolves to dark unless the device
actively asks for light — `prefers-color-scheme: light`, not the absence of a
dark preference. Because the preference lives in the same localStorage blob as
everything else, it cannot be read from CSS: `layout.tsx` inlines a bootstrap
script that sets `data-theme` before first paint, otherwise a light-theme launch
opens on a frame of the dark one. `useApplyTheme` then keeps it in step with the
system while the app is open, and moves `theme-color` with it so the browser
chrome matches.

## PR #2 — the Share Card

The brief marks it v2, sketch-only, so this is the sketch made real.

Drawn on-device to a canvas, saved as a PNG 1280px wide. The height is not
fixed: `cardHeight` derives it from the card's own content, so a card carrying
names is taller than one that carries none. No hosted page, no link between
users, and the app never posts anything itself.

`shareCardModel` is pure and its entire output is five fields — `elapsed`,
`weekday`, `levels`, `total`, `names`. No date, no handle, no per-Habit
breakdown. A test pins that field list, so widening the card's surface has to be
deliberate.

Names are the load-bearing part, since constraint 5 calls a leak "the one
unforgivable bug". Tested, not asserted:

- `sharedName` defaults to false, and a file that omits it parses as false.
- Archived Habits are dropped even when opted in — settings only lists live
  Habits, so an archived opt-in can no longer be reached to be withdrawn.
- Opted-in names render as one lowercase line, never as rows.
- The screen states in words which names the card carries, above the save
  button.

The card is always the dark theme: it is a standalone image, not a screen.

## PR #4 — the tests, and the back button

251 unit tests and 41 end-to-end as this PR landed — see Verification for where
the suite stands now. They are organised around the rules PR #1 put in
`src/domain/` rather than around files, so a test that fails names the promise
that broke rather than the module that moved.

**Unit** (`vitest`) runs as two projects. `domain` runs in node, so the rules
stay testable without a DOM and a component can never quietly become
load-bearing for them; `ui` runs in jsdom. There is no React plugin — it wants
Vite 8 and vitest bundles Vite 7 — so esbuild compiles the JSX. `src/test/dom.ts`
stubs what jsdom does not bring: a 350px viewport, a canvas that records instead
of painting, a link that reports what it was asked to download.
`src/test/harness.tsx` builds an account with the app's own mutations, so a
fixture cannot drift from the rules it is meant to exercise. Only the clock is
faked, never `setTimeout`: the 260ms spring, the echo and the Total's 180ms roll
are real timers and are asserted as such.

**End-to-end** (`playwright`) drives a real browser and a real localStorage.
`e2e/fixtures.ts` seeds the device before the app's first script runs and *not*
on subsequent navigations, so a reload restores what the test did rather than
what it started with. `share.spec.ts` reads the canvas back as a PNG rather than
trusting the sentence above the button. `data.spec.ts` asserts the app makes no
external request at all — ADR 0002 as a test rather than as a promise.

**The back button was broken, and the tests are how it was found.**
`page.test.tsx` renders under `StrictMode`, because `next.config.ts` turns it on.
`pushState` was being called inside a `setStack` updater, and React invokes
updaters twice under StrictMode, so every push wrote two history entries
carrying the same depth: getting back out of a screen cost two taps. `home()`
had the same fault via `history.go`. Both side effects now happen outside the
updater. Development only — production does not double-invoke — but the updaters
were impure either way.

## PR #6 — the Lens

Not in the design at all: a `week · month · year` picker above both grids, added
on request. Written 2026-08-10.

A Lens is a **Frame** — `{ back, ahead }` Days measured from today, in
`src/domain/lens.ts`. `gridGeometry` already derived Square size from the number
of Days it was given, so the Week is the Year's component drawn at the 40px cap
rather than a second layout. The picker is view state per screen, resets to the
Year on reload, and is not in `AppData`; nothing about a Tick, a Day Record or
the Grace Window changed.

Two questions were put to the owner and answered, and both went against what the
first cut assumed:

| Question | Answer | What it cost |
| --- | --- | --- |
| Does a Lens draw the period **to date**, or the **whole** period? | The whole period. Seven Squares for a week, 31 for a 31-day month, 365 for the year. | The grid had to be able to run *past* today. `gridGeometry`/`gridSquares` now take a Frame instead of an elapsed count, and `SquareKind` lost its old meaning — see the dashed ghost below. |
| How is a Day in the Frame with no record drawn? | As a solid empty Square, like a Day you ticked nothing on. | Design note A is reversed — see below. |

**The widening grid is gone.** The design's day-one answer was that the Overview
holds only Days that have happened, so day one is one 40px column and the
widening *is* the progress indicator. A Frame that changes size as the week
fills is not a frame, so day one now draws all 365 Squares. The owner chose this
knowing the trade it carries: a Day before you installed, a Day still to come and
a Day you missed are now drawn identically.

What replaces the widening as the "where am I" cue is the ring on today, which
moved onto the detail grid as well as Home. Under the Week and the Month the
Frame runs on past today, and the ring is the only thing left that says where the
record ends. That reverses the smaller decision that the detail grid is "a
record, not a live screen".

Deliberately unchanged:

- **The Total.** It is the year's under every Lens. A Total scoped to the week
  would fall to zero every Sunday, and the third rule is that nothing which can
  go to zero is on Home. Asserted by a test in both the unit and e2e suites.
- **The Share Card.** Its Frame is `{ back: elapsed, ahead: 0 }`, so it still
  draws exactly the Days that have happened — no empty future, no Lens.
  `shareCard.test.ts` passed through the whole rewrite untouched, which is the
  evidence.

The dashed ghost went with it. It used to mark the rest of the current week;
under a Frame it would have marked whatever spilled past the end, which is a
different idea wearing the same clothes. `.sq-future` is gone and `SquareKind`
is `framed` or `pad` — what you see is the Frame exactly.

## Decisions taken beyond the design

| Decision | Why |
| --- | --- |
| Next.js rather than Vite | `docs/design-brief.md` names it. Static export, so ADR 0002 holds. |
| Added an "add habit" affordance | The design has none; its day-one state assumes Habits already exist. Dashed row: "name your first habit" when empty, "+ new habit" otherwise. |
| `not chained` → `unchained` | The design's string overflows the 134px subtitle column at 390px — its own prototype has this. `unchained` is `CONTEXT.md`'s own term and fits. |
| Archive confirms once | No undo exists. The button changes to "tap again to archive" for 4s — a state change, not a dialog. |
| Import confirms when there is data to lose | Replaces the year irreversibly. Applies straight away when there is nothing to overwrite. |
| Share Card entry in settings, not Home | First built as a chip on Home, arguing ADR 0002 makes the card the app's only channel. Moved on request. The better argument turned out to be adjacency: it sits under the name opt-ins, so what the card contains and what may be named are never on separate screens. |
| `share…` button only where `navigator.canShare` supports files | `save .png` is always primary. Both are user-driven; download alone is awkward on mobile. |

## Bugs found and fixed

- **Row subtitle wrapped to two lines**, breaking the 56px row height. Fixed
  with `nowrap` + ellipsis, then by shortening the string so it does not
  truncate.
- **Corner radius was scaled instead of recomputed.** The radius rule is
  calibrated for screen pixels; scaling a radius computed for a 4px cell up to
  the exported 16px one turned the grid into a field of dots. `squareRadius` now
  applies at the size a Square is actually drawn at. Caught by measuring drawn
  pixels — the preview is downscaled 4× and hid it.
- **A test asserted invented behaviour.** It claimed import forces `sharedName`
  off. Import actually preserves it, which is correct for restoring your own
  backup. The test was rewritten to cover the real guarantees: a missing field
  parses as off, and a deliberate opt-in survives a round trip.

## Verification

As of 2026-08-11: **285 unit tests across 20 files** — 122 in `domain`, 163 in
`ui` — and **48 end-to-end across 6 specs**, with `tsc --noEmit` and
`next build` clean. `pnpm test:all` runs the three in order.

PR #1 and #2 shipped before the suite existed, with 59 tests across 5 files
(`date`, `grid`, `rules`, `palette`, `shareCard`). What stood in for the rest
was a manual pass: the Chrome extension was not connected, so the built static
export was driven in headless Chrome over CDP. It confirmed behaviour rather
than appearance:

- A tick moves the Total 977→978, flips row state, updates the subtitle to
  "chain 1 day", and persists to localStorage; untick reverses it.
- The day-one flow creates a Habit with `chained` and `sharedName` both false.
- Every screen transition works, including hardware back through the stack.
  This one was wrong: back worked, but cost two taps, and it took `StrictMode`
  in PR #4 to see it. A pass that drives the app by hand confirms what it
  thought to try.
- Zero console errors.
- Our oklch→sRGB conversion matches Chrome's own resolution of all seven card
  colours exactly.
- Both exported PNGs inspected at native size: the anonymous card carries a year
  of shape and one number and nothing else; the named card carries exactly the
  Habits opted in.

The Intensity ramp exists twice — CSS custom properties for the app, numbers in
`palette.ts` for the canvas, which cannot read a custom property.
`palette.test.ts` parses `globals.css` and asserts the two agree, and pins the
two properties the ramp exists for: monotonic in lightness, and still separable
in Rec. 709 luma.

## Not built

- **Sync.** ADR 0002 names it the intended paid tier if v1 holds. Nothing here
  anticipates it beyond the export format.
- **Un-archive.** The design has no such affordance and `CONTEXT.md` describes
  Archive as retiring a Habit, not pausing it.
- **A global wipe.** ADR 0001 allows one as the only form of real deletion. The
  design's settings does not show it, and its footer note already says clearing
  site data clears the year.

## Open questions

- Hack is fetched into `public/fonts/` at 214KB for two weights. Subsetting to
  the characters the UI actually uses would cut most of that.
- The Overview's per-Square `title` attribute gives a desktop hover date but is
  invisible on touch; per-Day precision is otherwise a detail-screen job.
- Day Records outside the last year are kept rather than pruned. Storage is
  small and export then carries full history, but nothing reads them.
