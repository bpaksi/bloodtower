import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  declaredSymbols,
  exportedSymbols,
  scanTree,
  sourceFiles,
  V1_FILES,
  V1_SYMBOLS,
} from "./noV1Scan.ts";

const src = resolve(import.meta.dirname, "../../..");
const DEAD_FILES = [
  "server/timing/log.ts",
  "server/timing/log.test.ts",
  "server/timing/stats.ts",
  "server/control/lock.ts",
  "server/control/lock.test.ts",
];

// The v1 names come from the scanner's list, and fixture specifiers go through q(), so the scanner
// meets no v1 text in this file and needs no exclusion.
const q = (spec: string) => JSON.stringify(spec);
const [CARD = "", , PACK_V1 = "", , LOAD_PACK = "", LOAD_CARD = ""] = V1_SYMBOLS;

describe("no v1 import is left (C3-01 EV-02)", () => {
  it("has deleted the v1 story-card and loader files", () => {
    for (const file of V1_FILES) expect(existsSync(join(src, file)), file).toBe(false);
  });

  const real = scanTree(src);

  it("imports none of them, by any path", () => {
    expect(real.importHits).toEqual([]);
  });

  it("declares or exports none of the v1 symbols", () => {
    expect(real.symbolHits).toEqual([]);
  });

  it("re-exports nothing from server/pack except v2, assets, camera and audio", () => {
    expect(real.packReexportHits).toEqual([]);
  });

  it("scans this test and the scanner too, so a sibling helper cannot hide a shim", () => {
    const scanned = sourceFiles(src).map((path) => relative(src, path));
    expect(scanned).toContain("server/pack/v2/noV1.test.ts");
    expect(scanned).toContain("server/pack/v2/noV1Scan.ts");
  });
});

describe("the scanner catches a plausible shim (C3-01 EV-02)", () => {
  it.each([
    ["an alias of a local name", `const Local = 1;\nexport { Local as ${CARD} };`],
    ["a type alias export", `type Local = {};\nexport type { Local as ${PACK_V1} };`],
    ["an inline type specifier", `export { type Local as ${CARD}, other };`],
    ["a quoted export name", `export { Local as "${LOAD_CARD}" };`],
    [
      "a multi-line list with comments",
      `export {\n  a,\n  // the old shape\n  Local\n    as ${LOAD_PACK},\n  b,\n};`,
    ],
    ["a renamed re-export", `export { ${CARD} as Other } from ${q("./elsewhere.ts")};`],
    ["a plain re-export", `export { ${CARD} } from ${q("./elsewhere.ts")};`],
    ["a namespace alias", `export * as ${CARD} from ${q("./elsewhere.ts")};`],
    ["a type declaration", `export type ${CARD} = { id: string };`],
    ["an interface", `export interface ${PACK_V1} {}`],
    ["a const", `export const ${LOAD_CARD} = () => 1;`],
    ["a declared function", `export declare function ${LOAD_PACK}(): void;`],
    ["an async function", `export async function ${LOAD_CARD}() {}`],
    ["a var", `var ${CARD} = 1;`],
    ["an enum", `export enum ${CARD} { A }`],
  ])("flags %s", (_label, text) => {
    expect([
      ...declaredSymbols(text, V1_SYMBOLS),
      ...exportedSymbols(text, V1_SYMBOLS),
    ]).not.toEqual([]);
  });

  it.each([
    ["a longer name", `export type Shell${CARD} = {};\nexport { Shell${CARD} };`],
    ["a different alias", `export { ShellStory as Pick, type Other };`],
    ["a re-export of an allowed module", `export * from ${q("./v2/load.ts")};`],
    ["a call named from", `export function f() { return Array.from("x"); }`],
    ["a mention in a line comment", `// the old type ${CARD} is gone\nexport const a = 1;`],
    ["a mention in a block comment", `/* export type ${CARD} = {}; */\nexport const a = 1;`],
  ])("passes %s", (_label, text) => {
    expect([...declaredSymbols(text, V1_SYMBOLS), ...exportedSymbols(text, V1_SYMBOLS)]).toEqual(
      [],
    );
  });

  const withTree = (files: Record<string, string>, run: (root: string) => void) => {
    const root = mkdtempSync(join(tmpdir(), "no-v1-"));
    try {
      for (const [file, text] of Object.entries(files)) {
        mkdirSync(dirname(join(root, file)), { recursive: true });
        writeFileSync(join(root, file), text);
      }
      run(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };

  it("reads every source extension, including .js .cjs .mts .cts and .jsx", () => {
    const shim = `module.exports = {};\nexport { Local as ${CARD} };\n`;
    const names = ["a.js", "b.cjs", "c.mts", "d.cts", "e.jsx", "f.mjs", "g.tsx"];
    withTree(Object.fromEntries(names.map((name) => [`server/x/${name}`, shim])), (root) => {
      expect(
        scanTree(root)
          .symbolHits.map((hit) => hit.split(":")[0])
          .sort(),
      ).toEqual(names.map((name) => `server/x/${name}`).sort());
    });
  });

  it("flags a stray module that re-exports a deleted v1 file by any extension", () => {
    withTree(
      {
        "server/a.ts": `export * from ${q("./pack/load")};`,
        "server/b.js": `export * from ${q("./pack/load.js")};`,
        "server/c.mts": `export { x } from ${q("../protocols/pack.ts")};`,
        "server/d.cjs": `const m = require(${q("../protocols/storyCard")});`,
        "server/e.ts": `export type * from ${q("../protocols/storyCard.ts")};`,
        "server/ok.ts": `export * from ${q("./pack/v2/load.ts")};`,
      },
      (root) => {
        expect(
          scanTree(root)
            .importHits.map((hit) => hit.split(" ")[0])
            .sort(),
        ).toEqual(["server/a.ts", "server/b.js", "server/c.mts", "server/d.cjs", "server/e.ts"]);
      },
    );
  });

  it("flags export * from a stray path under server/pack, and from the folder itself", () => {
    withTree(
      {
        "server/pack/v2/load.ts": "export const ok = 1;",
        "server/pack/assets.ts": "export const ok = 1;",
        "server/pack/legacy.ts": "export const legacy = 1;",
        "server/pack/shim.ts": `export * from ${q("./legacy.ts")};`,
        "server/index.ts": `export * from ${q("./pack")};`,
        "server/core/a.ts": `export * from ${q("../pack/legacy.js")};`,
        "server/core/b.ts": `export * from ${q("../pack/v2/load.ts")};\nexport * from ${q("../pack/assets.ts")};`,
      },
      (root) => {
        expect(
          scanTree(root)
            .packReexportHits.map((hit) => hit.split(" ")[0])
            .sort(),
        ).toEqual(["server/core/a.ts", "server/index.ts", "server/pack/shim.ts"]);
      },
    );
  });

  it("skips node_modules and dot folders only", () => {
    withTree(
      {
        "node_modules/x/a.js": `export { Local as ${CARD} };`,
        ".next/a.js": `export { Local as ${CARD} };`,
        "web/a.js": `export { Local as ${CARD} };`,
      },
      (root) => {
        expect(scanTree(root).symbolHits).toEqual([`web/a.js: ${CARD}`]);
      },
    );
  });
});

describe("dead files are removed (C3-01 EV-05)", () => {
  it("has deleted the timing log, the stats file and the press lock, with their tests", () => {
    for (const file of DEAD_FILES) expect(existsSync(join(src, file)), file).toBe(false);
  });
});
