/**
 * The scanner behind the "no v1 import is left" check (C3-01 EV-02). It reads every source file
 * under a `src/` root, and its own file and tests are scanned too: the v1 names are assembled
 * from parts here, so no file needs to be left out and a helper beside it cannot hide a shim.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

/** Built from parts so that this module never spells a v1 name itself. */
const name = (...parts: string[]) => parts.join("");

export const V1_SYMBOLS: readonly string[] = [
  name("Story", "Card"),
  name("Story", "Card", "V1"),
  name("Pack", "V1"),
  name("Pack", "Meta", "V1"),
  name("load", "Pack", "V1"),
  name("load", "Story", "Card"),
];

export const V1_FILES: readonly string[] = [
  name("protocols/", "pack.ts"),
  name("protocols/", "story", "Card.ts"),
  name("server/pack/", "load.ts"),
];

export const ALLOWED_PACK_REEXPORTS: ReadonlySet<string> = new Set([
  "v2",
  "assets",
  "camera",
  "audio",
]);

const SOURCE_EXT = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const MODULE_EXT = /\.(?:[cm]?[jt]s|[jt]sx)$/;

/** Every source file under `dir`: ts, tsx, js, jsx, mjs, cjs, mts, cts. */
export const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    if (entry === "node_modules" || entry.startsWith(".")) return [];
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return SOURCE_EXT.test(entry) ? [path] : [];
  });

/** Drops comments, so a mention in prose is not a declaration. Strings are left alone. */
export const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

/** Every module specifier a file imports, re-exports, requires or dynamically imports. */
export const specifiers = (text: string): { spec: string; isExport: boolean }[] => {
  const code = stripComments(text);
  const found: { spec: string; isExport: boolean }[] = [];
  for (const match of code.matchAll(/\b(import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']/g)) {
    found.push({ spec: match[2] ?? "", isExport: match[1] === "export" });
  }
  for (const match of code.matchAll(/\bimport\s*["']([^"']+)["']/g)) {
    found.push({ spec: match[1] ?? "", isExport: false });
  }
  for (const match of code.matchAll(/\b(?:import|require)\(\s*["']([^"']+)["']\s*\)/g)) {
    found.push({ spec: match[1] ?? "", isExport: false });
  }
  return found;
};

const unquote = (value: string) => value.replace(/^["']|["']$/g, "");

/** The v1 symbols a file declares. */
export const declaredSymbols = (text: string, symbols: readonly string[]): string[] => {
  const code = stripComments(text);
  return symbols.filter((symbol) =>
    new RegExp(
      `\\b(?:type|interface|const|let|var|function\\*?|class|enum|namespace)\\s+${symbol}\\b`,
    ).test(code),
  );
};

/**
 * The v1 symbols a file exports or re-exports, under the name they leave with or the name they
 * came in with: `export { X as V1 }`, `export { V1 as Y } from`, `export type { … }`, `export * as V1`,
 * multi-line lists included. A local name that is not a v1 symbol, exported as one, counts.
 */
export const exportedSymbols = (text: string, symbols: readonly string[]): string[] => {
  const code = stripComments(text);
  const hits = new Set<string>();
  for (const match of code.matchAll(/\bexport\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const item of (match[1] ?? "").split(",")) {
      const words = item
        .replace(/^\s*type\s+(?=\S)/, "")
        .trim()
        .split(/\s+as\s+/)
        .map((word) => unquote(word.trim()));
      for (const word of words) if (symbols.includes(word)) hits.add(word);
    }
  }
  for (const match of code.matchAll(/\bexport\s+(?:type\s+)?\*\s+as\s+(["']?[\w$]+["']?)/g)) {
    const word = unquote(match[1] ?? "");
    if (symbols.includes(word)) hits.add(word);
  }
  return [...hits];
};

const bare = (target: string) => target.replace(MODULE_EXT, "");

export interface ScanResult {
  /** Files that import or re-export a deleted v1 module. */
  importHits: string[];
  /** Files that declare or export a v1 symbol. */
  symbolHits: string[];
  /** Re-exports from a path under `server/pack/` that is not allowed. */
  packReexportHits: string[];
}

/** Scans every source file under `src` (the `src/` of the app). */
export const scanTree = (src: string): ScanResult => {
  const root = resolve(src);
  const bannedModules = new Set(V1_FILES.map((file) => bare(join(root, file))));
  const packRoot = join(root, "server", "pack");
  const result: ScanResult = { importHits: [], symbolHits: [], packReexportHits: [] };
  for (const path of sourceFiles(root)) {
    const text = readFileSync(path, "utf8");
    const shown = relative(root, path);
    for (const { spec, isExport } of specifiers(text)) {
      const target = spec.startsWith(".") ? bare(resolve(dirname(path), spec)) : bare(spec);
      const v1Path = /(?:^|\/)(?:protocols\/pack|protocols\/story[Cc]ard|pack\/load)$/.test(target);
      if (bannedModules.has(target) || v1Path) result.importHits.push(`${shown} -> ${spec}`);
      if (
        isExport &&
        spec.startsWith(".") &&
        (target === packRoot || target.startsWith(packRoot + sep))
      ) {
        const first = relative(packRoot, target).split(sep)[0] ?? "";
        if (!ALLOWED_PACK_REEXPORTS.has(first)) result.packReexportHits.push(`${shown} -> ${spec}`);
      }
    }
    for (const symbol of new Set([
      ...declaredSymbols(text, V1_SYMBOLS),
      ...exportedSymbols(text, V1_SYMBOLS),
    ])) {
      result.symbolHits.push(`${shown}: ${symbol}`);
    }
  }
  return result;
};
