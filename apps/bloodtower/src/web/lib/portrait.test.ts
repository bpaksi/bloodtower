import { describe, expect, it } from "vitest";
import { portraitInitial, portraitSrc, portraitUrl } from "./portrait";

describe("portraitUrl", () => {
  it("points at the pack asset route", () => {
    expect(portraitUrl("test", "por.alpha")).toBe("/packs/test/asset/por.alpha");
  });

  it("escapes ids so they cannot change the path", () => {
    expect(portraitUrl("a/b", "../x")).toBe("/packs/a%2Fb/asset/..%2Fx");
  });
});

describe("portraitSrc", () => {
  it("builds the url from the pack id and the hunter's portrait asset id", () => {
    expect(portraitSrc("test", "por.alpha")).toBe("/packs/test/asset/por.alpha");
  });

  it("is undefined, so the card shows its initial, without a pack id or a portrait", () => {
    expect(portraitSrc(undefined, "por.alpha")).toBeUndefined();
    expect(portraitSrc("test", undefined)).toBeUndefined();
    expect(portraitSrc("", "")).toBeUndefined();
  });
});

describe("portraitInitial", () => {
  it("is the upper-cased first letter", () => {
    expect(portraitInitial("alpha")).toBe("A");
    expect(portraitInitial("  Beta")).toBe("B");
  });

  it("keeps a whole character that is outside the basic plane", () => {
    expect(portraitInitial("😀 Smile")).toBe("😀");
  });

  it("falls back to a question mark for an empty name", () => {
    expect(portraitInitial("   ")).toBe("?");
  });
});
