import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssetIdLabel } from "./AssetIdLabel.tsx";
import { CameraStill } from "./CameraStill.tsx";

const label = (assetId: string | null | undefined, flag: string | undefined) =>
  renderToStaticMarkup(createElement(AssetIdLabel, { assetId, flag }));

describe("AssetIdLabel (A1-07)", () => {
  it("shows the id in [data-asset-id-label] when the flag is exactly 1", () => {
    const markup = label("ts-keeper-001", "1");
    expect(markup).toContain("data-asset-id-label");
    expect(markup).toContain(">ts-keeper-001<");
  });

  it.each([
    ["unset", undefined],
    ["0", "0"],
    ["empty", ""],
    ["true", "true"],
  ])("renders nothing when the flag is %s", (_name, flag) => {
    expect(label("ts-keeper-001", flag)).toBe("");
  });

  it("renders nothing, never undefined or null, when there is no current id", () => {
    for (const id of [undefined, null, ""]) {
      const markup = label(id, "1");
      expect(markup).toBe("");
      expect(markup).not.toMatch(/undefined|null/u);
    }
  });

  it("replaces the label in the same render when the asset changes (A1-07b)", () => {
    const first = label("ts-keeper-001", "1");
    const second = label("ts-keeper-002", "1");
    expect(first).toContain("ts-keeper-001");
    expect(second).toContain("ts-keeper-002");
    expect(second).not.toContain("ts-keeper-001");
    expect(second.match(/data-asset-id-label/gu)).toHaveLength(1);
  });

  it("labels a CameraStill with its assetId, and nothing with the flag unset", () => {
    const still = () =>
      renderToStaticMarkup(
        createElement(CameraStill, { momentId: "m", assetId: "still-7", spokenText: "" }),
      );
    const prior = process.env.NEXT_PUBLIC_SHOW_ASSET_IDS;
    try {
      process.env.NEXT_PUBLIC_SHOW_ASSET_IDS = "1";
      expect(still()).toMatch(/data-asset-id-label=""[^>]*>still-7</u);
      delete process.env.NEXT_PUBLIC_SHOW_ASSET_IDS;
      expect(still()).not.toContain("data-asset-id-label");
    } finally {
      if (prior === undefined) delete process.env.NEXT_PUBLIC_SHOW_ASSET_IDS;
      else process.env.NEXT_PUBLIC_SHOW_ASSET_IDS = prior;
    }
  });

  it("is never rendered or imported by the device pages", () => {
    const dir = join(import.meta.dirname, "../device");
    for (const name of readdirSync(dir)) {
      if (!/\.(tsx?|css)$/u.test(name)) continue;
      const text = readFileSync(join(dir, name), "utf8");
      expect(text, name).not.toMatch(/AssetIdLabel|asset-id-label|SHOW_ASSET_IDS/u);
    }
  });
});
