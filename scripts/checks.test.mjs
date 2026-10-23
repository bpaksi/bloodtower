import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { checkEngineConstraints, checkImports } from "./check-imports.mjs";
import { checkPins } from "./check-pins.mjs";

let root;
const write = (path, text) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
};
const manifest = (fields) => JSON.stringify({ name: "x", ...fields });

before(() => {
  root = mkdtempSync(join(tmpdir(), "dark-tower-checks-"));
});
after(() => rmSync(root, { recursive: true, force: true }));

describe("checkPins", () => {
  const pins = { ultimatedarktower: "7.1.2" };
  const fresh = (name) => {
    root = mkdtempSync(join(tmpdir(), `dark-tower-${name}-`));
  };

  it("passes when the pin is exact, or the dependency is absent", () => {
    fresh("pins-ok");
    write("package.json", manifest({ devDependencies: { typescript: "6.0.3" } }));
    write(
      "apps/a/src/server/package.json",
      manifest({ dependencies: { ultimatedarktower: "7.1.2" } }),
    );
    write(
      "pnpm-lock.yaml",
      "importers:\n  apps/a/src/server:\n    dependencies:\n      ultimatedarktower:\n        specifier: 7.1.2\n        version: 7.1.2\n",
    );
    assert.deepEqual(checkPins(root, pins), []);
  });

  it("fails on another version, a range, or an override", () => {
    fresh("pins-bad");
    write("apps/a/package.json", manifest({ dependencies: { ultimatedarktower: "8.0.0" } }));
    write("apps/b/package.json", manifest({ devDependencies: { ultimatedarktower: "^7.1.2" } }));
    write("package.json", manifest({ pnpm: { overrides: { ultimatedarktower: "7.1.3" } } }));
    const errors = checkPins(root, pins);
    assert.equal(errors.length, 3);
    assert.match(
      errors.join("\n"),
      /apps\/a\/package\.json: dependencies\.ultimatedarktower is "8\.0\.0"/,
    );
  });

  it("fails when the lockfile resolves another version", () => {
    fresh("pins-lock");
    write("package.json", manifest({ dependencies: { ultimatedarktower: "7.1.2" } }));
    write(
      "pnpm-lock.yaml",
      "importers:\n  .:\n    dependencies:\n      ultimatedarktower:\n        specifier: 7.1.2\n        version: 7.2.0(zod@4.6.7)\n",
    );
    assert.deepEqual(checkPins(root, pins), [
      'pnpm-lock.yaml:4: ultimatedarktower version is "7.2.0", but it is pinned to "7.1.2".',
    ]);
  });

  it("fails when another package brings in a second version", () => {
    fresh("pins-transitive");
    write("package.json", manifest({ dependencies: { ultimatedarktower: "7.1.2" } }));
    write(
      "pnpm-lock.yaml",
      [
        "importers:",
        "  .:",
        "    dependencies:",
        "      ultimatedarktower:",
        "        specifier: 7.1.2",
        "        version: 7.1.2",
        "packages:",
        "  ultimatedarktower@7.1.2:",
        "    resolution: {integrity: sha512-a}",
        "  ultimatedarktower@7.3.0:",
        "    resolution: {integrity: sha512-b}",
        "  ultimatedarktowerdata@1.0.0:",
        "    resolution: {integrity: sha512-c}",
        "    peerDependencies:",
        "      ultimatedarktower: ^7.0.0",
        "snapshots:",
        "  ultimatedarktower@7.1.2: {}",
        "  ultimatedarktower@7.3.0(zod@4.6.7): {}",
        "  ultimatedarktowerdata@1.0.0:",
        "    dependencies:",
        "      ultimatedarktower: 7.3.0(zod@4.6.7)",
        "",
      ].join("\n"),
    );
    assert.deepEqual(checkPins(root, pins), [
      'pnpm-lock.yaml:10: ultimatedarktower 7.3.0 is installed, but it is pinned to "7.1.2".',
      'pnpm-lock.yaml:18: ultimatedarktower 7.3.0 is installed, but it is pinned to "7.1.2".',
      'pnpm-lock.yaml:21: ultimatedarktower 7.3.0 is installed, but it is pinned to "7.1.2".',
    ]);
  });

  it("does not confuse a package whose name starts the same way", () => {
    fresh("pins-data");
    write("package.json", manifest({ dependencies: { ultimatedarktowerdata: "1.0.0" } }));
    assert.deepEqual(checkPins(root, pins), []);
  });

  it("ignores node_modules", () => {
    fresh("pins-nm");
    write(
      "node_modules/x/package.json",
      manifest({ dependencies: { ultimatedarktower: "1.0.0" } }),
    );
    assert.deepEqual(checkPins(root, pins), []);
  });
});

describe("checkImports", () => {
  before(() => {
    root = mkdtempSync(join(tmpdir(), "dark-tower-imports-"));
    write("apps/one/src/protocols/package.json", manifest({ name: "one-protocols" }));
    write("apps/one/src/protocols/index.ts", "export const a = 1;\n");
    write("apps/one/src/server/package.json", manifest({ name: "one-server" }));
    write("apps/two/package.json", manifest({ name: "two" }));
    write("packages/shared/package.json", manifest({ name: "@dark-tower/shared" }));
    write("packages/shared/index.ts", "export const s = 1;\n");
  });

  const errorsFor = (path, text) => {
    write(path, text);
    const errors = checkImports(root);
    rmSync(join(root, path));
    return errors;
  };

  it("allows imports inside one app, from packages/, and from npm", () => {
    const errors = errorsFor(
      "apps/one/src/server/ok.ts",
      [
        'import { a } from "one-protocols";',
        'import { a as b } from "../protocols/index.ts";',
        'import { s } from "@dark-tower/shared";',
        'import { z } from "zod";',
        'import "./local.ts";',
      ].join("\n"),
    );
    assert.deepEqual(errors, []);
  });

  it("fails on a relative import into another app", () => {
    const errors = errorsFor(
      "apps/two/bad.ts",
      'import { a } from "../one/src/protocols/index.ts";\n',
    );
    assert.deepEqual(errors, [
      'apps/two/bad.ts: imports "../one/src/protocols/index.ts" from another app (one).',
    ]);
  });

  it("fails on another app's package name, in every import form", () => {
    const errors = errorsFor(
      "apps/two/bad.ts",
      [
        'import { a } from "one-protocols";',
        'export { a } from "one-protocols/sub";',
        'const m = await import("one-server");',
        'const r = require("one-protocols");',
      ].join("\n"),
    );
    assert.equal(errors.length, 4);
  });

  it("fails when a shared package imports from an app", () => {
    const errors = errorsFor("packages/shared/bad.ts", 'import { a } from "one-protocols";\n');
    assert.deepEqual(errors, [
      'packages/shared/bad.ts: a shared package imports "one-protocols" from an app (one).',
    ]);
  });
});

describe("checkEngineConstraints", () => {
  before(() => {
    root = mkdtempSync(join(tmpdir(), "dark-tower-engine-"));
  });

  const engineErrors = (path, text) => {
    write(path, text);
    const errors = checkEngineConstraints(root);
    rmSync(join(root, path), { force: true });
    rmSync(join(root, dirname(path)), { recursive: true, force: true });
    return errors;
  };

  it("passes for a normal engine file", () => {
    const errors = engineErrors(
      "apps/bloodtower/src/engine/ok.ts",
      'import { z } from "zod";\nimport { eventRng } from "@dark-tower/rng";\n',
    );
    assert.deepEqual(errors, []);
  });

  it("fails on banned imports and globals", () => {
    const errors = engineErrors(
      "apps/bloodtower/src/engine/bad.ts",
      [
        'import ws from "ws";',
        'import { readFileSync } from "node:fs";',
        "const x = Math.random();",
      ].join("\n"),
    );
    assert.ok(errors.length >= 3);
    assert.match(errors.join("\n"), /node:fs/);
    assert.match(errors.join("\n"), /Math\.random/);
  });
});
