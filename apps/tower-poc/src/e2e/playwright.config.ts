import { defineConfig } from "@playwright/test";

// Not 4747, so a test run never collides with a running tower service.
const PORT = 4748;
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
  // Viewports from spec §5. Phone and iPad run on WebKit, the engine behind iOS and iPadOS Safari.
  projects: [
    {
      name: "phone",
      use: { browserName: "webkit", viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    {
      name: "ipad",
      use: { browserName: "webkit", viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    // The same path as production: static export served by the tower server on one port.
    command: "pnpm -F tower-poc build && pnpm -F tower-poc-server start",
    url: baseURL,
    // MOCK keeps end-to-end runs away from the real tower, which is the service's default.
    // An in-memory database: each run starts with nothing saved, so no restore prompt (D11).
    env: { PORT: String(PORT), HOST: "127.0.0.1", MOCK: "1", DB_PATH: ":memory:" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
