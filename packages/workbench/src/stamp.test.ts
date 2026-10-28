import { mkdirSync, mkdtempSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dirStamp } from "./stamp.ts";

describe("dirStamp", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "wb-stamp-"));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const put = (rel: string, content = "x") => {
    const file = path.join(root, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
    return file;
  };
  const lines = (stamp: string) => (stamp === "" ? [] : stamp.split("\n"));

  it("is empty for an empty list of folders and for an empty folder", () => {
    expect(dirStamp([])).toBe("");
    expect(dirStamp([root])).toBe("");
  });

  it("marks a missing folder instead of throwing", () => {
    const gone = path.join(root, "nope");
    expect(dirStamp([gone])).toBe(`${gone}:missing`);
  });

  it("lists each file with its mtime and size", () => {
    const file = put("a.md", "hello");
    const st = statSync(file);
    expect(dirStamp([root])).toBe(`${file}:${st.mtimeMs}:5`);
  });

  it("walks nested folders", () => {
    const deep = put("one/two/three.md", "abc");
    const top = put("top.md");
    const got = lines(dirStamp([root]));
    expect(got).toHaveLength(2);
    expect(got.some((l) => l.startsWith(`${deep}:`))).toBe(true);
    expect(got.some((l) => l.startsWith(`${top}:`))).toBe(true);
  });

  it("skips dot-names and node_modules, files and folders alike", () => {
    const kept = put("keep.md");
    put(".hidden.md");
    put(".git/config");
    put("node_modules/pkg/index.js");
    put("sub/.secret");
    put("sub/node_modules/x.js");
    expect(lines(dirStamp([root])).map((l) => l.split(":")[0])).toEqual([kept]);
  });

  it("sorts entries by name, whatever order they were created in", () => {
    const c = put("c.md");
    const a = put("a.md");
    const b = put("b/inner.md");
    expect(lines(dirStamp([root])).map((l) => l.split(":")[0])).toEqual([a, b, c]);
  });

  it("is stable when nothing changes", () => {
    put("a.md");
    put("d/b.md");
    expect(dirStamp([root])).toBe(dirStamp([root]));
  });

  it("changes when a file is added, removed, resized or touched", () => {
    const file = put("a.md", "one");
    const before = dirStamp([root]);

    const extra = put("b.md");
    const added = dirStamp([root]);
    expect(added).not.toBe(before);
    rmSync(extra);
    expect(dirStamp([root])).toBe(before);

    writeFileSync(file, "longer");
    const resized = dirStamp([root]);
    expect(resized).not.toBe(before);

    utimesSync(file, new Date(1_000_000), new Date(1_000_000));
    expect(dirStamp([root])).not.toBe(resized);
  });

  it("joins several folders in the order given, with a missing one in place", () => {
    const first = path.join(root, "first");
    const second = path.join(root, "second");
    const gone = path.join(root, "gone");
    const f1 = put("first/a.md");
    const f2 = put("second/b.md");
    const got = lines(dirStamp([second, gone, first]));
    expect(got).toHaveLength(3);
    expect(got[0]).toMatch(new RegExp(`^${f2}:`));
    expect(got[1]).toBe(`${gone}:missing`);
    expect(got[2]).toMatch(new RegExp(`^${f1}:`));
    expect(dirStamp([first, second])).toBe(
      `${lines(dirStamp([first])).join("\n")}\n${dirStamp([second])}`,
    );
  });
});
