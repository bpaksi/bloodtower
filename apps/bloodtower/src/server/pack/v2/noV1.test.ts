import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const src = resolve(import.meta.dirname, "../../..");
const self = import.meta.filename;

const V1_FILES = ["protocols/pack.ts", "protocols/storyCard.ts", "server/pack/load.ts"];
const V1_SYMBOLS = [
  "StoryCard",
  "StoryCardV1",
  "PackV1",
  "PackMetaV1",
  "loadPackV1",
  "loadStoryCard",
];
const ALLOWED_PACK_REEXPORTS = new Set(["v2", "assets", "camera", "audio"]);
const DEAD_FILES = [
  "server/timing/log.ts",
  "server/timing/log.test.ts",
  "server/timing/stats.ts",
  "server/control/lock.ts",
  "server/control/lock.test.ts",
];

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name.startsWith(".")) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx|mjs)$/.test(name) && path !== self ? [path] : [];
  });

const files = sources(src).map((path) => ({ path, text: readFileSync(path, "utf8") }));

/** Every module specifier a file imports, re-exports or dynamically imports. */
const specifiers = (text: string): { spec: string; isExport: boolean }[] => {
  const found: { spec: string; isExport: boolean }[] = [];
  for (const match of text.matchAll(/\b(import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']/g)) {
    found.push({ spec: match[2] ?? "", isExport: match[1] === "export" });
  }
  for (const match of text.matchAll(/\bimport\s*["']([^"']+)["']/g)) {
    found.push({ spec: match[1] ?? "", isExport: false });
  }
  for (const match of text.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) {
    found.push({ spec: match[1] ?? "", isExport: false });
  }
  return found;
};

const resolved = (file: string, spec: string) => resolve(dirname(file), spec);

describe("no v1 import is left (C3-01 EV-02)", () => {
  it("has deleted the v1 story-card and loader files", () => {
    for (const file of V1_FILES) expect(existsSync(join(src, file)), file).toBe(false);
  });

  it("imports none of them, by any path", () => {
    const banned = new Set(V1_FILES.map((file) => join(src, file)));
    const hits: string[] = [];
    for (const { path, text } of files) {
      for (const { spec } of specifiers(text)) {
        const target = spec.startsWith(".") ? resolved(path, spec) : spec;
        const bare = target.replace(/\.(ts|tsx)$/, "");
        const isBanned = [...banned].some((file) => file.replace(/\.ts$/, "") === bare);
        if (isBanned || /(?:^|\/)(?:protocols\/pack|protocols\/storyCard|pack\/load)$/.test(bare)) {
          hits.push(`${relative(src, path)} -> ${spec}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("declares or re-exports none of the v1 symbols", () => {
    const hits: string[] = [];
    for (const { path, text } of files) {
      for (const name of V1_SYMBOLS) {
        const declared = new RegExp(
          `\\b(?:export\\s+)?(?:type|interface|const|let|function|class)\\s+${name}\\b`,
        );
        const exportList = new RegExp(`\\bexport\\s*(?:type\\s*)?\\{[^}]*\\b${name}\\b[^}]*\\}`);
        if (declared.test(text) || exportList.test(text)) {
          hits.push(`${relative(src, path)}: ${name}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("re-exports nothing from server/pack except v2, assets, camera and audio", () => {
    const packRoot = join(src, "server", "pack") + sep;
    const hits: string[] = [];
    for (const { path, text } of files) {
      for (const { spec, isExport } of specifiers(text)) {
        if (!isExport || !spec.startsWith(".")) continue;
        const target = resolved(path, spec);
        if (!`${target}`.startsWith(packRoot)) continue;
        const first =
          relative(packRoot, target)
            .split(sep)[0]
            ?.replace(/\.(ts|tsx)$/, "") ?? "";
        if (!ALLOWED_PACK_REEXPORTS.has(first)) hits.push(`${relative(src, path)} -> ${spec}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

describe("dead files are removed (C3-01 EV-05)", () => {
  it("has deleted the timing log, the stats file and the press lock, with their tests", () => {
    for (const file of DEAD_FILES) expect(existsSync(join(src, file)), file).toBe(false);
  });
});
