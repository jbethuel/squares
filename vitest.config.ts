import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

// tsconfig says `jsx: "preserve"` for Next, so esbuild is told explicitly to
// compile it. That is the whole reason no React plugin is needed here.
const shared = { esbuild: { jsx: "automatic" }, resolve: { alias } } as const;

export default defineConfig({
  ...shared,
  test: {
    projects: [
      {
        // The rules are plain TypeScript and are tested without a DOM, so a
        // component can never quietly become load-bearing for them.
        ...shared,
        test: {
          name: "domain",
          include: ["src/domain/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        ...shared,
        test: {
          name: "ui",
          include: ["src/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          restoreMocks: true,
        },
      },
    ],
  },
});
