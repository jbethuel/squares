import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "artwork",
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
