# The web app puts back at the bottom, and Home has no chrome

In the web app, each Screen that the user can leave has one back control. The
control is at the bottom of the viewport and has the full width. These Screens
are the year of a Habit, the name field, settings and the Share Card.

Home has no back control, because the user cannot go back from Home.

The phone app has no such control. The phone app uses a native stack, and the
header of the platform is the way out of each Screen.

## Reason

The manifest forces this on one platform. The value of `display` is
`standalone`. Thus an installed web app has no browser chrome.

On iOS, this leaves nothing behind the corner control. The corner control is
then the only way out of four Screens, at approximately 40 x 22 pixels. The
minimum is 44 x 44 pixels.

A native app has a header. The platform gives the header to VoiceOver and
TalkBack. The app does not do this with its own markup. A control below a native
header is a second way out of the same Screen.

Android is different in the web app, but the control stays. Android has a system
back control: a hardware key or an edge gesture. The system back control is a
history pop. Thus it goes to the same Screen as the control of the app.

The control of the app is not necessary on Android, but it stays for three
reasons:

- A different design for each platform needs platform detection. The same build
  installs on Android phones, Chromebooks and desktop Chrome. These report
  different values and get different system chrome.
- A gesture is not visible. See the rejected option below.
- A way out that the app draws is a guarantee. A way out that the operating
  system draws is not.

## Considered options

**A tab bar at the bottom.** A bar at the bottom of a phone is usually a tab
bar. Thus persons will continue to propose this. It is not correct here, for two
reasons.

First, the Screens are a stack with three levels and not a set of equal
destinations. The Share Card is below settings. The year of a Habit is below
Home. There are only two destinations of equal level.

Second, a tab bar is always visible. It uses approximately 56 pixels of each
visit to Home to show a link to settings. The user opens settings approximately
one time each month. The user opens Home for less than ten seconds and closes
it. Those pixels must show Squares.

**An edge swipe as the way back.** We rejected this option. An edge swipe is not
visible to a new user. It is not available to a user with VoiceOver or Switch
Control. Thus it can only be an addition to a visible control.

As an addition, an edge swipe is correct and has no cost. iOS gives the
interactive pop in the native stack. The Android edge gesture is the system
back.

**Put the main action of each Screen in the control.** We rejected this option.
Settings has no single main action. The year of a Habit has two actions of equal
weight. The `save` action of the name field is a form submit that is disabled
while the field is empty. Thus `save` belongs below the field. The control shows
back and nothing else.

## Consequences

The Lens buttons are less than 44 pixels high. This is deliberate. The three
buttons are directly above a Heatmap on two Screens. At full height they become
a block of chrome above the Squares. This ADR rejects that cost. We record the
exception here.

On Android, the control of the web app is directly above the system navigation
bar. The value of `viewport-fit` is `cover`. Thus a collision is possible, and
it depends on the safe-area inset that Chrome reports for the navigation mode of
the device.

The control adds `env(safe-area-inset-bottom)` and is correct in both cases. If
Chrome reports an inset, the control is above the gesture pill. If Chrome
reports no inset, the viewport stops above the navigation bar. Test this on an
Android phone in gesture mode.

The name field does not take focus automatically. A fixed control and a software
keyboard use the same pixels. If the keyboard opens with the Screen, the way out
is behind the keyboard. This is the first Screen that a new user sees. One tap
on the field is the cost of a way out on each Screen.
