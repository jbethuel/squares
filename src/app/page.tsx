"use client";

import { useCallback, useEffect, useState } from "react";
import { StoreProvider } from "@/domain/store";
import { DetailScreen } from "@/screens/DetailScreen";
import { EditScreen } from "@/screens/EditScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";

type Screen =
  | { name: "home" }
  | { name: "detail"; habitId: string }
  | { name: "edit"; habitId: string | null }
  | { name: "settings" };

export default function Page() {
  return (
    <StoreProvider>
      <App />
    </StoreProvider>
  );
}

function App() {
  const [stack, setStack] = useState<Screen[]>([{ name: "home" }]);
  const screen = stack[stack.length - 1] ?? { name: "home" };

  // Depth is kept in the history entry rather than inferred, so that a jump of
  // more than one level — archiving from a detail screen, say — lands in the
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

  const push = useCallback((next: Screen) => {
    setStack((current) => {
      window.history.pushState({ depth: current.length }, "");
      return [...current, next];
    });
  }, []);

  const back = useCallback(() => window.history.back(), []);

  const home = useCallback(() => {
    setStack((current) => {
      if (current.length > 1) window.history.go(-(current.length - 1));
      return current;
    });
  }, []);

  switch (screen.name) {
    case "detail":
      return (
        <DetailScreen
          habitId={screen.habitId}
          onBack={back}
          onEdit={() => push({ name: "edit", habitId: screen.habitId })}
        />
      );
    case "edit":
      return <EditScreen habitId={screen.habitId} onDone={home} onCancel={back} />;
    case "settings":
      return <SettingsScreen onBack={back} />;
    default:
      return (
        <HomeScreen
          onOpenHabit={(habitId) => push({ name: "detail", habitId })}
          onNewHabit={() => push({ name: "edit", habitId: null })}
          onSettings={() => push({ name: "settings" })}
        />
      );
  }
}
