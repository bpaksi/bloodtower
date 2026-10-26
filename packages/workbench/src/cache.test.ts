import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
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

describe("makeCached: edge cases", () => {
  it("does not stamp or build until first called", () => {
    let stamps = 0;
    let builds = 0;
    makeCached(
      () => `${++stamps}`,
      () => ++builds,
    );
    expect([stamps, builds]).toEqual([0, 0]);
  });

  it("stamps on every call but builds only when the stamp differs", () => {
    let stamps = 0;
    let builds = 0;
    const get = makeCached(
      () => {
        stamps++;
        return "same";
      },
      () => ++builds,
    );
    get();
    get();
    get();
    expect([stamps, builds]).toEqual([3, 1]);
  });

  it("builds on the first call even when the stamp is the empty string", () => {
    let builds = 0;
    const get = makeCached(
      () => "",
      () => ++builds,
    );
    expect(get()).toBe(1);
    expect(get()).toBe(1);
  });

  it("builds again when the stamp goes back to an earlier value", () => {
    let stamp = "a";
    let builds = 0;
    const get = makeCached(
      () => stamp,
      () => ++builds,
    );
    get();
    stamp = "b";
    get();
    stamp = "a";
    expect(get()).toBe(3);
  });

  it("returns the same object while the stamp is unchanged", () => {
    const get = makeCached(
      () => "k",
      () => ({}),
    );
    expect(get()).toBe(get());
  });

  it("caches a falsy built value", () => {
    let builds = 0;
    const get = makeCached(
      () => "k",
      () => {
        builds++;
        return 0;
      },
    );
    expect(get()).toBe(0);
    expect(get()).toBe(0);
    expect(builds).toBe(1);
  });

  it("lets a failed build throw, and tries again on the next call", () => {
    let fail = true;
    let builds = 0;
    const get = makeCached(
      () => "k",
      () => {
        builds++;
        if (fail) throw new Error("boom");
        return "ok";
      },
    );
    expect(() => get()).toThrow("boom");
    fail = false;
    expect(get()).toBe("ok");
    expect(builds).toBe(2);
  });

  it("keeps the old value when the stamp throws, and does not build", () => {
    let broken = false;
    let builds = 0;
    const get = makeCached(
      () => {
        if (broken) throw new Error("stamp failed");
        return "k";
      },
      () => ++builds,
    );
    get();
    broken = true;
    expect(() => get()).toThrow("stamp failed");
    expect(builds).toBe(1);
  });

  it("keeps separate caches apart", () => {
    let n = 0;
    const a = makeCached(
      () => "k",
      () => ++n,
    );
    const b = makeCached(
      () => "k",
      () => ++n,
    );
    expect([a(), b(), a(), b()]).toEqual([1, 2, 1, 2]);
  });
});

describe("makeCached with dirStamp: edge cases", () => {
  it("rebuilds after a file is removed and after a folder goes missing", () => {
    const root = mkdtempSync(path.join(tmpdir(), "cache-rm-"));
    const file = path.join(root, "A-1.md");
    writeFileSync(file, "one");
    let builds = 0;
    const get = makeCached(
      () => dirStamp([root]),
      () => ++builds,
    );
    get();
    get();
    expect(builds).toBe(1);
    rmSync(file);
    get();
    expect(builds).toBe(2);
    rmSync(root, { recursive: true });
    get();
    expect(builds).toBe(3);
  });

  it("does not rebuild for a hidden file or a node_modules folder", () => {
    const root = mkdtempSync(path.join(tmpdir(), "cache-hidden-"));
    writeFileSync(path.join(root, "A-1.md"), "one");
    let builds = 0;
    const get = makeCached(
      () => dirStamp([root]),
      () => ++builds,
    );
    get();
    writeFileSync(path.join(root, ".DS_Store"), "x");
    mkdirSync(path.join(root, "node_modules"));
    writeFileSync(path.join(root, "node_modules", "x.js"), "x");
    get();
    expect(builds).toBe(1);
    rmSync(root, { recursive: true });
  });

  it("rebuilds when a file changes size but keeps its mtime", () => {
    const root = mkdtempSync(path.join(tmpdir(), "cache-size-"));
    const file = path.join(root, "A-1.md");
    writeFileSync(file, "one");
    utimesSync(file, 1000, 1000);
    let builds = 0;
    const get = makeCached(
      () => dirStamp([root]),
      () => ++builds,
    );
    get();
    writeFileSync(file, "three");
    utimesSync(file, 1000, 1000);
    get();
    expect(builds).toBe(2);
    rmSync(root, { recursive: true });
  });
});
