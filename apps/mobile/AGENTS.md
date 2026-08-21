# apps/mobile

Expo SDK 57, React Native, Expo Router. Android first; iOS is planned and
nothing here may assume otherwise.

**Expo has changed.** Read the exact versioned docs at
https://docs.expo.dev/versions/v57.0.0/ before writing any code. Recalled API
shapes for this SDK are unreliable — `expo-notifications`' trigger types in
particular were reshaped, and `docs/research/` in the repo root records what was
verified and when.

## The boundary

The rules live in `packages/domain` and are imported, never reimplemented. If
you find yourself writing a date calculation, an Intensity, a Chain or a Grace
Window check in this app, it belongs in the package instead — `apps/web` has to
agree with it, and two copies will drift (ADR 0006).

What belongs here is `src/platform/`: the things only a phone can do. Storage,
the Share Card's Skia drawing, the file handoff, the Reminder's scheduling.

Read `CONTEXT.md` in the repo root before naming anything. Its terms are used
verbatim in code.
