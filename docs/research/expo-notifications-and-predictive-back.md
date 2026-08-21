# Local scheduled notifications and Android predictive back

Research date 2026-08-20. Verified against primary sources: docs.expo.dev, reactnavigation.org, github.com/expo/expo (source + changelogs), github.com/software-mansion/react-native-screens (source, releases, maintainer discussion), developer.android.com, developer.apple.com. Every version cited was current on 2026-08-20 — `expo@57.0.14` was npm's `latest` dist-tag, which is what `npx create-expo-app` installs today, so the "latest" docs used below are not ahead of what a fresh install gets.

This repo has no phone app yet. `apps/web` (Next.js) and `packages/domain` are the only packages; `package.json` and `pnpm-lock.yaml` were grepped and contain no `expo`, `expo-notifications`, `react-native-screens`, `@react-navigation/native-stack`, or `expo-router` entries anywhere. All version numbers below are from npm/GitHub, not from anything installed in this repo.

## Answers in one line each

| # | Claim | Verdict | Source |
|---|---|---|---|
| 1.1 | Daily local notification trigger is `{ type: SchedulableTriggerInputTypes.DAILY, hour, minute }` | Confirmed | [docs.expo.dev/…/notifications](https://docs.expo.dev/versions/latest/sdk/notifications/), [Notifications.types.ts](https://github.com/expo/expo/blob/main/packages/expo-notifications/src/Notifications.types.ts) |
| 1.1 | The `type` discriminator became required, replacing implicit `{hour,minute,repeats}` detection | Confirmed | [PR #31598](https://github.com/expo/expo/pull/31598), expo-notifications 0.29.0 CHANGELOG |
| 1.2 | `cancelScheduledNotificationAsync(identifier)` cancels one pending notification | Confirmed | docs.expo.dev/…/notifications |
| 1.2 | You cannot supply your own identifier to `scheduleNotificationAsync` | **Contradicted** | `NotificationRequestInput.identifier` is documented as an *optional* field you can set |
| 1.3 | Local scheduled notifications work in Expo Go on Android today; only remote/push was removed (SDK 53) | Confirmed | docs.expo.dev/…/notifications callout; [expo.dev/changelog/sdk-53](https://expo.dev/changelog/sdk-53) |
| 1.4 | `requestPermissionsAsync()` is the Android 13 POST_NOTIFICATIONS call; no config-plugin field is needed | Confirmed | docs.expo.dev/…/notifications; [AndroidManifest.xml](https://github.com/expo/expo/blob/main/packages/expo-notifications/android/src/main/AndroidManifest.xml) bundles the permission already |
| 1.5 | A once-daily reminder needs `SCHEDULE_EXACT_ALARM` on Android 14+ or it breaks | **Contradicted** | [ExpoSchedulingDelegate.kt](https://github.com/expo/expo/blob/main/packages/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt) falls back to an inexact alarm automatically, no crash, no permission required |
| 1.6 | iOS caps pending local notifications at 64 | Confirmed, but only via an Apple forum reply, not current DocC docs | [developer.apple.com/forums/thread/811171](https://developer.apple.com/forums/thread/811171) (Apple engineer) |
| 2.1 | `android.predictiveBackGestureEnabled` in app.json generates `android:enableOnBackInvokedCallback` | Confirmed | [docs.expo.dev/…/config/app](https://docs.expo.dev/versions/latest/config/app/) |
| 2.1 | It defaults to `true` today | **Contradicted** | Still `false` by default as of SDK 57, despite Expo's SDK 54 stated plan to flip it in SDK 55/56 |
| 2.2 | react-native-screens supports Android predictive back today | **Contradicted** | Stable v4 line (4.27.0) does not; maintainer says "highly likely this won't be ever done in react native screens v4" |
| 2.2 | Enabling the flag with Expo Router's default native-stack works | **Contradicted** | Open, maintainer-accepted bug: back gesture exits the app instead of popping the stack |
| 2.3 | native-stack's own `gestureEnabled` swipe-back is iOS-only; Android relies on the system edge/hardware back | Confirmed | [reactnavigation.org/docs/native-stack-navigator](https://reactnavigation.org/docs/native-stack-navigator/): "Only supported on iOS." |

## Question 1 — local scheduled notifications in Expo

All of this section applies to `expo-notifications` **~57.0.12** (the version `docs.expo.dev/versions/latest` recommends today, matching Expo SDK 57).

### 1. Scheduling a repeating daily local notification

The old `{ hour, minute, repeats: true }` shape is gone as a cross-platform daily pattern. [PR #31598](https://github.com/expo/expo/pull/31598) ("Simplify calendar trigger input types," expo-notifications 0.29.0, 2024-10-22) made the trigger's `type` field required, because — quoting the PR — "Customers have reported problems with the existing types. They depend on the presence or absence of certain properties like `repeats` in order to distinguish between daily, weekly, or calendar notifications." `DailyTriggerInput` itself is much older (added in 0.2.0, 2020-05-27) but before 0.29.0 the library guessed the trigger kind from which fields were present; now you say what you mean.

The current shape, from `github.com/expo/expo/blob/main/packages/expo-notifications/src/Notifications.types.ts`:

```ts
export enum SchedulableTriggerInputTypes {
  CALENDAR = 'calendar',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  DATE = 'date',
  TIME_INTERVAL = 'timeInterval',
}

export type DailyTriggerInput = {
  type: SchedulableTriggerInputTypes.DAILY;
  channelId?: string;
  hour: number;
  minute: number;
};
```

Copy-pasteable usage, assembled from the docs' `scheduleNotificationAsync` signature and the `DailyTriggerInput`/`SchedulableTriggerInputTypes` reference entries on the same page (`docs.expo.dev/versions/latest/sdk/notifications/`):

```ts
import * as Notifications from 'expo-notifications';

const identifier = await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Reminder',
    body: "Don't forget your habit today.",
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: 20,
    minute: 0,
  },
});
```

Caveat worth being honest about: the docs page's own worked "Usage" and "API" examples currently only show `TIME_INTERVAL` and `DATE` triggers — I did not find a literal daily-reminder copy-paste example on the live page. The snippet above is correct (built from the verified type definition and enum, in the same calling convention the docs use for every other trigger type), but it is my construction, not a lifted quote.

One more thing worth flagging for cross-platform behavior: the `DailyNotificationTrigger` *interface* doc (the shape you get back describing an already-scheduled notification, as opposed to the `DailyTriggerInput` you pass in) says: "A trigger related to a daily notification. The same functionality will be achieved on iOS with a `CalendarNotificationTrigger`." So the input API is unified (`DailyTriggerInput`, `type: DAILY`, works on both platforms), but iOS represents it natively as a repeating calendar trigger under the hood — that's an implementation detail, not something you need to branch on.

`CalendarTriggerInput` (the old ambiguous shape with optional `hour`/`minute`/`repeats`) is now documented as **iOS only** — every other trigger type's doc heading reads "Android iOS," `CalendarTriggerInput`'s reads just "iOS." So on Android there is no equivalent to the old free-form calendar trigger at all; `DailyTriggerInput`/`WeeklyTriggerInput`/etc. are the only way to get a repeating trigger there.

### 2. Cancelling, rescheduling, and listing pending notifications

From `docs.expo.dev/versions/latest/sdk/notifications/`:

```ts
scheduleNotificationAsync(request: NotificationRequestInput): Promise<string>
cancelScheduledNotificationAsync(identifier: string): Promise<void>
cancelAllScheduledNotificationsAsync(): Promise<void>
getAllScheduledNotificationsAsync(): Promise<NotificationRequest[]>
```

`NotificationRequestInput` (what you pass to `scheduleNotificationAsync`) is documented with three fields: `content: NotificationContentInput`, `identifier (optional): string`, `trigger: NotificationTriggerInput`. **`identifier` is optional and settable by you** — this contradicts a plausible-sounding claim that the system always generates it for you. If you don't supply one, `scheduleNotificationAsync` returns a generated string identifier in its resolved `Promise<string>`; if you do supply one, that's what comes back in `getAllScheduledNotificationsAsync()`'s `NotificationRequest[]` (`NotificationRequest = { content, identifier, trigger }`).

For this app's "suppress today's reminder, restore it if undone" need: store the identifier you get back from `scheduleNotificationAsync` (or supply your own, keyed by Habit id, and skip the round-trip). To suppress: `cancelScheduledNotificationAsync(identifier)`. To restore: call `scheduleNotificationAsync` again with the same trigger. `getAllScheduledNotificationsAsync()` is there if you ever need to reconcile in-memory state against what the OS actually still has pending.

Not confirmed: the docs don't state what happens if you call `scheduleNotificationAsync` twice with the same custom `identifier` — whether it silently overwrites the first, errors, or produces two pending requests. Treat this as unverified; don't rely on identifier reuse as an implicit "replace" operation without testing it.

### 3. Expo Go on Android

Confirmed from the live docs page's top-of-page callout (`docs.expo.dev/versions/latest/sdk/notifications/`):

> "Push notifications (remote notifications) functionality provided by `expo-notifications` is unavailable in Expo Go on Android from SDK 53. A development build is required to use push notifications. Local notifications (in-app notifications) remain available in Expo Go."

Traced to its origin, [expo.dev/changelog/sdk-53](https://expo.dev/changelog/sdk-53):

> "Push notifications are no longer supported in Expo Go for Android, after being deprecated in SDK 52." … "We still support push notifications in Expo Go for iOS because we are able to automatically configure it for you when using EAS."

And it got stricter later — expo-notifications 55.0.0 (2026-01-21) CHANGELOG entry: "[android] throw instead of logging a warning when attempting to use push notifications with Expo Go" (previously a warning, now a thrown error).

None of this touches local scheduling. For this app — no backend, no push, ever, per ADR 0007 — **Expo Go on Android is not a blocker.** A daily local `DailyTriggerInput` reminder can be developed and tested in Expo Go without a development build, on Android SDK 53+ (i.e., today's Expo Go).

### 4. Android 13+ `POST_NOTIFICATIONS`

Call: `await Notifications.requestPermissionsAsync()` — same call on both platforms. The permission prompt only appears once a notification channel exists, per the docs: "This prompt will not appear until at least one notification channel is created. The `setNotificationChannelAsync` must be called before `getDevicePushTokenAsync` or `getExpoPushTokenAsync`." For a purely local reminder you don't need a push token, but you do need at least one channel created before the OS will show the permission dialog:

```ts
if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}
const { status } = await Notifications.requestPermissionsAsync();
```

No config-plugin entry is needed for `POST_NOTIFICATIONS` specifically. Confirmed directly from the library's own bundled manifest, `packages/expo-notifications/android/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

This gets merged into the app's manifest automatically the moment `expo-notifications` is installed — Android's manifest merger handles it, no `app.json` plugin config required. (`RECEIVE_BOOT_COMPLETED` is also bundled the same way — the docs note it's "used to set up scheduled notifications when the device (re)starts.") The `expo-notifications` config-plugin block in `app.json` only configures `icon`, `color`, `defaultChannel`, `sounds`, and `enableBackgroundRemoteNotifications` — nothing about runtime permissions.

### 5. Exact alarms on Android 14+

The docs state the manifest-level requirement plainly: "Starting from Android 12 (API level 31), to schedule a notification that triggers at an exact time, you need to add `<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>` to AndroidManifest.xml." Taken alone, that reads like a hard requirement. It is not — expo-notifications degrades gracefully, and this is verifiable directly in its Android implementation, `ExpoSchedulingDelegate.kt`:

```kotlin
private fun setupAlarm(triggerAtMillis: Long, operation: PendingIntent) {
  if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()) {
    AlarmManagerCompat.setExactAndAllowWhileIdle(alarmManager, AlarmManager.RTC_WAKEUP, triggerAtMillis, operation)
  } else {
    AlarmManagerCompat.setAndAllowWhileIdle(alarmManager, AlarmManager.RTC_WAKEUP, triggerAtMillis, operation)
  }
}
```

Without the manifest permission (or without the user granting it, which Android 14+ requires — see below), the library silently falls back to `setAndAllowWhileIdle` instead of throwing. **A once-a-day reminder does not need `SCHEDULE_EXACT_ALARM`.** Skipping it costs precision, not function.

On the platform side, `developer.android.com/about/versions/14/changes/schedule-exact-alarms`: "The `SCHEDULE_EXACT_ALARM` permission is not pre-granted to fresh installs of apps targeting Android 13 (API level 33) and higher" and will show as denied by default; a normal app has to send the user to `Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM` to get it, and both the user and the system can revoke it afterward. The alternative, `USE_EXACT_ALARM`, is auto-granted and can't be revoked, but per Android's guide (`developer.android.com/develop/background-work/services/alarms/schedule`) it's reserved for "alarm clock or calendar app"-style use cases and is "subject to an upcoming Google Play policy" — not a fit for a habit-tracker reminder.

Drift, quoted verbatim from `developer.android.com/reference/android/app/AlarmManager`'s `setAndAllowWhileIdle` docs (the fallback method the library actually calls):

> "Under normal system operation, it will not dispatch these alarms more than about every minute (at which point every such pending alarm is dispatched); when in low-power idle modes this duration may be significantly longer, such as 15 minutes."

So the realistic worst case for an unprivileged once-daily reminder: negligible drift under normal phone use, up to roughly 15 minutes late if the device happens to be deep in Doze exactly when the alarm was due. Recommendation: don't request `SCHEDULE_EXACT_ALARM` for this feature. It buys sub-minute precision the use case doesn't need, in exchange for an Android-14+ permission dance the OS actively discourages for non-alarm-clock apps.

### 6. iOS's 64 pending-notification limit

This is the one claim in this document I could not confirm from Apple's *documentation* proper. I checked the DocC reference pages for `UNUserNotificationCenter.add(_:withCompletionHandler:)`, `UNNotificationRequest`, `UNCalendarNotificationTrigger`, `UNNotificationTrigger`, `getPendingNotificationRequests(completionHandler:)`, and the guide "Scheduling a notification locally from your app" — pulling the raw DocC JSON (`developer.apple.com/tutorials/data/documentation/...json`) and grepping every text node. None of them mention "64" anywhere.

The figure is confirmed, but only via Apple's developer forums — still an Apple-run channel, and this specific reply carries an "Apple Staff, Engineer" badge (`developer.apple.com/forums/thread/811171`):

> "Yes, there is a limit of 64 for how many simultaneous notification requests can be active/pending at one time per app. This is a system limit and there is no way around it."

Whether a single `DailyTriggerInput`/`UNCalendarNotificationTrigger`-with-`repeats` counts as **one** slot against that 64, or somehow more: not explicitly stated by Apple anywhere I found, but strongly implied by how repeats is documented to work at all. Apple's own guide ("Scheduling a notification locally from your app") describes it as one persistent, self-rearming request: "Configuring the trigger with the `repeats` parameter set to `true` causes the system to reschedule the event after its delivery" — i.e., the OS doesn't materialize 64 future daily instances up front, it keeps one request and re-arms it after each firing. Treat "one repeating request = one of the 64 slots" as well-supported but not a direct Apple quote.

For this app: irrelevant at the scale of one Habit's one daily reminder. Only worth revisiting if the product ever lets every Habit carry its own independent daily reminder and a user has dozens of Habits — even then, 64 is generous headroom for a personal habit tracker, but it's a ceiling worth remembering if reminders-per-Habit ever becomes a supported pattern.

## Question 2 — Android predictive back with React Navigation / Expo Router

Applies to: Expo SDK 57 (npm `expo@57.0.14`), `expo-router@57.0.14`, `@react-navigation/native-stack@7.18.9` (React Navigation major v7), `react-native-screens@4.27.0` stable (`5.0.0-alpha.2` is the current alpha of a rewritten major).

### 1. Enabling predictive back in an Expo app

`docs.expo.dev/versions/latest/config/app/`, verbatim:

> `predictiveBackGestureEnabled` — Type: boolean • Path: `android.predictiveBackGestureEnabled` — "Enable your app to use the predictive back gesture on Android 13 (API level 33) and later. Default to false." — "Existing React Native app? To change the setting, update the `android:enableOnBackInvokedCallback` value in `AndroidManifest.xml`."

So: the key is `android.predictiveBackGestureEnabled` in `app.json`/`app.config.js`, it's a boolean, and it **does** generate the `android:enableOnBackInvokedCallback` manifest attribute for you under Continuous Native Generation (the managed workflow / prebuild) — the "existing React Native app?" callout is telling bare-workflow apps without a generated manifest to set the native attribute by hand instead, which confirms the Expo config-plugin path does that generation automatically for everyone else.

```json
{
  "expo": {
    "android": {
      "predictiveBackGestureEnabled": true
    }
  }
}
```

It defaults to `false` today. That's notable against Expo's own earlier stated plan — [expo.dev/changelog/sdk-54](https://expo.dev/changelog/sdk-54): "The Android predictive back gesture feature is disabled by default in all projects in SDK 54... we plan to enable this by default in all projects in SDK 55 or 56." That plan has not shipped: the current SDK-57 docs still say "Default to false," three SDKs later. The likely reason is below.

### 2. react-native-screens / React Navigation native-stack support

**Not implemented in the stable line, and turning the flag on today breaks Expo Router's default stack.**

Straight from the library maintainer, `github.com/software-mansion/react-native-screens/discussions/2540` ("Predictive back gesture support on Android"):

- kkafar, 2025-07-11: "doing predictive back gesture on Fragment level on Android...requires FragmentManager's back stack usage, which in turn eliminates possibility of synchronously committing fragment transactions & we need that in our implementation ==> **highly likely this won't be ever done in react native screens v4.**"
- Same day, follow-up: "I have more context now, because I'm researching things for next major & we might try to land that, however it's months away."
- As of the most recent comment in the thread (2026-07-03), a user is still asking "has this been added yet or any info about it's release?" with no maintainer reply yet in what I could pull.

`react-native-screens` is currently `4.27.0` stable — still the "v4" line the maintainer said predictive back "highly likely" never lands in. A `5.0.0-alpha.1`/`5.0.0-alpha.2` line exists (published 2026-07-24 and 2026-08-10), but neither alpha's release notes mention predictive back landing.

There is a separate, narrower thread: Expo SDK 56's changelog mentions "experimental support for a new version of the native stack (Stack v5)...including initial support for Material-style headers and predictive back gesture," tied to a `react-native-screens@4.25.0-beta.1` tag. This is opt-in, experimental, and is **not** what `@react-navigation/native-stack` uses by default, nor what Expo Router's default `<Stack>` uses — it's a separate, forward-looking API surface, not the thing the `android.predictiveBackGestureEnabled` flag interacts with in a standard app.

The concrete failure mode, confirmed by an accepted, still-open Expo issue — [github.com/expo/expo/issues/39092](https://github.com/expo/expo/issues/39092), "[SDK 54] Back navigation with gesture does not work on Android with Expo Router when the predictive back gesture is enabled": a back gesture pops the whole app to the home screen instead of popping one screen off the stack. Expo maintainer `Ubax` root-caused it directly:

> "The predictive back gesture support is currently missing in react-native-screens. Since this is the library we use for rendering screens on Android, the feature needs to be implemented there... Right now the only fix I can recommend is setting `predictiveBackGestureEnabled` to `false`."

Labels: "Issue accepted," "Upstream: React Native Screens." State: **open**, `updated_at` 2026-08-11 — nine days before this research. Later comments in the thread (through 2026-03-13) show people still hitting it and workarounds ("set `predictiveBackGestureEnabled: false`", "use `targetSdkVersion 35` instead of the default 36") that are reported as unreliable ("tried this but unfortunately doesn't work").

Bottom line for this app: leave `android.predictiveBackGestureEnabled` at its default `false`. Turning it on is not "a nice-to-have that might have rough edges" — it currently breaks basic back navigation in exactly the stack (Expo Router + default native-stack) this app would use.

### 3. Does native-stack's `gestureEnabled` give Android its own swipe-back?

**No — confirmed.** From `reactnavigation.org/docs/native-stack-navigator/` (React Navigation 7.x, current major), verbatim:

> `gestureEnabled` — "Whether you can use gestures to dismiss this screen. Defaults to `true`. **Only supported on iOS.**"

Every other gesture-shaping option on the same page carries the identical restriction: `gestureDirection` ("Only supported on iOS"), `fullScreenGestureEnabled` ("Only supported on iOS"), `animationMatchesGesture` ("Only supported on iOS"). There is no Android equivalent documented on this page at all, and no mention of Android's predictive-back or edge-gesture system on the native-stack-navigator reference page.

This confirms the assertion in the decision document exactly as stated: native-stack has no gesture-recognizer-driven pan-to-dismiss of its own on Android. What Android users experience as "swipe back" is the OS's own edge-gesture (or hardware key) triggering the standard Android back dispatch, which native-stack's Android integration listens for to pop the top screen — the same mechanism that existed before predictive back was ever invented, and the same one ADR 0004's amendment describes ("Android's edge gesture is the system back"). It is not a JS-configurable, per-screen gesture the way iOS's is.

Practically: the *animated preview* Android 13+ predictive back adds on top of that dispatch is what's currently missing (Question 2.2, above) — the underlying "edge gesture pops the stack" behavior is not missing and needs no library support to keep working.

### 4. Version applicability for Question 2

- Expo SDK 57 / `expo@57.0.14` — current stable, matches a fresh `npx create-expo-app` today.
- `expo-router@57.0.14`.
- `@react-navigation/native-stack@7.18.9` — React Navigation major v7; the `gestureEnabled`/iOS-only wording is from the current (7.x) docs.
- `react-native-screens@4.27.0` stable — the version backing native-stack today, and the one the maintainer says predictive back "highly likely" never reaches. `5.0.0-alpha.2` (2026-08-10) is the newest alpha; no predictive-back landing confirmed there yet.
- `android.predictiveBackGestureEnabled` exists in Expo config schema starting SDK 54; still defaults to `false` as of SDK 57.

## Version applicability

| Library | Version researched | As of |
|---|---|---|
| Expo SDK | 57 (`expo@57.0.14`, npm `latest`) | 2026-08-20 |
| expo-notifications | ~57.0.12 (docs "Recommended version") | 2026-08-20 |
| expo-router | 57.0.14 | 2026-08-20 |
| @react-navigation/native-stack | 7.18.9 (React Navigation v7) | 2026-08-20 |
| react-native-screens | 4.27.0 stable / 5.0.0-alpha.2 alpha | 2026-08-20 |

SDK 57 is what a fresh `npx create-expo-app` installs today (npm `expo`'s `latest` dist-tag is `57.0.14`; `58.0.0-canary-*` exists but is unreleased). Nothing here is ahead of what a new project gets.

## Not confirmed

- Whether reusing a custom `identifier` on a second `scheduleNotificationAsync` call overwrites the earlier pending request, errors, or duplicates it. The docs list `identifier` as optional without describing collision behavior.
- The exact numeric interpretation of Apple's 64 pending-notification limit is not stated on any current Apple DocC reference page I checked (`add(_:withCompletionHandler:)`, `UNNotificationRequest`, `UNCalendarNotificationTrigger`, `UNNotificationTrigger`, `getPendingNotificationRequests(completionHandler:)`, the "Scheduling a notification locally" guide). It's confirmed only via an Apple-staff forum reply, not documentation proper.
- Whether one repeating (`repeats: true` / daily) request counts as exactly one of Apple's 64 slots is strongly implied by how `repeats` is documented to behave (a single self-rearming request), but Apple does not say this in so many words anywhere I found.
- Android's `setAndAllowWhileIdle` drift figures ("about every minute" normally, "significantly longer, such as 15 minutes" in Doze) are the platform's own qualitative language, not a hard guarantee — actual behavior varies by OEM battery-management customization, which Android's docs don't attempt to bound.
- Whether/when react-native-screens ships predictive back support in a stable release. The maintainer said "months away" in July 2025 with no committed date; as of the most recent activity found (comments through 2026-07-03, issue `updated_at` 2026-08-11) it has not shipped in the stable v4 line, and neither 5.0.0 alpha's release notes mention it landing.
- Expo's own local-notification "works in Expo Go" statement is a blanket claim ("Local notifications (in-app notifications) remain available in Expo Go") rather than trigger-type-specific; I did not find a source that separately confirms `DailyTriggerInput` specifically (as opposed to `TIME_INTERVAL`/`DATE`) inside Expo Go on Android, though there's no documented reason to expect it to differ.

## What this means for ADR 0006 and ADR 0007

**ADR 0007 ("The Reminder is local, and never push") is not contradicted by anything found here — it's confirmed and filled in.** Its central claim, "Every Reminder is scheduled on the device by the app and raised by the device. There is no push service, no subscription endpoint and no server," is exactly what `expo-notifications`' local scheduling API delivers: `DailyTriggerInput` schedules and re-arms entirely on-device, no network involved, and it works the same whether or not the app ever ships a backend. Nothing in ADR 0007 makes an SDK-version-specific or config-plugin-specific claim that this research disagrees with. One friendly addition worth folding in when the phone app is actually built: local scheduled notifications work in Expo Go on Android (only *remote/push* was removed there, in SDK 53) — so the Reminder can be built and tested without reaching for a development build, which ADR 0007's "never push" framing already implied but didn't need to state.

**ADR 0006 needs a caveat, and ADR 0004's amendment (which is where the specific technical claim actually lives) holds up.**

ADR 0004's "Amendment: the native target (ADR 0006)" section says: "The swipe rides along and is welcome there — iOS gives the interactive pop by default, and Android's edge gesture is the system back." That is **confirmed, precisely**, by React Navigation's own docs: native-stack's `gestureEnabled` (and every related gesture option) is documented as "Only supported on iOS," with no Android equivalent. Android's back-swipe was always the OS's own back dispatch, not a library feature — true before predictive back existed and still true now. This part of the decision record is right and needs no change.

ADR 0006 itself is less careful. In rejecting Capacitor, it lists what a WebView can't give you: "a native header, the iOS interactive pop, Android predictive back." That's true as a *directional* argument — a TWA/WebView architecturally cannot ever get predictive back, because it doesn't own a native Activity/Fragment back stack, so going native was the right call to keep that door open. But the sentence reads as if "Android predictive back" is a benefit already secured by the decision, alongside "a native header" and "the iOS interactive pop" — both of which genuinely are free and on-by-default in the chosen stack. Predictive back is not in that category today:

- It's off by default even in the stack ADR 0006 commits to (`android.predictiveBackGestureEnabled` defaults to `false` as of SDK 57, three SDKs after Expo said they'd flip the default).
- The library both React Navigation's native-stack and Expo Router depend on for Android screens, `react-native-screens`, does not implement it in its current stable major, per the maintainer directly: "highly likely this won't be ever done in react native screens v4."
- Turning the flag on today, in exactly this app's planned stack (Expo Router's default `<Stack>`), is an accepted, open, maintainer-confirmed bug — the gesture exits the app instead of popping a screen, with no reliable workaround reported.

Recommendation: amend ADR 0006 (or note in whatever implementation plan follows it) that "Android predictive back" is a *future-native-only* capability, not a delivered one — the decision to go native keeps it possible, it does not make it available. Treat it as a follow-up to revisit once `react-native-screens` ships support (no committed date as of this research), not as part of the initial phone-app scope. Nothing about ADR 0004's actual navigation design needs to change: the bottom bar / native-header approach it describes does not depend on predictive back at all — it already gets a working (if not predictively-animated) Android back gesture for free, exactly as ADR 0004's amendment says.
