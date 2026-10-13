import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderCapabilitiesDoc } from "./capabilitiesDoc.ts";
import { dataVersion, docPath } from "./capabilitiesDocPaths.ts";
import { exclusions, inventory } from "./inventory.ts";

describe("capabilities document", () => {
  it("is what the inventory generates (run `pnpm inventory:doc` in apps/tower-poc if not)", () => {
    expect(readFileSync(docPath, "utf8")).toBe(renderCapabilitiesDoc(dataVersion()));
  });

  it("is the same every time", () => {
    expect(renderCapabilitiesDoc("1.0.0")).toBe(renderCapabilitiesDoc("1.0.0"));
  });

  it("has a row for every entry and every exclusion, and imports no tower library", () => {
    const text = renderCapabilitiesDoc("1.0.0");
    for (const entry of inventory) expect(text).toContain(`\`${entry.id}\``);
    for (const exclusion of exclusions) expect(text).toContain(`\`${exclusion.member}\``);
    expect(text).toContain("GENERATED FILE");
    expect(text).toMatch(/Library: ultimatedarktower 7\.1\.2/);
  });
});
