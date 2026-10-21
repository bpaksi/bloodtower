import { describe, expect, it } from "vitest";
import type { FindHit } from "./find.ts";
import { resolveEnter } from "./findEnter.ts";

const hit = (id: string): FindHit =>
  ({ id, title: id, snippet: "", href: `/?focus=${id}` }) as FindHit;

describe("resolveEnter", () => {
  const hits = [hit("MEC-010"), hit("MEC-011")];
  it("opens the active hit when the hits are for the current text", () => {
    expect(resolveEnter("MEC-01", "MEC-01", hits, 1)).toEqual({ kind: "open", hit: hits[1] });
  });
  it("fetches instead of opening a hit from an earlier query", () => {
    expect(resolveEnter("MEC-012", "MEC-01", hits, 0)).toEqual({ kind: "fetch" });
  });
  it("fetches when text was pasted before any search ran", () => {
    expect(resolveEnter("MEC-012", null, [], 0)).toEqual({ kind: "fetch" });
  });
  it("does nothing on an empty box or no hits", () => {
    expect(resolveEnter("", null, [], 0)).toEqual({ kind: "none" });
    expect(resolveEnter("zzz", "zzz", [], 0)).toEqual({ kind: "none" });
  });
});
