import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StoreProvider } from "@squares/domain/store";
import { deviceStorage } from "@/platform/storage";
import { SURFACE } from "@/platform/theme";

/**
 * A native stack, and no bar the app draws itself.
 *
 * ADR 0004 put a back bar at the bottom of every Screen because a standalone
 * web app on iOS has nothing behind its corner control. A native app has a
 * header, exposed to VoiceOver and TalkBack by the platform, so the principle —
 * every Screen shows a visible way out — is kept and only its implementation
 * changes. The swipe rides along: iOS gives the interactive pop by default and
 * Android's edge gesture is the system back. See the ADR's native amendment.
 */
export default function RootLayout() {
  return (
    <StoreProvider storage={deviceStorage}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: SURFACE.bg },
          headerTintColor: SURFACE.fg,
          contentStyle: { backgroundColor: SURFACE.bg },
        }}
      >
        {/* Home is the one Screen with nothing to go back from. */}
        <Stack.Screen name="index" options={{ title: "squares", headerShown: false }} />
      </Stack>
    </StoreProvider>
  );
}
