import { describe, expect, it } from "vitest";
import type { FindHit } from "./find.ts";
import { findEscape, resolveEnter, resolveOpen } from "./findEnter.ts";

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

describe("resolveOpen (#125)", () => {
  it.fails("scrolls again when the picked hit has the hash already in the address", () => {
    expect(resolveOpen("/doc/reqs#L7", "/doc/reqs", "#L7")).toEqual({
      kind: "jump",
      hash: "L7",
      rescroll: true,
    });
  });
  it("jumps by hash on the same page, and navigates elsewhere", () => {
    expect(resolveOpen("/doc/reqs#L7", "/doc/reqs", "#L3")).toEqual({
      kind: "jump",
      hash: "L7",
      rescroll: false,
    });
    expect(resolveOpen("/doc/reqs#L7", "/", "")).toEqual({ kind: "navigate", openDetail: false });
    expect(resolveOpen("/?focus=MEC-1", "/", "")).toEqual({ kind: "navigate", openDetail: true });
  });
});

describe("findEscape (#130)", () => {
  it.fails("closes the list, leaves the box, and keeps the key from the overlay", () => {
    expect(findEscape()).toEqual({ closeList: true, blur: true, preventDefault: true });
  });
});
