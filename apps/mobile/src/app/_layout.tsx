import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StoreProvider } from "@squares/domain/store";
import { deviceStorage } from "@/platform/storage";
import { MONO, useTheme } from "@/platform/theme";

/**
 * A native stack, and no bar the app draws itself.
 *
 * ADR 0006 put a back bar at the bottom of every Screen because a standalone
 * web app on iOS has nothing behind its corner control. A native app has a
 * header, exposed to VoiceOver and TalkBack by the platform, so the principle —
 * every Screen shows a visible way out — is kept and only its implementation
 * changes. The swipe rides along: iOS gives the interactive pop by default and
 * Android's edge gesture is the system back. See the ADR's native amendment.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider storage={deviceStorage}>
          <Shell />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Inside the provider, because the Theme is read from the record — the switch
 * is on Settings and takes effect without a relaunch, so the header cannot be
 * painted from a module constant.
 */
function Shell() {
  const t = useTheme();
  return (
    <>
      <StatusBar style={t.dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.fg,
          // ADR 0006's word for the way out, kept. Without this the label is
          // the route name, so leaving Settings offered "‹ index".
          headerBackTitle: "back",
          headerTitleStyle: { fontFamily: MONO, fontSize: 15 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        {/* Home is the one Screen with nothing to go back from. */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="new" options={{ title: "new habit" }} />
        <Stack.Screen name="settings" options={{ title: "settings" }} />
        <Stack.Screen name="share" options={{ title: "share card" }} />
        {/* The title is the Habit's name, set on the Screen that knows it. */}
        <Stack.Screen name="habit/[id]" />
      </Stack>
    </>
  );
}
