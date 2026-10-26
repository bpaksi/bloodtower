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

describe("resolveEnter: edge cases", () => {
  const hits = [hit("A"), hit("B")];

  it("opens the first hit at index 0 and the last at the end", () => {
    expect(resolveEnter("a", "a", hits, 0)).toEqual({ kind: "open", hit: hits[0] });
    expect(resolveEnter("a", "a", hits, 1)).toEqual({ kind: "open", hit: hits[1] });
  });

  it("does nothing when the active index is past the end or negative", () => {
    expect(resolveEnter("a", "a", hits, 2)).toEqual({ kind: "none" });
    expect(resolveEnter("a", "a", hits, -1)).toEqual({ kind: "none" });
  });

  it("compares the text exactly: case and spaces count", () => {
    expect(resolveEnter("MEC-1", "mec-1", hits, 0)).toEqual({ kind: "fetch" });
    expect(resolveEnter("mec-1 ", "mec-1", hits, 0)).toEqual({ kind: "fetch" });
  });

  it("fetches for a text of spaces, since only the empty string is empty", () => {
    expect(resolveEnter(" ", null, [], 0)).toEqual({ kind: "fetch" });
  });

  it("fetches when the hits belong to the empty query", () => {
    expect(resolveEnter("a", "", hits, 0)).toEqual({ kind: "fetch" });
  });

  it("does nothing for an empty box even when stale hits are on screen", () => {
    expect(resolveEnter("", "", hits, 0)).toEqual({ kind: "none" });
    expect(resolveEnter("", "a", hits, 0)).toEqual({ kind: "none" });
  });
});

describe("resolveOpen: edge cases", () => {
  it("navigates when the path matches but the href has no hash", () => {
    expect(resolveOpen("/doc/reqs", "/doc/reqs", "#L7")).toEqual({
      kind: "navigate",
      openDetail: false,
    });
  });

  it("navigates when the hash is empty", () => {
    expect(resolveOpen("/doc/reqs#", "/doc/reqs", "")).toEqual({
      kind: "navigate",
      openDetail: false,
    });
  });

  it("does not rescroll when the address hash only starts with the same text", () => {
    expect(resolveOpen("/doc/reqs#L7", "/doc/reqs", "#L70")).toMatchObject({ rescroll: false });
  });

  it("accepts a current hash without its leading #", () => {
    expect(resolveOpen("/doc/reqs#L7", "/doc/reqs", "L7")).toMatchObject({ rescroll: true });
  });

  it("jumps with an empty current hash", () => {
    expect(resolveOpen("/doc/reqs#L7", "/doc/reqs", "")).toEqual({
      kind: "jump",
      hash: "L7",
      rescroll: false,
    });
  });

  it("does not jump to a hash on another document", () => {
    expect(resolveOpen("/doc/other#L7", "/doc/reqs", "#L7")).toEqual({
      kind: "navigate",
      openDetail: false,
    });
  });

  it("detects focus as a first or later query parameter, not as part of another name", () => {
    expect(resolveOpen("/?x=1&focus=A", "/", "")).toMatchObject({ openDetail: true });
    expect(resolveOpen("/?refocus=A", "/", "")).toMatchObject({ openDetail: false });
    expect(resolveOpen("/doc/x?focus=A", "/", "")).toMatchObject({ openDetail: true });
  });

  it("navigates, not jumps, for a card href whose pathname matches the page", () => {
    expect(resolveOpen("/?focus=MEC-1", "/", "#L1")).toEqual({
      kind: "navigate",
      openDetail: true,
    });
  });

  it("keeps only the first hash segment", () => {
    expect(resolveOpen("/doc/reqs#L1#L2", "/doc/reqs", "")).toMatchObject({ hash: "L1" });
  });
});

describe("findEscape / applyFindEscape: edge cases", () => {
  it("returns a fresh object each time", () => {
    expect(findEscape()).not.toBe(findEscape());
  });

  it("does only what the plan says", () => {
    const run = (act: Parameters<typeof applyFindEscape>[0]) => {
      const calls: string[] = [];
      applyFindEscape(act, {
        closeList: () => calls.push("closeList"),
        preventDefault: () => calls.push("preventDefault"),
        blur: () => calls.push("blur"),
      });
      return calls;
    };
    expect(run({ closeList: false, blur: false, preventDefault: false })).toEqual([]);
    expect(run({ closeList: true, blur: false, preventDefault: false })).toEqual(["closeList"]);
    expect(run({ closeList: false, blur: true, preventDefault: false })).toEqual(["blur"]);
    expect(run({ closeList: false, blur: false, preventDefault: true })).toEqual([
      "preventDefault",
    ]);
  });
});

describe("applyOpenPlan: edge cases", () => {
  it("never navigates for a jump, and never touches the hash for a navigation", () => {
    const calls: string[] = [];
    const actions = {
      dispatchHashChange: () => calls.push("hashchange"),
      setHash: (h: string) => calls.push(`hash:${h}`),
      openDetail: () => calls.push("openDetail"),
      navigate: (h: string) => calls.push(`nav:${h}`),
    };
    applyOpenPlan({ kind: "jump", hash: "L1", rescroll: false }, "/d#L1", actions);
    applyOpenPlan({ kind: "jump", hash: "L1", rescroll: true }, "/d#L1", actions);
    applyOpenPlan({ kind: "navigate", openDetail: false }, "/x", actions);
    expect(calls).toEqual(["hash:L1", "hashchange", "nav:/x"]);
  });

  it("opens the detail before it navigates, so the panel is ready on arrival", () => {
    const calls: string[] = [];
    applyOpenPlan({ kind: "navigate", openDetail: true }, "/?focus=A", {
      dispatchHashChange: () => calls.push("hashchange"),
      setHash: () => calls.push("hash"),
      openDetail: () => calls.push("openDetail"),
      navigate: () => calls.push("nav"),
    });
    expect(calls.indexOf("openDetail")).toBeLessThan(calls.indexOf("nav"));
  });

  it("composes with resolveOpen for a same-hash re-pick", () => {
    const calls: string[] = [];
    const href = "/doc/reqs#L7";
    applyOpenPlan(resolveOpen(href, "/doc/reqs", "#L7"), href, {
      dispatchHashChange: () => calls.push("hashchange"),
      setHash: () => calls.push("hash"),
      openDetail: () => calls.push("openDetail"),
      navigate: () => calls.push("nav"),
    });
    expect(calls).toEqual(["hashchange"]);
  });
});
