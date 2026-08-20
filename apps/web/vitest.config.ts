import { defaultExclude, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

// tsconfig says `jsx: "preserve"` for Next, so esbuild is told explicitly to
// compile it. That is the whole reason no React plugin is needed here.
const shared = { esbuild: { jsx: "automatic" }, resolve: { alias } } as const;

/**
 * The rules moved to `packages/domain` and are tested in node there, which is
 * what keeps a component from quietly becoming load-bearing for them. What is
 * left here is the app — and two tests that read `globals.css` as source text.
 * `pnpm test` at the root runs every package.
 */
const CSS_TESTS = ["src/app/palette.test.ts", "src/app/typography.test.ts"];

export default defineConfig({
  ...shared,
  test: {
    projects: [
      {
        ...shared,
        test: {
          // Source text, not a rendered document: these read the stylesheet off
          // disk, so they run in node and `import.meta.url` stays a file URL.
          name: "css",
          include: CSS_TESTS,
          environment: "node",
        },
      },
      {
        ...shared,
        test: {
          name: "web",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          exclude: [...defaultExclude, ...CSS_TESTS],
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          restoreMocks: true,
        },
      },
    ],
  },
});
