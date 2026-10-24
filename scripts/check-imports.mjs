// Fails when code in one app imports from another app's folder, or when a shared package imports
// from an app. Shared code goes through packages/ (docs/sdlc.md). Part of `pnpm check`.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SKIP = new Set([
  "node_modules",
  ".git",
  ".next",
  "out",
  "dist",
  "coverage",
  "test-results",
  "playwright-report",
]);
const SOURCE = /\.[cm]?[jt]sx?$/;
// `from "x"`, `import "x"`, `import("x")` and `require("x")`.
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(["'])([^"'\n]+)\1/g;

const walk = (dir, wanted) =>
  !existsSync(dir)
    ? []
    : readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return SKIP.has(entry.name) ? [] : walk(path, wanted);
        return wanted(entry.name) ? [path] : [];
      });

/** The app a path belongs to (`apps/<app>/…`), or undefined outside apps/. */
const appOf = (root, path) => {
  const [top, app] = relative(root, path).split(sep);
  return top === "apps" && app ? app : undefined;
};

const packageName = (specifier) =>
  specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];

const SQLITE_PACKAGE = /^(?:better-sqlite3|drizzle-orm|@libsql\/client|sql\.js|sqlite3)(?:\/|$)/;

/** Engine must stay pure: no I/O stack, clock, or ambient randomness (C1 step 3). */
export const checkEngineConstraints = (root) => {
  const engineDir = join(root, "apps/bloodtower/src/engine");
  if (!existsSync(engineDir)) return [];

  const errors = [];
  const bannedGlobal = /\b(Math\.random|new\s+Date\s*\(|\bcrypto\.)/;

  for (const file of walk(engineDir, (name) => SOURCE.test(name))) {
    const rel = relative(root, file);
    const text = readFileSync(file, "utf8");
    for (const [, , specifier] of text.matchAll(IMPORT)) {
      if (specifier.startsWith(".")) continue;
      const pkg = packageName(specifier);
      if (specifier.startsWith("node:")) {
        errors.push(`${rel}: engine must not import "${specifier}".`);
        continue;
      }
      if (pkg === "ws" || pkg === "react" || pkg === "react-dom") {
        errors.push(`${rel}: engine must not import "${specifier}".`);
        continue;
      }
      if (SQLITE_PACKAGE.test(pkg) || SQLITE_PACKAGE.test(specifier)) {
        errors.push(`${rel}: engine must not import "${specifier}".`);
      }
    }
    if (bannedGlobal.test(text)) {
      errors.push(`${rel}: engine must not use Math.random, Date, or crypto.`);
    }
  }
  return errors;
};

const D38_BANNED = [/\bhunter\b/i, /\bset[- ]piece\b/i, /\bsetpiece\b/i, /\bhunters\b/i];

/** D38: old glossary names must not appear in engine, protocol v2, or packs/. */
export const checkD38Names = (root) => {
  const targets = [
    join(root, "apps/bloodtower/src/engine"),
    join(root, "apps/bloodtower/src/protocols/v2"),
    join(root, "apps/bloodtower/src/protocols/pack-v2"),
    join(root, "packs"),
  ];
  const errors = [];
  const textExtensions = /\.(ts|tsx|yaml|yml|json|md)$/i;
  for (const base of targets) {
    if (!existsSync(base)) continue;
    for (const file of walk(base, (name) => textExtensions.test(name))) {
      const rel = relative(root, file);
      if (rel.includes("node_modules")) continue;
      if (rel.startsWith("packs/dracula/")) continue;
      const text = readFileSync(file, "utf8");
      for (const pattern of D38_BANNED) {
        if (pattern.test(text)) {
          errors.push(`${rel}: banned old name (${pattern}) (D38).`);
          break;
        }
      }
    }
  }
  return errors;
};

/** Returns one message per violation. An empty list means there are none. */
export const checkImports = (root) => {
  const appsDir = join(root, "apps");
  // Which app owns each workspace package name.
  const owners = new Map(
    walk(appsDir, (name) => name === "package.json").map((file) => [
      JSON.parse(readFileSync(file, "utf8")).name,
      appOf(root, file),
    ]),
  );

  const errors = [];
  const files = [appsDir, join(root, "packages")].flatMap((dir) =>
    walk(dir, (name) => SOURCE.test(name)),
  );

  for (const file of files) {
    const from = appOf(root, file);
    const text = readFileSync(file, "utf8");
    for (const [, , specifier] of text.matchAll(IMPORT)) {
      const target = specifier.startsWith(".")
        ? appOf(root, resolve(dirname(file), specifier))
        : owners.get(packageName(specifier));
      if (target === undefined || target === from) continue;
      errors.push(
        from
          ? `${relative(root, file)}: imports "${specifier}" from another app (${target}).`
          : `${relative(root, file)}: a shared package imports "${specifier}" from an app (${target}).`,
      );
    }
  }
  return errors;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = [...checkImports(root), ...checkEngineConstraints(root), ...checkD38Names(root)];
  for (const error of errors) console.error(error);
  if (errors.length > 0) {
    console.error(
      "\nApps never import from another app. Move shared code to packages/ (docs/sdlc.md).",
    );
    process.exit(1);
  }
}
