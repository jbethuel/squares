# The web app puts back at the bottom, and Home has no chrome

In the web app, every Screen you can leave has a single, full-width back control
at the bottom of the viewport. Those Screens are a Habit's year, the name field,
settings and the Share Card.

Home has no back control, because there's nowhere to go back to.

The phone app doesn't have this control. It uses a native stack, and the
platform header is the way out of each Screen.

## Reason

The manifest forces this on one platform. `display` is `standalone`, so the
installed web app has no browser chrome.

On iOS that leaves nothing but the corner control, which would be the only way
out of four Screens and only about 40×22 pixels, below the 44×44 minimum.

A native app gets a header from the platform, which also exposes it to VoiceOver
and TalkBack without any markup from us. A control under a native header would
just be a second exit from the same Screen.

Android works differently in the web app, but the control stays. Android has a
system back (a hardware key or an edge gesture), and it's a history pop, so it
lands on the same Screen as our control.

The control isn't strictly needed on Android, but we keep it for three reasons:

- Designing per platform means detecting the platform. The same build installs
  on Android phones, Chromebooks and desktop Chrome, which report different
  things and get different system chrome.
- Gestures aren't visible. See the rejected option below.
- An exit the app draws itself is guaranteed to be there. One the OS draws
  isn't.

## Considered options

**A bottom tab bar.** A bar at the bottom of a phone screen is usually a tab bar,
so people will keep suggesting it. It's wrong here for two reasons.

First, the Screens are a three-level stack, not a set of peers. The Share Card
sits under settings, and a Habit's year sits under Home. There are only two
top-level destinations.

Second, a tab bar is always on screen. It would spend about 56 pixels of every
visit to Home on a link to settings, which you open maybe once a month. Home is
open for under ten seconds at a time, and those pixels should be showing
Squares.

**An edge swipe to go back.** Rejected as the only way back. New users can't see
it, and VoiceOver and Switch Control users can't use it, so it can only ever
supplement a visible control.

As a supplement it's free and correct: iOS gives us the interactive pop in the
native stack, and Android's edge gesture is the system back.

**Put each Screen's main action in the control.** Rejected. Settings has no
single main action, a Habit's year has two equally weighted ones, and the name
field's `save` is a form submit that's disabled while the field is empty, so it
belongs under the field. The control is back and nothing else.

## Consequences

The Lens buttons are shorter than 44 pixels, on purpose. They sit directly above
a Heatmap on two Screens, and at full height they'd become a slab of chrome over
the Squares, which is exactly the cost this ADR argues against. We're recording
the exception to the 44-pixel minimum here.

On Android, the web app's control sits right above the system navigation bar.
`viewport-fit` is `cover`, so they can collide, depending on what safe-area
inset Chrome reports for the device's navigation mode.

The control adds `env(safe-area-inset-bottom)`, which handles both cases. If
Chrome reports an inset, the control sits above the gesture pill. If it doesn't,
the viewport already stops above the navigation bar. Test this on an Android
phone in gesture navigation mode.

The name field doesn't autofocus. A fixed control and the software keyboard
compete for the same pixels, so if the keyboard opened with the Screen it would
cover the exit, on the very first Screen a new user sees. One extra tap on the
field is the price of always having a way out.
