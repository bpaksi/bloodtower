import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";
import { e2eDataDir, loadConfig } from "../server/config.ts";

// Ports and the SQLite folder come from `.wt.json` in a worktree, otherwise 4788 and `data/e2e`.
// `env: {}` keeps a stray PORT or DATA_DIR in this process from moving the run.
const config = loadConfig({ env: {} });
const port = config.ports.e2e;
const dataDir = e2eDataDir(config.dataDir);
rmSync(dataDir, { recursive: true, force: true });
mkdirSync(dataDir, { recursive: true });
const baseURL = `http://127.0.0.1:${port}`;
const repoRoot = join(import.meta.dirname, "../../../..");

export default defineConfig({
  testDir: "./tests",
  testIgnore: [
    "**/backdrop-flicker.spec.ts",
    "**/board-look.spec.ts",
    "**/hunter-portraits.spec.ts",
    "**/keeper-fit.spec.ts",
    "**/opening-screens.spec.ts",
    "**/startup-shell.spec.ts",
    "**/visual-layer.spec.ts",
    "**/landing.spec.ts",
  ],
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    // Headless Chromium refuses the screen wake lock unless it is granted, so every touch
    // project showed the wake-lock-refused notice over the device controls (#342).
    // c2-ipad-awake stubs navigator.wakeLock itself to test the refusal.
    permissions: ["screen-wake-lock"],
    launchOptions: {
      // A lost gesture must fail. Chromium's default would let a suspended context look running.
      args: ["--autoplay-policy=user-gesture-required"],
    },
  },
  projects: [
    {
      name: "phone",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    {
      name: "ipad",
      use: { browserName: "chromium", viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
    {
      // iOS-style engine, scoped to the hydration guard only (#414).
      name: "webkit",
      testMatch: "**/join-hydration.spec.ts",
      use: { browserName: "webkit", viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
  webServer: {
    // Build first, the same as tower-poc: a stale or missing export fails most specs.
    // `--dir`: the root package is also named `bloodtower`, so `-F bloodtower` would build every app.
    command: "pnpm --dir apps/bloodtower build && pnpm -F bloodtower-server start",
    cwd: repoRoot,
    url: `${baseURL}/health`,
    env: {
      PORT: String(port),
      HOST: "127.0.0.1",
      DATA_DIR: dataDir,
      MOCK: "1",
    },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
