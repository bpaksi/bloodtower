// The pre-commit check (lefthook.yml). It runs the part of `pnpm check` that the staged files
// can break, so a commit takes seconds instead of minutes. CI still runs the whole of
// `pnpm check` on every pull request outside the lite allowlist, and that is the gate.
//
// Every code commit runs Biome and the static repo checks (pins, cross-app imports, briefs).
// Then, from the staged paths:
//   - a root config file (ROOT_CONFIG)        the full `pnpm check`
//   - scripts/ or .claude/hooks/              that folder's own tests
//   - a file inside a workspace package       typecheck and tests for that package, the
//                                             packages that depend on it, and the rest of its app
//   - packs/                                  the pack lint and every Bloodtower part
//
// A package in TOUCHED_ONLY runs only when a staged file is inside it or (for Bloodtower) under
// packs/. Its app's other parts do not pull it in.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** A change to one of these can break any package, so the whole check runs. */
export const ROOT_CONFIG = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "biome.json",
  ".npmrc",
  ".nvmrc",
  "lefthook.yml",
]);

/**
 * Suites too slow for every commit. bloodtower-assets takes about 88 s, 63% of `pnpm check`
 * (measured 2026-11-11): pack.test.ts renders through the real asset-studio bin in each test.
 */
export const TOUCHED_ONLY = new Set(["bloodtower-assets"]);

const under = (path, dir) => path === dir || path.startsWith(`${dir}/`);

/** `apps/<app>` for a package inside an app, else null. */
const appOf = (dir) => {
  const [top, app] = dir.split("/");
  return top === "apps" && app ? `apps/${app}` : null;
};

/** The package whose folder holds `path`: the deepest match, so a part wins over its app. */
const ownerOf = (path, packages) =>
  packages.filter((pkg) => under(path, pkg.dir)).sort((a, b) => b.dir.length - a.dir.length)[0];

/**
 * `staged`: repo-relative paths. `packages`: `{ name, dir, deps }` for each workspace package,
 * `deps` being the workspace packages it lists. Returns what the commit has to run.
 */
export const plan = (staged, packages) => {
  const paths = [...new Set(staged.map((path) => path.trim()).filter(Boolean))];
  const rootConfig = paths.filter((path) => ROOT_CONFIG.has(path));
  if (rootConfig.length > 0) {
    return { full: true, reason: `${rootConfig.join(", ")} can affect every package` };
  }

  const touched = new Set();
  for (const path of paths) {
    const owner = ownerOf(path, packages);
    if (owner) touched.add(owner.name);
  }
  const packs = paths.some((path) => under(path, "packs"));

  // The touched packages, then every package that lists one of them, and so on.
  const selected = new Set(touched);
  for (let grew = true; grew; ) {
    grew = false;
    for (const pkg of packages) {
      if (!selected.has(pkg.name) && pkg.deps.some((dep) => selected.has(dep))) {
        selected.add(pkg.name);
        grew = true;
      }
    }
  }

  // Parts of one app import each other by relative path without listing it, so an app is one unit.
  const apps = new Set(
    packages.filter((pkg) => selected.has(pkg.name)).map((pkg) => appOf(pkg.dir)),
  );
  if (packs) apps.add("apps/bloodtower");
  apps.delete(null);
  for (const pkg of packages) {
    if (apps.has(appOf(pkg.dir))) selected.add(pkg.name);
  }

  const skipped = [];
  for (const name of TOUCHED_ONLY) {
    const pkg = packages.find((candidate) => candidate.name === name);
    const wanted = touched.has(name) || (packs && pkg && appOf(pkg.dir) === "apps/bloodtower");
    if (selected.has(name) && !wanted) {
      selected.delete(name);
      skipped.push(name);
    }
  }

  return {
    full: false,
    packages: [...selected].sort(),
    skipped: skipped.sort(),
    packLint: packs || selected.has("bloodtower-server"),
    scriptTests: paths.some((path) => under(path, "scripts")),
    hookTests: paths.some((path) => under(path, ".claude/hooks")),
  };
};

/** Workspace packages from pnpm-workspace.yaml's `packages:` list (one `*` per path segment). */
export const readPackages = (root) => {
  const lines = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8").split("\n");
  const patterns = [];
  let inList = false;
  for (const line of lines) {
    if (/^packages:\s*$/.test(line)) inList = true;
    else if (inList && /^\S/.test(line)) break;
    else if (inList) {
      const entry = line.match(/^\s*-\s*["']?([^"'#\s]+)["']?/);
      if (entry) patterns.push(entry[1]);
    }
  }

  const expand = (segments, base) => {
    if (segments.length === 0) return [base];
    const [head, ...rest] = segments;
    if (head !== "*") return expand(rest, base ? `${base}/${head}` : head);
    const dir = join(root, base);
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .flatMap((entry) => expand(rest, base ? `${base}/${entry.name}` : entry.name));
  };

  const excluded = patterns
    .filter((pattern) => pattern.startsWith("!"))
    .map((pattern) => pattern.slice(1));
  const dirs = new Set(
    patterns.filter((pattern) => !pattern.startsWith("!")).flatMap((p) => expand(p.split("/"), "")),
  );

  const found = [];
  for (const dir of dirs) {
    if (excluded.some((skip) => under(dir, skip))) continue;
    const file = join(root, dir, "package.json");
    if (!existsSync(file)) continue;
    const manifest = JSON.parse(readFileSync(file, "utf8"));
    const listed = { ...manifest.dependencies, ...manifest.devDependencies };
    found.push({
      name: manifest.name,
      dir,
      deps: Object.keys(listed).filter((dep) => String(listed[dep]).startsWith("workspace:")),
    });
  }
  return found.sort((a, b) => a.dir.localeCompare(b.dir));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const run = (label, command, args) => {
    console.log(`\npre-commit: ${label}`);
    const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
    if (result.error) {
      console.error(`pre-commit: could not run ${command}: ${result.error.message}`);
      process.exit(1);
    }
    if (result.status !== 0) {
      console.error(`pre-commit: ${label} failed (exit ${result.status ?? result.signal}).`);
      process.exit(result.status ?? 1);
    }
  };

  // Deletions count: removing a file can break the package it was in.
  const staged = execFileSync("git", ["diff", "--cached", "--name-only", "--no-renames"], {
    cwd: root,
    encoding: "utf8",
  }).split("\n");
  const todo = plan(staged, readPackages(root));

  if (todo.full) {
    run(`the full check, because ${todo.reason}`, "pnpm", ["check"]);
    process.exit(0);
  }

  run("Biome", "pnpm", ["exec", "biome", "check", "."]);
  run("pinned versions", "node", ["scripts/check-pins.mjs"]);
  run("cross-app imports", "node", ["scripts/check-imports.mjs"]);
  run("briefs", "node", ["scripts/check-briefs.mjs"]);
  if (todo.scriptTests) run("script tests", "node", ["--test", "scripts/*.test.mjs"]);
  if (todo.hookTests) run("hook tests", "node", ["--test", ".claude/hooks/*.test.mjs"]);

  if (todo.packages.length > 0) {
    const filters = todo.packages.flatMap((name) => ["--filter", name]);
    run(`typecheck: ${todo.packages.join(", ")}`, "pnpm", [
      ...filters,
      "--if-present",
      "typecheck",
    ]);
    run(`tests: ${todo.packages.join(", ")}`, "pnpm", [
      ...filters,
      "--workspace-concurrency=1",
      "--if-present",
      "test",
    ]);
  }
  if (todo.packLint) run("pack lint", "pnpm", ["pack:lint:all"]);

  if (todo.skipped.length > 0) {
    console.log(
      `\npre-commit: not run here, too slow for every commit: ${todo.skipped.join(", ")}. CI runs it.`,
    );
  }
  if (todo.packages.length === 0) {
    console.log("\npre-commit: no workspace package holds a staged file; CI runs `pnpm check`.");
  }
}
