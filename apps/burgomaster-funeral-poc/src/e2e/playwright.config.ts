import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";
import { loadConfig } from "../server/config.ts";

// The e2e port from `.wt.json` when this checkout is a worktree, otherwise 4768.
const port = loadConfig({ env: {} }).ports.e2e;
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
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
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
      DATA_DIR: join(tmpdir(), "burgomaster-funeral-poc-e2e"),
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
