# Back lives at the bottom, and Home carries no chrome

Every Screen the user can leave — a Habit's own year, the name field, settings, the Share Card — carries one fixed, full-width back control pinned to the bottom of the viewport. Home carries none, because Home is the one Screen with nothing to go back from.

This is forced by the manifest, on one platform. `display` is `standalone`, so an installed app has no browser chrome — and on iOS that leaves nothing at all behind the corner control, which was therefore not merely awkward but the only exit from four Screens, at roughly 40 by 22 pixels against a 44 by 44 floor.

Android is the exception, and the bar is deliberately kept there anyway. Android keeps its system back — hardware key or edge gesture — and it is a plain history pop, so it already unwinds this app's stack correctly and lands in the same place the bar does. The bar is therefore redundant on Android rather than load-bearing. It stays because varying navigation by platform means sniffing for one, and the same build installs on Android phones, Chromebooks and desktop Chrome, which report differently and get different system chrome; because a gesture is exactly the affordance rejected below for being invisible; and because a way out the app draws itself is a guarantee, where a way out the OS draws is a bet.

## Considered options

A bottom tab bar was the shape originally asked for, and it is the one that will keep getting suggested, because a bar at the bottom of a phone usually is one. It is wrong here twice over. The Screens are a stack three deep, not a set of peers — the Share Card sits under settings, a Habit's year sits under Home — and there are only two destinations of equal rank to put in it. Worse, a tab bar is persistent by definition, so it would spend around 56 pixels of every Home visit advertising settings, a Screen opened perhaps monthly. Home is where 95% of the app happens, it is opened and closed in under ten seconds, and the pixels a bar would take are Squares.

An edge swipe was rejected as the route back rather than overlooked. It is invisible to a first-time user and unavailable to anyone driving the phone by VoiceOver or Switch Control, so it can only ever be an addition to a visible control, never a replacement for one — and as an addition it earns nothing a well-placed control has not already earned.

The bar carries back and nothing else. Pulling each Screen's main action into it was considered and dropped: settings has no single main action, a Habit's year has two of equal weight, and `save` on the name field is a form submit that disables itself while the field is empty, so it belongs under the field it judges rather than in a bar across the Screen from it.

## Consequences

The Lens buttons stay under 44 pixels, deliberately. They are a group of three sitting directly above a Heatmap on two Screens, and at full height they become a slab of chrome over the Squares — which is the cost this ADR exists to refuse. The exception is recorded rather than hidden.

On Android the bar sits directly above the system navigation bar, and `viewport-fit` is `cover`, so whether the two collide depends on whether Chrome reports a bottom safe-area inset for that device's navigation mode. The bar pads by `env(safe-area-inset-bottom)` and is correct either way — clear of the gesture pill when an inset is reported, and already above the navigation bar when the viewport stops short of it. This is the one part of the design that reading cannot settle; it wants a look on a real Android handset in gesture mode.

The name field no longer takes focus by itself. A fixed bar and a software keyboard contend for the same pixels, and a new Habit used to open with the keyboard already up — so the one Screen a first-time user meets would have opened with its exit behind the keyboard. One tap on the field is the price of every Screen always showing its way out.
