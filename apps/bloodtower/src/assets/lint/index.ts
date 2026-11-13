import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { buildJobFromDir } from "../needs/build.ts";
import { assetKeys } from "../needs/deps.ts";
import { NeedsError } from "../needs/issues.ts";
import { type LintReport, lintPackIndex } from "./lint.ts";
import { INDEX_FILE } from "./rules.ts";

export * from "./indexSchema.ts";
export {
  CAPTION_MAX,
  type LintReport,
  lintAvatar,
  lintGlowFiles,
  lintIndexEntries,
  lintIndexEntriesReport,
  lintIndexText,
  lintIndexTextReport,
  lintPackIndex,
} from "./lint.ts";
export {
  anchorInBounds,
  edgeRatio,
  isGrayscale,
  outsideAnchorChanges,
  type Raster,
  readRaster,
} from "./raster.ts";
export { INDEX_FILE, indexIssue, LINT_RULE } from "./rules.ts";

/** The asset IDs a pack references: the ones in the job `assets:needs` builds from it. */
export const referencedIds = (packDir: string): string[] => {
  const { job } = buildJobFromDir(basename(packDir), packDir);
  return [...new Set(assetKeys(job).map((k) => k.assetId))];
};

/**
 * `pack:lint`'s index step: undefined when the pack has no `assets/index.json`, else the errors
 * and warnings (both empty when clean). A pack the job cannot be built from reports the job's own
 * issues as errors.
 */
export const lintPackAssets = async (
  packDir: string,
  release: boolean,
): Promise<LintReport | undefined> => {
  if (!existsSync(join(packDir, INDEX_FILE))) return undefined;
  let referenced: string[];
  try {
    referenced = referencedIds(packDir);
  } catch (error) {
    if (error instanceof NeedsError) return { errors: [...error.issues], warnings: [] };
    throw error;
  }
  return lintPackIndex(packDir, referenced, release);
};
