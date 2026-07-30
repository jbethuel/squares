# Design handover prompt

> Paste everything below the line into a fresh Claude session. It is self-contained — it assumes no filesystem access and no prior context.

---

I need UI and visual design for a small personal-habit app. The product decisions are already settled after a long design review; I need you to design *within* them, not relitigate them. Where I've marked something **OPEN**, I want your recommendation.

## What it is

A habit tracker built on the one mechanic that makes the GitHub contribution graph compulsive: a year of small squares that you fill in by hand, one tap at a time. The reward is the *act of filling a square* and watching a year accumulate — not analytics, not insights, not coaching.

It's an installable PWA (Next.js, static, no backend). Mobile-first, but it must degrade gracefully to desktop web. All data lives on the device.

## Vocabulary — use these words exactly

- **Habit** — something the user has decided to do daily. Expect 2–3 of them, never 10.
- **Tick** — the single tap recording a Habit as done for a Day. Binary. No quantity, no note, no rating.
- **Day** — a local calendar date, midnight to midnight.
- **Square** — one Day's cell in a heatmap.
- **Overview Heatmap** — one year of Squares across all Habits. Each Square is shaded by **Intensity**.
- **Intensity** — the shade of a Square, from the proportion of that Day's active Habits that were Ticked. With 3 habits: 0, 1/3, 2/3, 3/3 → four levels.
- **Habit Heatmap** — one year of Squares for a single Habit. Binary: ticked or not. No gradient.
- **Chain** — strictly consecutive Days a Habit was Ticked. Per-Habit only. Never forgiven, never repaired.
- **Total** — count of all Ticks in the last year, shown on the Overview. Only ever rises.
- **Archive** — retiring a Habit from today forward. History is untouched. There is no delete.
- **Share Card** — a PNG of the Overview Heatmap + Total, rendered on-device.

## Hard constraints — do not design around these

1. **One tap, no dialogs.** Ticking a Habit must be a single tap on the main screen. No confirmation, no detail sheet, no "how many reps?" The moment logging needs a second screen, the product is dead.
2. **No aggregate streak.** The Overview shows a Total, which can never be broken. Chains exist only per-Habit. Do not add a "current streak" hero number to the main screen — this was decided deliberately, because a number that can go to zero creates the anxiety that makes people quit.
3. **Yesterday is editable, the day before is not.** There's a one-day grace window for forgetting to log. Design needs to make "yesterday is still open" legible without making it feel like a general-purpose calendar editor.
4. **No social anything.** No feed, no friends, no follower counts, no "3 people are on a streak." The user actively avoids social media. Sharing is a PNG they save and post themselves, nothing more.
5. **Share Cards are anonymous by default.** Habit names never appear on a Share Card unless individually opted in. People track "took my meds" and "no drinking" — a card that leaks names is the one unforgivable bug.
6. **No GitHub branding.** It's modelled on the contribution graph; it is not affiliated with it. No octocat, no GitHub green specifically, no wordmark riffs.

## What I need designed

**v1 screens:**

1. **Home** — the Overview Heatmap, the Total, and the 2–3 Habits with today's tick state, all tappable inline. This is 95% of all usage: opened, glanced at, tapped, closed, in under ten seconds.
2. **Habit detail** — that Habit's binary heatmap and its current Chain.
3. **Add / edit / archive a Habit.**
4. **Empty state (day one)** — see below, this is the hard one.
5. **Settings** — data export/import, install prompt.

**v2, sketch only:** the Share Card PNG.

## The problems I actually want you to solve

**A. Day one is empty, and that's when people quit. OPEN.**
The app's entire value is accumulated history, so on the first day it has none — a blank grid of 365 grey squares is a monument to nothing. This is the single hardest design problem here. How do you make an empty year feel like potential rather than emptiness, without faking data or nagging?

**B. Fitting a year of squares on a phone. OPEN.**
GitHub's graph is 53 columns wide on a desktop monitor. A phone is ~390px. Options include scrolling horizontally, showing a rolling ~12 weeks with the full year elsewhere, or reflowing the grid entirely. I don't know the right answer — recommend one and show why.

**C. Layering four heatmaps without visual noise. OPEN.**
Overview plus three per-Habit maps on one screen risks looking like a spreadsheet. Should the Habit Heatmaps be on Home at all, or only in detail? Argue it.

**D. The tick has to feel good.** The reward *is* the tap. Whatever happens in that moment — the fill, the timing, the weight of it — is the core loop and deserves disproportionate attention. Describe the interaction precisely.

**E. Colour, honestly.** Shading by intensity alone fails colour-blind users, and GitHub has this exact problem. I want light and dark themes, and a palette that survives deuteranopia without abandoning the "filled = green = good" instinct that makes the original work.

## Deliverables

Screen-by-screen layouts, the palette with the four Intensity levels specified for light and dark, the tick interaction described in detail, and your reasoning on the four OPEN questions. Flag anything in the constraints that you think is a genuine mistake — but assume it was argued about before you got here, so bring an argument.
