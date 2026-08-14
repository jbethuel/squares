import { defaultExclude, defineConfig } from "vitest/config";
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
          // handoff is the one file under domain/ that is not a rule: it hands
          // a file to the device, so it is browser plumbing and needs a DOM to
          // hand it to. It runs in the ui project instead. Named here rather
          // than renamed to .tsx, so the split keeps meaning what it says.
          exclude: [...defaultExclude, "src/domain/handoff.test.ts"],
          environment: "node",
        },
      },
      {
        ...shared,
        test: {
          name: "ui",
          include: ["src/**/*.test.tsx", "src/domain/handoff.test.ts"],
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          restoreMocks: true,
        },
      },
    ],
  },
});
