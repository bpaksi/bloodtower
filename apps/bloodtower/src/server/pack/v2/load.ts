import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  type BaseContentPack,
  baseContentPackSchema,
  flagCoverageIssues,
  type PackMetadata,
  packMetadataSchema,
  packV2Issues,
  type StoryPack,
  sceneDataIssues,
  sceneLabelForPath,
  storyPackSchema,
} from "../../../protocols/pack-v2/index.ts";
import {
  indexPackAssets,
  mediaOnDiskIssues,
  type PackAssetIndex,
  readPackAssetIndex,
  stillAspectIssues,
  validateAssetsFolder,
} from "../assets.ts";

const MAX_FILE_BYTES = 2_000_000;

const MANIFEST_FILES: ReadonlySet<string> = new Set(["pack.yaml", "pack.yml", "pack.json"]);

export interface PackV2LoadIssue {
  rule: string;
  file: string;
  path: string;
  message: string;
  /** The missing id the issue is about, when there is one (a chapter no manifest declares). */
  id?: string;
}

/**
 * `metadata` is a `playable: false` manifest with no `format` (DEC-691): only the manifest and
 * `assets/` are read, and no story content is validated. It lists on Pick story and stops there.
 */
export type PackV2LoadResult =
  | {
      ok: true;
      kind: "metadata";
      pack: PackMetadata;
      assets: PackAssetIndex;
      warnings: PackV2LoadIssue[];
    }
  | { ok: true; kind: "base-content"; pack: BaseContentPack; warnings: PackV2LoadIssue[] }
  | { ok: true; kind: "story"; pack: StoryPack; base: BaseContentPack; warnings: PackV2LoadIssue[] }
  | { ok: false; issues: PackV2LoadIssue[] };

const isMarkdownNote = (name: string) => name.toLowerCase().endsWith(".md");
const isPackData = (name: string) => /\.(ya?ml|json)$/i.test(name);

const issue = (file: string, path: string, rule: string, message: string): PackV2LoadIssue => ({
  rule,
  file,
  path,
  message: message.startsWith(`${rule}:`) ? message : `${rule}: ${message}`,
});

/** A schema issue inside `scenes` names its scene and option, not only their indexes (C3-18). */
const namedSceneMessage = (
  input: unknown,
  item: { rule: string; path: string; message: string },
): string => {
  const label = sceneLabelForPath(input, item.path);
  if (!label || item.message.includes(label)) return item.message;
  const prefix = `${item.rule}: `;
  const body = item.message.startsWith(prefix) ? item.message.slice(prefix.length) : item.message;
  return `${prefix}${label}: ${body}`;
};

/** Schema failures under `tuning` are issues in tuning.yaml, not the manifest. */
const tuningSchemaIssues = (
  packFile: string,
  error: Parameters<typeof packV2Issues>[0],
): PackV2LoadIssue[] =>
  packV2Issues(error).map((item) => {
    if (item.path === "tuning") return issue("tuning.yaml", "(file)", item.rule, item.message);
    if (item.path.startsWith("tuning.")) {
      return issue("tuning.yaml", item.path.slice("tuning.".length), item.rule, item.message);
    }
    return issue(packFile, item.path, item.rule, item.message);
  });

const isInside = (root: string, file: string) => file === root || file.startsWith(`${root}${sep}`);

const readPackFile = (
  root: string,
  name: string,
): { ok: true; value: unknown } | PackV2LoadIssue => {
  const path = join(root, name);
  let real = path;
  try {
    real = realpathSync(path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return issue(name, "(file)", "P2-1", message);
  }
  if (!isInside(root, real)) {
    return issue(name, "(file)", "P2-1", "A pack file stays inside the pack folder.");
  }
  const size = statSync(real).size;
  if (size > MAX_FILE_BYTES) {
    return issue(name, "(file)", "P2-1", "A pack file is over the size limit.");
  }
  const text = readFileSync(real, "utf8");
  try {
    const value = name.endsWith(".json") ? (JSON.parse(text) as unknown) : parseYaml(text);
    if (value === null || value === undefined) {
      return issue(name, "(file)", "P2-1", "The file is empty.");
    }
    return { ok: true, value };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return issue(name, "(file)", "P2-1", message);
  }
};

const idOf = (value: unknown): unknown =>
  value && typeof value === "object" ? (value as { id?: unknown }).id : undefined;

/**
 * pack.yaml region labels win over the ones board/spaces.json generates (the documented order).
 * When some of them have no id, spaces that point at a generated REG- id find no region, and the
 * schema only says each region is unknown. This issue names the cause instead (#293).
 */
const overriddenRegionIssues = (
  packFile: string,
  yamlLabels: unknown[],
  spaces: unknown,
): PackV2LoadIssue[] => {
  const idless = yamlLabels.filter((label) => typeof idOf(label) !== "string").length;
  if (idless === 0 || !Array.isArray(spaces)) return [];
  const known = new Set(yamlLabels.map(idOf).filter((id) => typeof id === "string"));
  const lost = spaces.filter((space) => {
    const region = (space as { region?: unknown } | null)?.region;
    return typeof region === "string" && !known.has(region);
  }).length;
  if (lost === 0) return [];
  return [
    issue(
      packFile,
      "board.region_labels",
      "P2-2",
      `board.region_labels in ${packFile} replace the REG- labels in board/spaces.json, and ${idless} of them have no id, so ${lost} spaces point at a region that no longer exists. Give those labels their REG- ids, or remove board.region_labels from ${packFile} to use the generated ones.`,
    ),
  ];
};

const mergeBoardSpaces = (
  root: string,
  packFile: string,
  assembled: Record<string, unknown>,
): PackV2LoadIssue[] => {
  const issues: PackV2LoadIssue[] = [];
  const board = assembled.board;
  if (!board || typeof board !== "object" || Array.isArray(board)) return issues;
  const boardObj = board as Record<string, unknown>;
  if (Array.isArray(boardObj.spaces) && boardObj.spaces.length > 0) return issues;
  const spacesFile = join(root, "board", "spaces.json");
  try {
    const parsed = JSON.parse(readFileSync(spacesFile, "utf8")) as {
      spaces?: unknown;
      region_labels?: unknown;
      river_crossings?: unknown;
      draft_note?: unknown;
    };
    if (parsed.spaces) boardObj.spaces = parsed.spaces;
    // The board map tool writes the regions with the spaces; pack.yaml labels win if it has any.
    const yamlLabels = boardObj.region_labels;
    if (parsed.region_labels && !(Array.isArray(yamlLabels) && yamlLabels.length > 0)) {
      boardObj.region_labels = parsed.region_labels;
    } else if (Array.isArray(yamlLabels) && yamlLabels.length > 0) {
      issues.push(...overriddenRegionIssues(packFile, yamlLabels, parsed.spaces));
    }
    if (parsed.river_crossings && !boardObj.river_crossings) {
      boardObj.river_crossings = parsed.river_crossings;
    }
    if (parsed.draft_note && !boardObj.draft_note) boardObj.draft_note = parsed.draft_note;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      const message = error instanceof Error ? error.message : String(error);
      issues.push(issue("board/spaces.json", "(file)", "P2-1", message));
    }
  }
  return issues;
};

/**
 * A story may keep its quests in `quests.yaml`: a list of quests, each naming its `chapter`.
 * They are appended to that chapter's `quests`. A chapter the manifest does not declare is a
 * P2-2 issue on `quests.yaml` that names the missing chapter id.
 * This is the one split file beyond `board/` and `tuning.yaml`, and it exists because EV-04
 * requires an issue on `…/quests.yaml` for a quest whose `chapter:` is undeclared: a quest nested
 * in the manifest has no `chapter:` field (the nesting is the reference), so no manifest-only
 * shape can raise that issue. A quest's `chapter` key is removed before the strict schema runs.
 */
const mergeSplitQuests = (
  file: string,
  value: unknown,
  assembled: Record<string, unknown>,
): PackV2LoadIssue[] => {
  if (!Array.isArray(value)) {
    return [issue(file, "(file)", "P2-1", "quests.yaml is a list of quests.")];
  }
  const issues: PackV2LoadIssue[] = [];
  const chapters = Array.isArray(assembled.chapters)
    ? (assembled.chapters as Record<string, unknown>[])
    : [];
  for (const [index, row] of value.entries()) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      issues.push(issue(file, `${index}`, "P2-1", "A quest is an object."));
      continue;
    }
    const { chapter: chapterId, ...quest } = row as Record<string, unknown>;
    const target = chapters.find((chapter) => chapter && chapter.id === chapterId);
    if (typeof chapterId !== "string" || !target) {
      issues.push({
        ...issue(
          file,
          `${index}.chapter`,
          "P2-2",
          `chapter ${String(chapterId)} is not declared by the manifest.`,
        ),
        id: String(chapterId),
      });
      continue;
    }
    target.quests = [...(Array.isArray(target.quests) ? target.quests : []), quest];
  }
  return issues;
};

const loadMetadataOnly = (
  root: string,
  packFile: string,
  manifest: Record<string, unknown>,
): PackV2LoadResult => {
  const folder: PackV2LoadIssue[] = [];
  validateAssetsFolder(root, (item) => folder.push(item));
  if (folder.length > 0) return { ok: false, issues: folder };
  const parsed = packMetadataSchema.safeParse(manifest);
  if (!parsed.success) {
    return {
      ok: false,
      issues: packV2Issues(parsed.error).map((item) =>
        issue(packFile, item.path, item.rule, item.message),
      ),
    };
  }
  const meta = parsed.data;
  const packIndex = readPackAssetIndex(root);
  if (packIndex.issue) return { ok: false, issues: [packIndex.issue] };
  const media = mediaOnDiskIssues(root, [], meta.cover, "P2-2", packIndex.index);
  if (media.errors.length > 0) return { ok: false, issues: media.errors };
  const indexed = indexPackAssets(root, { pack_id: meta.pack_id, assets: [], cover: meta.cover });
  const shape = stillAspectIssues(indexed, { assets: [], cover: meta.cover });
  if (shape.length > 0) return { ok: false, issues: shape };
  const warnings = [...indexed.warnings, ...media.warnings];
  return { ok: true, kind: "metadata", pack: meta, assets: { ...indexed, warnings }, warnings };
};

/**
 * Loads one pack folder. Story packs resolve `base_pack` under the same parent directory.
 * A `playable: false` manifest with no `format` loads as metadata only.
 */
export const loadPackV2Dir = (dir: string, packsV2Root?: string): PackV2LoadResult => {
  let root = resolve(dir);
  let names: string[];
  try {
    root = realpathSync(root);
    names = readdirSync(root).sort();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, issues: [issue(dir, "(file)", "P2-1", message)] };
  }

  const issues: PackV2LoadIssue[] = [];
  const packFile = names.find((name) => MANIFEST_FILES.has(name));
  if (!packFile) {
    return {
      ok: false,
      issues: [issue(root, "(file)", "P2-1", "The pack folder has no manifest.")],
    };
  }

  const read = readPackFile(root, packFile);
  if (!("ok" in read)) return { ok: false, issues: [read] };
  if (!read.value || typeof read.value !== "object" || Array.isArray(read.value)) {
    return {
      ok: false,
      issues: [issue(packFile, "(file)", "P2-1", "The pack manifest is a JSON object.")],
    };
  }

  const assembled = { ...(read.value as Record<string, unknown>) };
  if (assembled.format !== 2 && assembled.playable === false) {
    return loadMetadataOnly(root, packFile, assembled);
  }
  issues.push(...mergeBoardSpaces(root, packFile, assembled));

  for (const name of names) {
    if (name === packFile || name === "board" || isMarkdownNote(name)) continue;
    const entryPath = join(root, name);
    try {
      if (statSync(entryPath).isDirectory()) continue;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push(issue(name, "(file)", "P2-1", message));
      continue;
    }
    if (MANIFEST_FILES.has(name)) {
      issues.push(issue(name, "(file)", "P2-1", "The pack has two manifest files."));
      continue;
    }
    // A metadata-only pack is its manifest. Notes and sibling files are not parsed.
    if (assembled.playable === false) continue;
    if (!isPackData(name)) {
      issues.push(issue(name, "(file)", "P2-1", "This file is not part of the pack."));
      continue;
    }
    const extra = readPackFile(root, name);
    if (!("ok" in extra)) {
      issues.push(extra);
      continue;
    }
    const stem = basename(name).replace(/\.(ya?ml|json)$/i, "");
    if (stem in assembled) {
      issues.push(
        issue(name, "(file)", "P2-1", `Split file ${name} duplicates manifest field ${stem}.`),
      );
      continue;
    }
    if (stem === "quests" && assembled.kind === "story") {
      issues.push(...mergeSplitQuests(name, extra.value, assembled));
      continue;
    }
    if (stem !== "tuning") continue;
    if (assembled.kind !== "base-content") {
      issues.push(issue(name, "(file)", "P2-1", "Only the base pack holds tuning (Q-C3-08)."));
      continue;
    }
    assembled.tuning = extra.value;
  }

  if (assembled.kind === "base-content" && !Object.hasOwn(assembled, "tuning")) {
    issues.push(
      issue("tuning.yaml", "(file)", "P2-1", "The base pack needs tuning.yaml (DEC-703)."),
    );
  }

  if (issues.length > 0) return { ok: false, issues };

  // A generated assets/index.json that cannot be read stops the load (A1-9, D45).
  const packIndex = readPackAssetIndex(root);
  if (packIndex.issue) return { ok: false, issues: [packIndex.issue] };

  const format = assembled.format;
  if (format !== 2) {
    return {
      ok: false,
      issues: [
        issue(packFile, "format", "P2-1", "Pack format v2 requires format: 2 on the manifest."),
      ],
    };
  }

  const kind = assembled.kind;
  if (kind === "base-content") {
    const parsed = baseContentPackSchema.safeParse(assembled);
    if (!parsed.success) {
      return { ok: false, issues: tuningSchemaIssues(packFile, parsed.error) };
    }
    const media = mediaOnDiskIssues(root, parsed.data.assets, undefined, "P2-2", packIndex.index);
    if (media.errors.length > 0) return { ok: false, issues: media.errors };
    return { ok: true, kind: "base-content", pack: parsed.data, warnings: media.warnings };
  }

  if (kind === "story") {
    const parsed = storyPackSchema.safeParse(assembled);
    if (!parsed.success) {
      return {
        ok: false,
        issues: packV2Issues(parsed.error).map((item) =>
          issue(packFile, item.path, item.rule, namedSceneMessage(assembled, item)),
        ),
      };
    }
    const story = parsed.data;
    const semantic = [...flagCoverageIssues(story), ...sceneDataIssues(story)];
    if (semantic.length > 0) {
      return {
        ok: false,
        issues: semantic.map((item) => issue(packFile, item.path, item.rule, item.message)),
      };
    }

    const v2Root = packsV2Root ?? dirname(root);
    const baseDir = join(v2Root, story.base_pack);
    const baseLoaded = loadPackV2Dir(baseDir, v2Root);
    if (!baseLoaded.ok) {
      return {
        ok: false,
        issues: baseLoaded.issues.map((item) => ({
          ...item,
          file: `base/${item.file}`,
          message: `base pack ${story.base_pack}: ${item.message}`,
        })),
      };
    }
    if (baseLoaded.kind !== "base-content") {
      return {
        ok: false,
        issues: [
          issue(packFile, "base_pack", "P2-2", `base pack ${story.base_pack} is not base content.`),
        ],
      };
    }

    const heroIds = new Set(baseLoaded.pack.heroes.map((hero) => hero.id));
    for (const [index, assignment] of story.start.assignments.entries()) {
      if (!heroIds.has(assignment.hero)) {
        issues.push(
          issue(
            packFile,
            `start.assignments.${index}.hero`,
            "P2-2",
            `hero ${assignment.hero} is not in base pack ${story.base_pack}.`,
          ),
        );
      }
    }
    const spaceIds = new Set(baseLoaded.pack.board.spaces.map((space) => space.id));
    for (const [ci, chapter] of story.chapters.entries()) {
      for (const [qi, quest] of chapter.quests.entries()) {
        if (quest.place && !spaceIds.has(quest.place.space)) {
          issues.push(
            issue(
              packFile,
              `chapters.${ci}.quests.${qi}.place.space`,
              "P2-2",
              `quest ${quest.id} stands on space ${quest.place.space}, which is not on the base pack ${story.base_pack} board.`,
            ),
          );
        }
      }
    }
    if (issues.length > 0) return { ok: false, issues };

    const media = mediaOnDiskIssues(root, story.assets, undefined, "P2-2", packIndex.index);
    if (media.errors.length > 0) return { ok: false, issues: media.errors };
    return {
      ok: true,
      kind: "story",
      pack: story,
      base: baseLoaded.pack,
      warnings: media.warnings,
    };
  }

  return {
    ok: false,
    issues: [issue(packFile, "kind", "P2-1", "A v2 pack kind is story or base-content.")],
  };
};

export const formatPackV2Issues = (issues: readonly PackV2LoadIssue[]): string[] =>
  issues.map(
    (item) => `file=${item.file} path=${item.path} rule=${item.rule} message=${item.message}`,
  );
