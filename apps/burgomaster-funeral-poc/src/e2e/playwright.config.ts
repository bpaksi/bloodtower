import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";
import { e2eDataDir, loadConfig } from "../server/config.ts";

// Ports and the SQLite folder come from `.wt.json` in a worktree, otherwise 4768 and `data/e2e`.
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
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  // Phone and iPad on WebKit, desktop on Chromium. Same viewports as tower-poc.
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
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
        // The opening lines start from a socket message, after the Begin click has returned.
        launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
      },
    },
  ],
  webServer: {
    command:
      "pnpm -F burgomaster-funeral-poc build && pnpm -F burgomaster-funeral-poc-server start",
    cwd: repoRoot,
    url: `${baseURL}/health`,
    env: {
      PORT: String(port),
      HOST: "127.0.0.1",
      DATA_DIR: dataDir,
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
