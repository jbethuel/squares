# Play Store listing — squares

Written by hand, in the app's own voice (see the Vocabulary section of
README.md). `pnpm store-assets` only draws the icon and feature graphic; it
doesn't generate this text. Copy the fields below straight into Play Console.

## App name

squares

## Short description (max 80 chars, currently 72)

A year of little squares, one tap a day. No account, no streak pressure.

## Full description (max 4000 chars, currently ~1130)

A year of little squares, one for each day. Tap once to fill today's square.
It takes about ten seconds.

Most habit trackers lead with a streak, a number that drops to zero the first
Tuesday you miss. squares shows your total for the year instead. A missed day is
just one empty square in a year that keeps filling up. No leaderboard, no
comparing yourself to anyone, no guilt.

If you do want the pressure, you can turn on a streak for any habit. It's off
by default.

It looks like the GitHub contribution graph, but it isn't a coding app. It's for
whatever daily habit you're working on.

It works best with two or three habits. The point is that logging takes seconds,
and that stops being true once you're tracking a dozen.

Everything stays on your phone:

- No account, no sign-in, no servers.
- No analytics, no ads, no tracking.
- Reminders are scheduled on your phone. Nothing is sent anywhere.
- Export your data to a .json file any time. Uninstalling deletes everything,
  so that file is your backup. Import it to restore on this phone or a new one.

Open it once a day, fill in your squares, and get on with your day.

## Category

Health & Fitness (or Lifestyle — either fits; there's no habit-tracking
category, and this app is closer to a personal log than a fitness tool).

## Contact email

jbethueldc@gmail.com

## Privacy policy

https://jbethuel.com/privacy/squares

## Screenshots

`screenshots/` — captured from a seeded emulator (the app under its earlier
package, `dev.jbethuel.squares`, on `sdk_gphone16k_arm64`), not real user data. The
device was loaded with a synthetic ~260-day, 3-habit history built the same
way `apps/web/e2e/fixtures.ts`'s `buildAccount` builds a test account, so the
year grid reads as lived-in rather than empty. Regenerate by importing a
freshly-built export through Settings → `import .json` if these ever need
retaking (e.g. after a UI change).

1. `01-home.png` — Home, a filled year across three Habits, and the Total
   that replaces a streak.
2. `02-habit.png` — a single Habit's screen: streak, longest streak, and the
   "every day of the year, logged or not" Daily Reminder line.
3. `03-share-card.png` — the Share Card, squares' only distribution channel
   (ADR 0004).
4. `04-settings.png` — Export/Import and the "no account, no sync" line,
   speaking to the privacy story directly.
