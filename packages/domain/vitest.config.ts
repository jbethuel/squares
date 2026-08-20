import { defineConfig } from "vitest/config";

// The rules run in node with no DOM, so a component can never quietly become
// load-bearing for them. `.test.tsx` is excluded by the include pattern rather
// than by a rule: anything needing a DOM belongs to an app, not here.
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    name: "domain",
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
