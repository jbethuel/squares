# apps/mobile

Expo SDK 57, React Native and Expo Router. Android comes first. iOS is planned,
so don't write anything here that assumes iOS won't exist.

**Expo has changed a lot.** Read the versioned docs at
https://docs.expo.dev/versions/v57.0.0/ before writing code; don't trust what
you remember about this SDK's API. The `expo-notifications` trigger types in
particular have changed. `docs/research/` at the repo root records what we've
verified and when.

## The boundary

The rules live in `packages/domain`. This app imports them and never
reimplements them.

Don't write any of these here:

- date calculations
- Intensity
- Streaks
- checks for whether a Day is open
- checks for whether a Habit is Hidden

They all belong in the package. `apps/web` has to agree with this app, and two
copies will drift apart. See ADR 0007.

`src/platform/` holds the phone-only operations: storage, the Skia drawing of
the Share Card, file handoff, and Reminder scheduling.

Read `CONTEXT.md` at the repo root before naming anything. The code uses its
terms verbatim.
