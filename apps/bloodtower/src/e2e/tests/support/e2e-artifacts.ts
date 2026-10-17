import { copyFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { TestInfo } from "@playwright/test";

const repoLocalScreenshotsDir = () =>
  join(import.meta.dirname, "../../../test-results/screenshots");

/**
 * Stable screenshot copies for walkthroughs and visual review.
 * `E2E_ARTIFACTS_DIR` when set (e.g. `/opt/cursor/artifacts/screenshots` on a cloud agent VM);
 * otherwise `apps/bloodtower/test-results/screenshots` (gitignored via root `test-results/`).
 */
export const e2eArtifactsDir = (_testInfo?: TestInfo): string => {
  const fromEnv = process.env.E2E_ARTIFACTS_DIR?.trim();
  if (fromEnv) return resolve(fromEnv);
  return repoLocalScreenshotsDir();
};

export const ensureE2eArtifactsDir = (testInfo?: TestInfo): string => {
  const dir = e2eArtifactsDir(testInfo);
  mkdirSync(dir, { recursive: true });
  return dir;
};

/** Copy a Playwright screenshot (usually from `testInfo.outputPath()`) into the artifacts dir. */
export const copyToE2eArtifacts = (
  testInfo: TestInfo,
  sourcePath: string,
  filename: string,
): void => {
  const dir = ensureE2eArtifactsDir(testInfo);
  copyFileSync(sourcePath, join(dir, filename));
};
