"use client";

import { useCallback, useEffect, useState } from "react";
import { BackBar } from "@/components/BackBar";
import { StoreProvider } from "@squares/domain/store";
import { webStorage } from "@/platform/storage";
import { ApplyTheme } from "@/platform/theme";
import { DetailScreen } from "@/screens/DetailScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { NewHabitScreen } from "@/screens/NewHabitScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { ShareScreen } from "@/screens/ShareScreen";

type Screen =
  | { name: "home" }
  | { name: "detail"; habitId: string }
  | { name: "new" }
  | { name: "settings" }
  | { name: "share" };

export default function Page() {
  return (
    <StoreProvider storage={webStorage}>
      <ApplyTheme />
      <App />
    </StoreProvider>
  );
}

function App() {
  const [stack, setStack] = useState<Screen[]>([{ name: "home" }]);
  const screen = stack[stack.length - 1] ?? { name: "home" };

  // Depth is kept in the history entry rather than inferred, so that a jump of
  // more than one level — hiding from a detail screen, say — lands in the
  // right place with a single popstate.
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const depth = (event.state as { depth?: number } | null)?.depth ?? 0;
      setStack((current) => current.slice(0, depth + 1));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stack.length, screen.name]);

  // The history entry is written here rather than inside the setStack updater:
  // an updater must be pure, and React invokes it twice under StrictMode, which
  // would push the same depth onto the history twice and cost a second tap to
  // get back out of every screen.
  const push = useCallback(
    (next: Screen) => {
      window.history.pushState({ depth: stack.length }, "");
      setStack((current) => [...current, next]);
    },
    [stack.length],
  );

  const back = useCallback(() => window.history.back(), []);

  // The stack itself is left to the resulting popstate, so that a jump of more
  // than one level unwinds through exactly the same path as a single back.
  const home = useCallback(() => {
    if (stack.length > 1) window.history.go(-(stack.length - 1));
  }, [stack.length]);

  const body = () => {
    switch (screen.name) {
      // Everything about one Habit is on this Screen: its name, its Streak, its
      // Share Card opt-in, and whether it is Hidden.
      case "detail":
        return <DetailScreen habitId={screen.habitId} />;
      case "new":
        return <NewHabitScreen onDone={home} />;
      case "settings":
        return (
          <SettingsScreen
            onShare={() => push({ name: "share" })}
            // The only route to a Hidden Habit, which Home no longer lists.
            onOpenHabit={(habitId) => push({ name: "detail", habitId })}
          />
        );
      // A name on the card opens the Habit that put it there, one level deeper
      // rather than back — the bar still leads to the card it came from.
      case "share":
        return <ShareScreen onOpenHabit={(habitId) => push({ name: "detail", habitId })} />;
      default:
        return (
          <HomeScreen
            onOpenHabit={(habitId) => push({ name: "detail", habitId })}
            onNewHabit={() => push({ name: "new" })}
            onSettings={() => push({ name: "settings" })}
          />
        );
    }
  };

  // The bar is derived from the stack rather than remembered per Screen, so
  // "a Screen you can leave" cannot drift out of step with "a Screen with a way
  // out". Home is never above depth zero and so never has one — see ADR 0006.
  return (
    <>
      {body()}
      {stack.length > 1 ? <BackBar onBack={back} /> : null}
    </>
  );
}
