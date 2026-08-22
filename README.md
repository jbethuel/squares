# squares

A year of small Squares, one Square for each Day. The user fills each Square by
hand with one tap. This takes ten seconds each day.

Most habit trackers put a streak on the first screen. A streak is a number that
goes to zero: the user misses one Tuesday and returns to nothing. Home shows a
Total instead. A Day that the user missed is an empty Square in a year that
continues to fill. There is no comparison with other users.

Strict Streaks for one Habit are available for users who want the pressure. They
stay off until the user turns them on.

The shape is the shape of the GitHub contribution graph. The app copies the
mechanic and not the branding.

The app uses TypeScript and React (Next.js, static export). The user can install
it as a PWA. All the data stays on the device. There is no account, no backend
and no analytics.

## Quick start

```
pnpm install
pnpm dev              # http://localhost:3000
```

| Command | Function |
| --- | --- |
| `pnpm dev` | Start the dev server on port 3000 |
| `pnpm build` | Make the static export in `apps/web/out/` |
| `pnpm preview` | Serve the export on port 4173 |
| `pnpm test` | Run the unit tests (vitest) |
| `pnpm test:watch` | Run the unit tests and watch for changes |
| `pnpm test:e2e` | Run the end-to-end tests on a dev server on port 3100 |
| `pnpm test:e2e:static` | Run the end-to-end tests against the built export |
| `pnpm test:all` | Run typecheck, then unit tests, then end-to-end tests |
| `pnpm typecheck` | Run `tsc --noEmit` |
| `pnpm icons` | Make the icons of both apps again from the Intensity ramp |
| `pnpm tokens` | Make `tokens.css` again from the Intensity ramp |
| `pnpm store-assets` | Draw the Play Console graphics again. No build uses these. |

## Layout

This is a pnpm workspace. The rules stay in `packages/domain`. Each app uses the
rules and does not write them again. Each app owns its own interface and its own
platform layer.

The root scripts delegate to the packages. Thus `pnpm dev` and `pnpm test`
operate from any directory. `pnpm test` runs the tests of each package.

```
docs/adr/       the decisions, for the full system
CONTEXT.md      the glossary, for the full system
store/android/  graphics, generated

packages/domain/  the rules — no DOM, tested in node
  date.ts           local calendar Days as YYYY-MM-DD
  types.ts          Habit and its Spans, DayRecord, Intensity
  selectors.ts      Intensity, Streak, Total, and which Habits are visible
  mutations.ts      Log, add/rename/hide, and sealDays
  grid.ts           Heatmap geometry
  lens.ts           how much data a Heatmap draws
  axis.ts           the names at the edges of a Heatmap
  palette.ts        the Intensity ramp — the one definition
  shareCard.ts      the permitted content of a Share Card, and its measurements
  storage.ts        the format of the data: validation, migration, Export
  store.tsx         the one React context, above an injected storage adapter

apps/web/         the Next.js app, statically exported
  src/platform/     the operations that only the web can do
    storage.ts        localStorage, and the adapter for the store
    handoff.ts        gives a file to the device
    theme.tsx         puts the Theme on the document
    shareCardCanvas.ts  draws the Share Card to a Canvas2D
  src/components/   Heatmap, HabitRow, Tail, Total, Toggle, LensPicker, ServiceWorker
  src/screens/      Home, Detail, NewHabit, Settings, Share
  src/hooks/        element width, delayed value, install prompt
  src/app/          Next shell, globals.css, tokens.css (generated)
  src/test/         jsdom stubs and the fixture harness
  e2e/              playwright specs and the device seed
  scripts/          generate-tokens.mts
```

`packages/domain` has no barrel file. Each module is its own entry point. Thus
an import of a rule cannot also import React.

The tsconfig of the package omits the `dom` lib. This is deliberate. It finds a
browser type before the phone app finds it.

## Vocabulary

`CONTEXT.md` is the glossary. The code uses its terms without change: Habit,
Log, Day, Square, Span, Intensity, Streak, Total, Tally, Hide, Lens, Frame.

Read `CONTEXT.md` before you change `packages/domain/`.

## The three rules that the code protects

**The user can Log only today.** There is no window back to yesterday. The
mutation refuses any other Day. The interface does not only hide the operation.
See ADR 0002. `sealDays` writes a record for each Day that ended, and it
refreshes only today.

**The Overview Heatmap is a live projection of the visible Habits.** A Day
Record contains only the Logs. The app calculates the set of Habits for a Square
from the Spans of the Habits that are not Hidden now. See ADR 0001.

Thus a Hide gives a new Intensity to the Days in the past, and it decreases the
Total. Spans stop a new Habit from a change to the Days before that Habit
existed.

**The number on Home does not reset on a schedule.** The Total is always for the
Year, for each value of the Lens. Only a Hide decreases it. A Streak belongs to
one Habit, the user must turn it on, and the app does not repair it.

Both the unit tests and the end-to-end tests assert each rule. If you break a
rule, a test that names the rule must fail. A test that names a file must not be
the only failure.

## Design

The design comes from the Claude Design project `Squares.dc.html` (turn 1). It
answers the four questions of the interface:

- **Day one** — the Overview Heatmap always fills its width, at each age of the
  account and for each value of the Lens. See `gridGeometry` in
  `packages/domain/grid.ts`.
- **A year on a phone** — 53 columns fit in 350px at approximately 5.4px for
  each Square. The app no longer does this. The Year keeps an 11px Square and
  moves sideways, and it opens at today. The Week and the Month fit.
- **Four heatmaps** — Home has one year grid. Each Habit row has a tail of 8
  Days. The tail is the target for the Log and also a preview of the Streak. The
  full year of each Habit is on the detail Screen.
- **Colour** — the four Intensity levels increase in lightness (0.40, 0.55,
  0.70, 0.85 in the Dark Theme). The hue turns from 178 to 120 across the
  blue-yellow axis. Thus the ramp is legible with deuteranopia and in greyscale.
  `packages/domain/palette.ts` holds the one definition, and the app generates
  `--lv0` to `--lv4` from it.

Three facts of the design are necessary here. `docs/build-log.md` holds the
other facts.

**A Frame has a constant shape.** A Lens is a Frame: a set of Days that starts
at today. See `packages/domain/lens.ts`.

The Week is always seven Squares, from Sunday to Saturday. The Month is always
the full month. The Year is always 365 Days that end at today. The Year does not
go from 1 January to 31 December, so it agrees with the Total above it.

A Frame does not become smaller to fit the data. The app draws a Day in the
future and a Day before the account existed. Both have Intensity 0. A Day that
the user missed also has Intensity 0.

If a Frame goes past today, the app puts a ring around today. Without the ring,
a missed Day and a future Day look the same.

The Lens is view state. It does not change a Day Record, and the Total is always
for the Year.

The Lens also selects the shape. The Month and the Year are calendar blocks with
seven rows of weekdays, because the rows must align across the columns. The Week
has no second column, so it is one row from Sunday to Saturday. The Week shows
seven Squares at the maximum size of 40px.

`gridGeometry` and `gridSquares` receive `rows` for this. `lensRows` calculates
the value.

The Lens also controls the fit. A Week is seven Squares, and a Month is five or
six columns. Both fit on a phone at the largest size that the app draws.

A Year is 53 columns. To fit those columns, a Square loses most of its size.
Thus the Year keeps an 11px Square and moves sideways, and it opens at today.
See `lensScrolls` and `scrollGeometry`. The page does not move sideways. Only
the box of the grid moves.

**A Heatmap shows which Days it contains.** At the side, the app puts Monday,
Wednesday and Friday. It puts three names and not seven, because at the row
height of the Year the names are taller than the Squares.

Above the Heatmap, the app puts the months of the Frame. Each name is above the
first column of its month. For the Month Lens, the app puts the name of that
month and the year.

`packages/domain/axis.ts` calculates all of this without a DOM. It also
calculates if a month has sufficient space for its name. That test uses pixels
against the column width, because the same grid steps 14px when it moves and
6.14px when it is compressed.

The weekday names are outside the scroll box and do not move. A Share Card has
none of these names, because a month is a date and a card has no date.

**A Share Card cannot show a name by accident.** The app draws the card on the
device to a canvas and saves a PNG of 1280px.

`shareCardModel` is a pure function. Its output has seven fields: lens, frame,
rows, weekday, levels, tally and names. There is no date, no user name and no
breakdown for each Habit. A breakdown is a risk.

The default value of `sharedName` is false, and a file without the field parses
as false. A Hidden Habit is on no card, because a Hidden Habit is not in the
Overview Heatmap.

The card always uses the Dark Theme, because it is an image and not a Screen.

A card has its own Lens. The user selects the Lens where the user makes the
card. The card does not use the Lens from Home, because the user does not reach
the card from Home.

The card draws the full Frame of that Lens. Example: a Week card that the user
makes on a Wednesday shows seven Squares with a ring around today. The card
shows a **Tally**: the Logs inside the Frame, and not the Total. A Week card
above a number for the Year is not legible.

**The Dark Theme is the design. The Light Theme is a port.** Thus `system` gives
the Dark Theme unless the device asks for the Light Theme. The media query is
`prefers-color-scheme: light` and not the absence of a dark preference.

The app stores the preference in the data with the Habits, so an Export
restores it. CSS cannot read the data. Thus `layout.tsx` adds a bootstrap script
that sets `data-theme` before the first paint.

Hack (`public/fonts/*.woff2`) is the font of the design. The app hosts it, so
the app makes no external request. The stack falls back to the system monospace
font.

## Tests

The tests follow the three rules and not the files. Thus a test that fails names
the rule that broke.

**Unit tests** (`vitest`), with one project for each concern:

- `packages/domain` runs in node. The rules are plain TypeScript, and the tests
  use no DOM. Thus a component cannot become necessary for a rule.
- The `web` project of `apps/web` runs in jsdom. `src/test/dom.ts` supplies what
  jsdom does not have: a viewport of 350px, a canvas that records the calls, and
  a link that reports the requested download. `src/test/harness.tsx` builds an
  account with the mutations of the app, so a fixture cannot disagree with the
  rules. It also wires the store in the same way as `page.tsx`.
- The `css` project of `apps/web` runs in node, for the two tests below that
  read the stylesheet as text.

The tests replace the clock only. They do not replace `setTimeout`. Three
animations use real timers: the spring of 260ms for the Log tap, the echo, and
the roll of 180ms for the Total. The tests assert them as real timers.

`src/app/page.test.tsx` renders in `StrictMode`, because `next.config.ts` turns
`StrictMode` on. An impure screen push then fails in a test and not in a
browser.

Two tests read stylesheets as text, because there is no other way to reach those
values. `typography.test.ts` asserts that no text control is smaller than 16px.
Below 16px, iOS zooms the page at focus. `palette.test.ts` asserts two facts:
`tokens.css` is the exact output of `tokens.ts` from the ramp, and `globals.css`
declares no `--lv` value of its own.

**End-to-end tests** (`playwright`), against a real browser and a real
localStorage.

The tests run on port 3100 and not on port 3000. `pnpm dev` uses port 3000. The
tests never use a server that they did not start.

Earlier the tests did both. The failure was difficult to find: an earlier run
left a `next dev` server, or the server was wedged and answered 500. The tests
then used that server, and each test failed at page load with no explanation.

A separate port lets `pnpm dev` and `pnpm test:e2e` run at the same time. A
refusal to use an existing server turns a stale server into a clear "port in
use" message. Set `PLAYWRIGHT_BASE_URL` to use a server that you started.

`e2e/fixtures.ts` seeds the device one time, before the first script of the app.
It does not seed on later navigations. Thus a reload restores the state that the
test made, and not the initial state.

`share.spec.ts` reads the canvas back as a PNG. It does not trust the text above
the button, because a card that shows a name is the worst possible defect.

`data.spec.ts` asserts that the app makes no external request. This is ADR 0004
as a test and not as a statement.

## Where to find more

| Document | Content |
| --- | --- |
| `CONTEXT.md` | The glossary. The terms that the code uses without change. |
| `docs/adr/` | The decisions that are expensive to reverse, and the rejected options. |
| `docs/build-log.md` | What we built, what we decided, and what is still open. |
| `docs/research/` | What we verified against primary sources, and when. |
