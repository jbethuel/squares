# Build log

What was built from the design, what was decided along the way, and what is
still open. Written 2026-08-03.

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

## PR #2 — the Share Card

The brief marks it v2, sketch-only, so this is the sketch made real.

Drawn on-device to a canvas, saved as a 1280×568 PNG. No hosted page, no link
between users, and the app never posts anything itself.

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

59 tests across 5 files (`date`, `grid`, `rules`, `palette`, `shareCard`),
`tsc --noEmit`, and `next build` all clean.

The Chrome extension was not connected, so the built static export was driven in
headless Chrome over CDP. Confirmed behaviour rather than appearance:

- A tick moves the Total 977→978, flips row state, updates the subtitle to
  "chain 1 day", and persists to localStorage; untick reverses it.
- The day-one flow creates a Habit with `chained` and `sharedName` both false.
- Every screen transition works, including hardware back through the stack.
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
