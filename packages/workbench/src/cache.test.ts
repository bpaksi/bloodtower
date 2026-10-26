import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { makeCached } from "./cache.ts";
import { dirStamp } from "./stamp.ts";

describe("makeCached (#126)", () => {
  it("builds once while the stamp is unchanged, and again when it changes", () => {
    let stamp = "a";
    let builds = 0;
    const get = makeCached(
      () => stamp,
      () => ++builds,
    );
    expect(get()).toBe(1);
    expect(get()).toBe(1);
    expect(builds).toBe(1);
    stamp = "b";
    expect(get()).toBe(2);
    expect(get()).toBe(2);
  });
});

describe("dirStamp (#126)", () => {
  it("is stable when nothing changed and differs after an edit or a new file", () => {
    const root = mkdtempSync(path.join(tmpdir(), "stamp-"));
    const cards = path.join(root, "cards");
    mkdirSync(cards);
    const file = path.join(cards, "A-1.md");
    writeFileSync(file, "one");
    utimesSync(file, 1000, 1000);
    const before = dirStamp([root, cards]);
    expect(dirStamp([root, cards])).toBe(before);
    expect(before).not.toBe("");
    utimesSync(file, 2000, 2000);
    const edited = dirStamp([root, cards]);
    expect(edited).not.toBe(before);
    writeFileSync(path.join(root, "doc.md"), "x");
    expect(dirStamp([root, cards])).not.toBe(edited);
  });
});

describe("dirStamp nested cards (#143)", () => {
  it("sees a cards/ edit when only the design root is stamped (no second walk)", () => {
    const root = mkdtempSync(path.join(tmpdir(), "stamp-nested-"));
    const cards = path.join(root, "cards");
    mkdirSync(cards);
    const file = path.join(cards, "A-1.md");
    writeFileSync(file, "one");
    utimesSync(file, 1000, 1000);
    const before = dirStamp([root]);
    expect(dirStamp([root])).toBe(before);
    utimesSync(file, 2000, 2000);
    expect(dirStamp([root])).not.toBe(before);
  });
});
