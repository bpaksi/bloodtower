import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    environment: "node",
    passWithNoTests: true,
    // Vitest 5's module cache defaults to the repo-root node_modules/.vitest-cache, shared by every
    // package; parallel runs in `pnpm check` then clear each other's cache (ENOENT/ENOTEMPTY).
    fsModuleCachePath: fileURLToPath(new URL("./node_modules/.vitest-cache", import.meta.url)),
  },
});
