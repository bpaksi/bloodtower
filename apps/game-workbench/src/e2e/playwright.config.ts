import { defineConfig } from "@playwright/test";

// Not 4797 (the workbench's own dev and start port), so a run never collides with a running one.
const PORT = Number(process.env.WORKBENCH_E2E_PORT ?? 4798);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  // Wide enough that the detail panel sits beside the graph (it overlays it below 1200 px).
  projects: [
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    // The same path as `pnpm start`: a production build, read-only, reading research/game-design.
    command: `pnpm -F game-workbench-web build && pnpm -F game-workbench-web exec next start -p ${PORT} -H 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
