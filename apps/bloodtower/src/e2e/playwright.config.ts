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

// Specs kept out of every project.
const ignored = [
  "**/backdrop-flicker.spec.ts",
  "**/board-look.spec.ts",
  "**/hunter-portraits.spec.ts",
  "**/keeper-fit.spec.ts",
  "**/opening-screens.spec.ts",
  "**/startup-shell.spec.ts",
  "**/visual-layer.spec.ts",
  "**/landing.spec.ts",
];

// Project gating lives here, not in `test.skip(project.name ...)` calls. A runtime skip is still
// listed for the project, and `--shard` splits by listed entries, so the skips piled up in some
// shards and left others idle. A spec or test that is not listed for a project costs nothing.
//
// Whole specs, by file:
// - The Story board on the Mac, with its own board and iPad viewports.
const desktopOnlySpecs = [
  "**/a1-demo-playback.spec.ts",
  "**/c2-play-again.spec.ts",
  "**/c2-session-enter.spec.ts",
  "**/c2-session-screen.spec.ts",
  "**/c2-tower-lost.spec.ts",
  "**/c4-tuning-switches.spec.ts",
];
// - The board shots are at 1920x1080 from one project.
const ipadOnlySpecs = [
  "**/c3-hints.spec.ts",
  "**/c3-skull-lines.spec.ts",
  "**/d1-skull-loss.spec.ts",
];
// - The desktop viewport is not a W3 board size.
const devicesOnlySpecs = ["**/w3-pick-story.spec.ts"];
//
// Single tests and describes, by tag (`{ tag: "@ipad-only" }`):
// - `@desktop-only`: the desktop project only (the Story board and its Sound dialog).
// - `@ipad-only`: the ipad project only (one device width, or an iPad-portrait mockup).
// - `@devices-only`: phone and ipad, not desktop.
//
// CI runs four shards with PWTEST_SHARD_WEIGHTS (check.yml, e2e-main.yml). Playwright cuts the
// listed tests, in project then file order, into four contiguous slices sized by those weights.
// To retune: take each test's time from a CI run's list output, then pick the three cut points in
// `--list` order that give each slice about the same total time. The weights are the slice sizes.

export default defineConfig({
  testDir: "./tests",
  testIgnore: ignored,
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
      testIgnore: [...ignored, ...desktopOnlySpecs, ...ipadOnlySpecs],
      grepInvert: /@desktop-only|@ipad-only/,
      use: { browserName: "chromium", viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    {
      name: "ipad",
      testIgnore: [...ignored, ...desktopOnlySpecs],
      grepInvert: /@desktop-only/,
      use: { browserName: "chromium", viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
    {
      name: "desktop",
      testIgnore: [...ignored, ...ipadOnlySpecs, ...devicesOnlySpecs],
      grepInvert: /@ipad-only|@devices-only/,
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
    {
      // iOS-style engine, scoped to the hydration guard only (#414).
      name: "webkit",
      testMatch: "**/join-hydration.spec.ts",
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        // WebKit rejects the Chromium-only autoplay flag from the shared launchOptions.
        launchOptions: { args: [] },
      },
    },
  ],
  webServer: {
    // Build first, the same as tower-poc: a stale or missing export fails most specs.
    // `--dir`: the root package is also named `bloodtower`, so `-F bloodtower` would build every app.
    // CI sets E2E_PREBUILT=1 only after its own `pnpm --dir apps/bloodtower build` step, so the
    // build runs once there. Locally it is unset and the build still runs first.
    command: `${process.env.E2E_PREBUILT === "1" ? "" : "pnpm --dir apps/bloodtower build && "}pnpm -F bloodtower-server start`,
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
