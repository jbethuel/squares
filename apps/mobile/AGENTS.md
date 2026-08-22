# apps/mobile

This app uses Expo SDK 57, React Native and Expo Router. Android is the first
target. iOS is planned, and no code here can assume that iOS does not exist.

**Expo has changed.** Read the versioned documentation at
https://docs.expo.dev/versions/v57.0.0/ before you write code. Your memory of
the API of this SDK is not reliable. The trigger types of `expo-notifications`
changed. `docs/research/` in the root of the repository records what we verified
and when.

## The boundary

The rules stay in `packages/domain`. This app imports the rules and does not
write them again.

Do not write these in this app:

- a date calculation
- an Intensity
- a Streak
- a test for an open Day
- a test for a Hidden Habit

Each of these belongs in the package. `apps/web` must agree with this app, and
two copies will become different. See ADR 0007.

`src/platform/` holds the operations that only a phone can do: the storage, the
Skia drawing of the Share Card, the file handoff, and the schedule of the
Reminder.

Read `CONTEXT.md` in the root of the repository before you name anything. The
code uses its terms without change.
