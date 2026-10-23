import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  type BaseContentPack,
  baseContentPackSchema,
  flagCoverageIssues,
  packV2Issues,
  type StoryPack,
  storyPackSchema,
} from "../../../protocols/pack-v2/index.ts";

const MAX_FILE_BYTES = 2_000_000;

const MANIFEST_FILES: ReadonlySet<string> = new Set(["pack.yaml", "pack.yml", "pack.json"]);

export interface PackV2LoadIssue {
  rule: string;
  file: string;
  path: string;
  message: string;
}

export type PackV2LoadResult =
  | { ok: true; kind: "base-content"; pack: BaseContentPack }
  | { ok: true; kind: "story"; pack: StoryPack; base: BaseContentPack }
  | { ok: false; issues: PackV2LoadIssue[] };

const issue = (file: string, path: string, rule: string, message: string): PackV2LoadIssue => ({
  rule,
  file,
  path,
  message: message.startsWith(`${rule}:`) ? message : `${rule}: ${message}`,
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

const mergeBoardSpaces = (root: string, assembled: Record<string, unknown>): PackV2LoadIssue[] => {
  const issues: PackV2LoadIssue[] = [];
  const board = assembled.board;
  if (!board || typeof board !== "object" || Array.isArray(board)) return issues;
  const boardObj = board as Record<string, unknown>;
  if (Array.isArray(boardObj.spaces) && boardObj.spaces.length > 0) return issues;
  const spacesFile = join(root, "board", "spaces.json");
  try {
    const parsed = JSON.parse(readFileSync(spacesFile, "utf8")) as {
      spaces?: unknown;
      river_crossings?: unknown;
      draft_note?: unknown;
    };
    if (parsed.spaces) boardObj.spaces = parsed.spaces;
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

/** Loads one v2 pack folder. Story packs resolve `base_pack` under the same parent directory. */
export const loadPackV2Dir = (dir: string, packsV2Root?: string): PackV2LoadResult => {
  let root = resolve(dir);
  try {
    root = realpathSync(root);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, issues: [issue(dir, "(file)", "P2-1", message)] };
  }

  const issues: PackV2LoadIssue[] = [];
  const names = readdirSync(root).sort();
  const packFile = names.find((name) => MANIFEST_FILES.has(name));
  if (!packFile) {
    return {
      ok: false,
      issues: [issue("(none)", "(file)", "P2-1", "The pack folder has no manifest.")],
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
  issues.push(...mergeBoardSpaces(root, assembled));

  for (const name of names) {
    if (name === packFile || name === "README.md" || name === "board") continue;
    const entryPath = join(root, name);
    try {
      if (statSync(entryPath).isDirectory()) continue;
    } catch {
      continue;
    }
    if (MANIFEST_FILES.has(name)) {
      issues.push(issue(name, "(file)", "P2-1", "The pack has two manifest files."));
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
    }
  }

  if (issues.length > 0) return { ok: false, issues };

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
      return {
        ok: false,
        issues: packV2Issues(parsed.error).map((item) =>
          issue(packFile, item.path, item.rule, item.message),
        ),
      };
    }
    return { ok: true, kind: "base-content", pack: parsed.data };
  }

  if (kind === "story") {
    const parsed = storyPackSchema.safeParse(assembled);
    if (!parsed.success) {
      return {
        ok: false,
        issues: packV2Issues(parsed.error).map((item) =>
          issue(packFile, item.path, item.rule, item.message),
        ),
      };
    }
    const story = parsed.data;
    const semantic = flagCoverageIssues(story);
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
    if (issues.length > 0) return { ok: false, issues };

    return { ok: true, kind: "story", pack: story, base: baseLoaded.pack };
  }

  return {
    ok: false,
    issues: [issue(packFile, "kind", "P2-1", "A v2 pack kind is story or base-content.")],
  };
};

export const isPackV2Manifest = (dir: string): boolean => {
  try {
    const root = realpathSync(resolve(dir));
    const names = readdirSync(root);
    const packFile = names.find((name) => MANIFEST_FILES.has(name));
    if (!packFile) return false;
    const read = readPackFile(root, packFile);
    if (!("ok" in read) || !read.value || typeof read.value !== "object") return false;
    return (read.value as { format?: unknown }).format === 2;
  } catch {
    return false;
  }
};

export const formatPackV2Issues = (issues: readonly PackV2LoadIssue[]): string[] =>
  issues.map(
    (item) => `file=${item.file} path=${item.path} rule=${item.rule} message=${item.message}`,
  );
