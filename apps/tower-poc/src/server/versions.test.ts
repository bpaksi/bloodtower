import { LIBRARY_BASELINE } from "tower-poc-protocols";
import { describe, expect, it } from "vitest";
import packageJson from "./package.json" with { type: "json" };
import { installedVersion } from "./versions.ts";

describe("installedVersion", () => {
  it("reads the installed library and data versions from their manifests", () => {
    expect(installedVersion("ultimatedarktower")).toBe(LIBRARY_BASELINE.version);
    expect(installedVersion("ultimatedarktowerdata")).toBe(
      packageJson.dependencies.ultimatedarktowerdata,
    );
  });

  it("throws for a package that is not installed", () => {
    expect(() => installedVersion("no-such-package-here")).toThrow();
  });
});
