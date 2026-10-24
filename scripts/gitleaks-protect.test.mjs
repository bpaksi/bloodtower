import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { GITLEAKS_VERSION, releaseAsset } from "./gitleaks-protect.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("gitleaks pin", () => {
  it("CI pins the same version as the pre-commit hook", () => {
    const workflow = readFileSync(join(root, ".github/workflows/check.yml"), "utf8");
    assert.match(workflow, new RegExp(`GITLEAKS_VERSION:\\s*"${GITLEAKS_VERSION}"`));
    assert.match(workflow, /gitleaks\/gitleaks-action@e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e/);
    assert.doesNotMatch(workflow, /^\s*schedule:/m);
    assert.doesNotMatch(workflow, /workflow_dispatch:/);
  });

  it("lefthook runs the protect script on every pre-commit", () => {
    const hook = readFileSync(join(root, "lefthook.yml"), "utf8");
    assert.match(hook, /gitleaks:[\s\S]*run: node scripts\/gitleaks-protect\.mjs/);
  });

  it("keeps the default rules and allowlists only the RFC sample nonce", () => {
    const config = readFileSync(join(root, ".gitleaks.toml"), "utf8");
    assert.match(config, /useDefault\s*=\s*true/);
    assert.match(config, /dGhlIHNhbXBsZSBub25jZQ==/);
  });

  it("pins archives for macOS and Linux", () => {
    for (const osName of ["darwin", "linux"]) {
      for (const cpu of ["arm64", "x64"]) {
        const asset = releaseAsset(osName, cpu);
        assert.ok(asset);
        assert.equal(asset.file, `gitleaks_${GITLEAKS_VERSION}_${osName}_${cpu}.tar.gz`);
        assert.match(asset.sha256, /^[a-f0-9]{64}$/);
      }
    }
  });
});
