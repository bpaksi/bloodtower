import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { plan, ROOT_CONFIG, readPackages, TOUCHED_ONLY } from "./pre-commit-check.mjs";

// A cut-down copy of the real workspace: two apps with parts, one single-package app, two shared packages.
const PACKAGES = [
  { name: "bloodtower", dir: "apps/bloodtower", deps: [] },
  { name: "bloodtower-assets", dir: "apps/bloodtower/src/assets", deps: [] },
  { name: "bloodtower-e2e", dir: "apps/bloodtower/src/e2e", deps: [] },
  { name: "bloodtower-engine", dir: "apps/bloodtower/src/engine", deps: ["@dark-tower/rng"] },
  { name: "bloodtower-protocols", dir: "apps/bloodtower/src/protocols", deps: [] },
  {
    name: "bloodtower-server",
    dir: "apps/bloodtower/src/server",
    deps: ["@dark-tower/tower", "bloodtower-engine", "bloodtower-protocols"],
  },
  { name: "bloodtower-web", dir: "apps/bloodtower/src/web", deps: ["bloodtower-protocols"] },
  { name: "game-workbench", dir: "apps/game-workbench", deps: [] },
  {
    name: "game-workbench-web",
    dir: "apps/game-workbench/src/web",
    deps: ["@dark-tower/workbench"],
  },
  { name: "sound-review-tool", dir: "apps/sound-review-tool", deps: ["@dark-tower/tower"] },
  { name: "tower-poc", dir: "apps/tower-poc", deps: [] },
  { name: "tower-poc-server", dir: "apps/tower-poc/src/server", deps: ["@dark-tower/tower"] },
  { name: "@dark-tower/rng", dir: "packages/rng", deps: [] },
  { name: "@dark-tower/tower", dir: "packages/tower", deps: [] },
  { name: "@dark-tower/workbench", dir: "packages/workbench", deps: [] },
];

const BLOODTOWER_FAST = [
  "bloodtower",
  "bloodtower-e2e",
  "bloodtower-engine",
  "bloodtower-protocols",
  "bloodtower-server",
  "bloodtower-web",
];

describe("pre-commit plan", () => {
  it("runs the full check for a root config file", () => {
    for (const path of ROOT_CONFIG) {
      const todo = plan([path, "apps/tower-poc/src/server/server.ts"], PACKAGES);
      assert.equal(todo.full, true, path);
      assert.match(todo.reason, new RegExp(path.replace(".", "\\.")));
    }
  });

  it("does not take an app's own package.json for a root config file", () => {
    const todo = plan(["apps/tower-poc/package.json"], PACKAGES);
    assert.equal(todo.full, false);
    assert.deepEqual(todo.packages, ["tower-poc", "tower-poc-server"]);
  });

  it("runs every part of the app a staged file is in, and no other app", () => {
    const todo = plan(["apps/bloodtower/src/engine/step.ts"], PACKAGES);
    assert.equal(todo.full, false);
    assert.deepEqual(todo.packages, BLOODTOWER_FAST);
    assert.equal(todo.packLint, true);
    assert.equal(todo.scriptTests, false);
    assert.equal(todo.hookTests, false);
  });

  it("leaves the slow suite out unless a staged file is inside it, and says so", () => {
    assert.ok(TOUCHED_ONLY.has("bloodtower-assets"));
    const engine = plan(["apps/bloodtower/src/engine/step.ts"], PACKAGES);
    assert.deepEqual(engine.skipped, ["bloodtower-assets"]);

    const assets = plan(["apps/bloodtower/src/assets/pack/cli.ts"], PACKAGES);
    assert.deepEqual(assets.packages, ["bloodtower-assets", ...BLOODTOWER_FAST].sort());
    assert.deepEqual(assets.skipped, []);
  });

  it("runs every Bloodtower part, the slow suite included, and the pack lint for a pack", () => {
    const todo = plan(["packs/dracula/cast.yaml"], PACKAGES);
    assert.deepEqual(todo.packages, ["bloodtower-assets", ...BLOODTOWER_FAST].sort());
    assert.deepEqual(todo.skipped, []);
    assert.equal(todo.packLint, true);
  });

  it("follows a shared package to every app that lists it", () => {
    const todo = plan(["packages/tower/src/index.ts"], PACKAGES);
    assert.deepEqual(todo.packages, [
      "@dark-tower/tower",
      ...BLOODTOWER_FAST,
      "sound-review-tool",
      "tower-poc",
      "tower-poc-server",
    ]);
    assert.deepEqual(todo.skipped, ["bloodtower-assets"]);
  });

  it("follows a dependency two steps: rng to the engine to the server", () => {
    const todo = plan(["packages/rng/src/rng.ts"], PACKAGES);
    assert.ok(todo.packages.includes("@dark-tower/rng"));
    assert.ok(todo.packages.includes("bloodtower-server"));
    assert.ok(!todo.packages.includes("tower-poc-server"));
  });

  it("runs one app only for a change in another app", () => {
    const todo = plan(["apps/game-workbench/src/web/lib/cards.ts"], PACKAGES);
    assert.deepEqual(todo.packages, ["game-workbench", "game-workbench-web"]);
    assert.equal(todo.packLint, false);
    assert.deepEqual(todo.skipped, []);
  });

  it("runs the script tests for scripts/ and the hook tests for .claude/hooks/", () => {
    const scripts = plan(["scripts/wt.mjs"], PACKAGES);
    assert.deepEqual([scripts.scriptTests, scripts.hookTests, scripts.packages], [true, false, []]);
    const hooks = plan([".claude/hooks/lib.mjs"], PACKAGES);
    assert.deepEqual([hooks.scriptTests, hooks.hookTests, hooks.packages], [false, true, []]);
  });

  it("selects no package for a file outside every package", () => {
    for (const path of [
      ".github/workflows/check.yml",
      "docs/art-direction/tokens.css",
      "apps/board-map-tool/src/app.ts",
    ]) {
      const todo = plan([path], PACKAGES);
      assert.deepEqual([todo.full, todo.packages, todo.packLint], [false, [], false], path);
    }
  });

  it("does not take a look-alike folder for packs/, scripts/ or an app", () => {
    assert.equal(plan(["packs2/x.yaml"], PACKAGES).packLint, false);
    assert.equal(plan(["scripts-old/x.mjs"], PACKAGES).scriptTests, false);
    assert.deepEqual(plan(["apps/bloodtower-tools/x.ts"], PACKAGES).packages, []);
  });

  it("ignores blank lines and repeated paths", () => {
    assert.deepEqual(plan(["", "  "], PACKAGES).packages, []);
    assert.deepEqual(
      plan(["apps/tower-poc/src/server/a.ts", "apps/tower-poc/src/server/a.ts", ""], PACKAGES)
        .packages,
      ["tower-poc", "tower-poc-server"],
    );
  });
});

describe("readPackages", () => {
  it("reads the packages list, expands one star per segment and honours an exclusion", () => {
    const root = mkdtempSync(join(tmpdir(), "pre-commit-"));
    try {
      const pkg = (dir, manifest) => {
        mkdirSync(join(root, dir), { recursive: true });
        writeFileSync(join(root, dir, "package.json"), JSON.stringify(manifest));
      };
      writeFileSync(
        join(root, "pnpm-workspace.yaml"),
        [
          "# a comment",
          "packages:",
          '  - "apps/*"',
          '  - "apps/*/src/*"',
          "  - packages/*",
          "  # skipped",
          '  - "!apps/solo"',
          "onlyBuiltDependencies:",
          "  - esbuild",
          "",
        ].join("\n"),
      );
      pkg("apps/game", { name: "game" });
      pkg("apps/game/src/web", {
        name: "game-web",
        dependencies: { "@x/lib": "workspace:*", react: "19.3.0" },
        devDependencies: { "game-protocols": "workspace:*" },
      });
      pkg("apps/game/src/protocols", { name: "game-protocols" });
      pkg("apps/solo", { name: "solo" });
      pkg("packages/lib", { name: "@x/lib" });
      mkdirSync(join(root, "apps/empty"), { recursive: true });
      mkdirSync(join(root, "esbuild"), { recursive: true });

      assert.deepEqual(readPackages(root), [
        { name: "game", dir: "apps/game", deps: [] },
        { name: "game-protocols", dir: "apps/game/src/protocols", deps: [] },
        { name: "game-web", dir: "apps/game/src/web", deps: ["@x/lib", "game-protocols"] },
        { name: "@x/lib", dir: "packages/lib", deps: [] },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("finds the real workspace's packages, each with a script the plan can run", () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const names = readPackages(root).map((pkg) => pkg.name);
    for (const name of [
      "bloodtower-engine",
      "bloodtower-server",
      "bloodtower-assets",
      "game-workbench-web",
      "@dark-tower/tower",
    ]) {
      assert.ok(names.includes(name), name);
    }
    assert.ok(!names.includes("board-map-tool"));
    for (const name of TOUCHED_ONLY) assert.ok(names.includes(name), name);
  });
});
