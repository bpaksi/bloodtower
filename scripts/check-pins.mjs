// Fails when a pinned dependency (scripts/pinned-versions.json) has any other version in a
// package.json or in pnpm-lock.yaml. Part of `pnpm check`, so it gates every commit.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKIP = new Set(["node_modules", ".git", ".next", "out", "dist", "coverage", "test-results"]);
const FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];

const packageFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return SKIP.has(entry.name) ? [] : packageFiles(join(dir, entry.name));
    return entry.name === "package.json" ? [join(dir, entry.name)] : [];
  });

/** Returns one message per violation. An empty list means every pin holds. */
export const checkPins = (root, pins) => {
  const errors = [];

  for (const file of packageFiles(root)) {
    const manifest = JSON.parse(readFileSync(file, "utf8"));
    const fields = [
      ...FIELDS.map((field) => [field, manifest[field]]),
      ["pnpm.overrides", manifest.pnpm?.overrides],
      ["resolutions", manifest.resolutions],
    ];
    for (const [field, entries] of fields) {
      for (const [name, pinned] of Object.entries(pins)) {
        const found = entries?.[name];
        if (found !== undefined && found !== pinned) {
          errors.push(
            `${relative(root, file)}: ${field}.${name} is "${found}", but it is pinned to "${pinned}".`,
          );
        }
      }
    }
  }

  const lockFile = join(root, "pnpm-lock.yaml");
  if (existsSync(lockFile)) {
    const lines = readFileSync(lockFile, "utf8").split("\n");
    for (const [name, pinned] of Object.entries(pins)) {
      lines.forEach((line, i) => {
        // An importer entry: the dependency name, then its `specifier:` and `version:` lines.
        if (line.trim() !== `${name}:` && line.trim() !== `'${name}':`) return;
        for (const next of lines.slice(i + 1, i + 3)) {
          const match = next.match(/^\s+(specifier|version):\s*'?([^'(\s]+)/);
          if (match && match[2] !== pinned) {
            errors.push(
              `pnpm-lock.yaml:${i + 1}: ${name} ${match[1]} is "${match[2]}", but it is pinned to "${pinned}".`,
            );
          }
        }
      });
    }
  }

  return errors;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const here = dirname(fileURLToPath(import.meta.url));
  const pins = JSON.parse(readFileSync(join(here, "pinned-versions.json"), "utf8"));
  const errors = checkPins(resolve(here, ".."), pins);
  for (const error of errors) console.error(error);
  if (errors.length > 0) {
    console.error("\nPinned versions change only through a new intent from Bob (docs/sdlc.md).");
    process.exit(1);
  }
}
