import { describe, expect, it } from "vitest";
import type { FindHit } from "./find.ts";
import {
  applyFindEscape,
  applyOpenPlan,
  findEscape,
  resolveEnter,
  resolveOpen,
} from "./findEnter.ts";

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
  it("scrolls again when the picked hit has the hash already in the address", () => {
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
  it("closes the list, leaves the box, and keeps the key from the overlay", () => {
    expect(findEscape()).toEqual({ closeList: true, blur: true, preventDefault: true });
  });
});

describe("applyOpenPlan (#143 / #125)", () => {
  const track = () => {
    const calls: string[] = [];
    return {
      calls,
      actions: {
        dispatchHashChange: () => calls.push("hashchange"),
        setHash: (hash: string) => calls.push(`hash:${hash}`),
        openDetail: () => calls.push("openDetail"),
        navigate: (href: string) => calls.push(`nav:${href}`),
      },
    };
  };

  it("re-dispatches hashchange when re-picking the same document hash", () => {
    const { calls, actions } = track();
    applyOpenPlan({ kind: "jump", hash: "L7", rescroll: true }, "/doc/reqs#L7", actions);
    expect(calls).toEqual(["hashchange"]);
  });

  it("sets the hash when jumping to a different line on the same page", () => {
    const { calls, actions } = track();
    applyOpenPlan({ kind: "jump", hash: "L7", rescroll: false }, "/doc/reqs#L7", actions);
    expect(calls).toEqual(["hash:L7"]);
  });

  it("opens the detail overlay and navigates for a card focus hit", () => {
    const { calls, actions } = track();
    applyOpenPlan({ kind: "navigate", openDetail: true }, "/?focus=MEC-1", actions);
    expect(calls).toEqual(["openDetail", "nav:/?focus=MEC-1"]);
  });

  it("navigates without opening detail for a document hit from another page", () => {
    const { calls, actions } = track();
    applyOpenPlan({ kind: "navigate", openDetail: false }, "/doc/reqs#L7", actions);
    expect(calls).toEqual(["nav:/doc/reqs#L7"]);
  });
});

describe("applyFindEscape (#143 / #130)", () => {
  it("closes the list, preventDefaults, and blurs so the overlay Esc handler stays out", () => {
    const calls: string[] = [];
    applyFindEscape(findEscape(), {
      closeList: () => calls.push("closeList"),
      preventDefault: () => calls.push("preventDefault"),
      blur: () => calls.push("blur"),
    });
    expect(calls).toEqual(["closeList", "preventDefault", "blur"]);
  });
});
