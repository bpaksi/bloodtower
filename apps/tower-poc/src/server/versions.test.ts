import { LIBRARY_BASELINE } from "@dark-tower/tower";
import { describe, expect, it } from "vitest";
import { installedVersion } from "./versions.ts";

describe("installedVersion", () => {
  it("reads the installed library and data versions from their manifests", () => {
    expect(installedVersion("ultimatedarktower")).toBe(LIBRARY_BASELINE.version);
    // Resolved via `@dark-tower/tower`, which pins ultimatedarktowerdata.
    expect(installedVersion("ultimatedarktowerdata")).toBe("3.0.0");
  });

  it("throws for a package that is not installed", () => {
    expect(() => installedVersion("no-such-package-here")).toThrow();
  });
});
