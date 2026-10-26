import { describe, expect, it } from "vitest";
import { buildFindIndex, find } from "./find.ts";
import { makeIdScheme } from "./ids.ts";

const ids = makeIdScheme({
  sources: [String.raw`(?:MEC|Q)-\d+`, String.raw`R-[A-Z]+-\d+`],
  kindOf: () => "x",
  labels: {},
});

const cards = [
  { id: "MEC-10", title: "Tower turn", body: "The tower rotates on a drum." },
  { id: "MEC-2", title: "Skull count", body: "Count skulls near the glimmer of dawn." },
  { id: "MEC-012", title: "Dawn", body: "Morning comes." },
];

const docs = [
  {
    slug: "reqs",
    file: "reqs.md",
    title: "Requirements",
    markdown: [
      "# Requirements",
      "",
      "- R-WIZ-5. A list item definition.",
      "| ID | Text |",
      "| R-ENG-6 | A table row definition |",
      "See R-ENG-6 and R-WIZ-5 elsewhere, plus R-NOP-1 with nothing defining it.",
      "The wizard speaks about blue lanterns.",
    ].join("\n"),
  },
];

const index = buildFindIndex(cards, docs, ids);

describe("find", () => {
  it("finds a card by exact ID, case ignored", () => {
    const hits = find(index, "mec-012");
    expect(hits[0]).toMatchObject({ kind: "card", id: "MEC-012", href: "/?focus=MEC-012" });
  });

  it("finds a card by a word in its title and by a word only in its body", () => {
    expect(find(index, "skull")[0]?.id).toBe("MEC-2");
    expect(find(index, "rotates")[0]?.id).toBe("MEC-10");
  });

  it("finds a document line by a word", () => {
    const hit = find(index, "lanterns")[0];
    expect(hit).toMatchObject({ kind: "line", href: "/doc/reqs#L7", title: "Requirements" });
  });

  it("orders ties with numbers compared as numbers", () => {
    const ids2 = find(index, "mec").map((h) => h.id);
    expect(ids2.indexOf("MEC-2")).toBeLessThan(ids2.indexOf("MEC-10"));
  });

  it("resolves a document-only ID to its table row or list item", () => {
    expect(find(index, "R-ENG-6")[0]).toMatchObject({ kind: "line", href: "/doc/reqs#L5" });
    expect(find(index, "r-wiz-5")[0]).toMatchObject({ kind: "line", href: "/doc/reqs#L3" });
  });

  it("falls through to word search for an ID with no card and no defining line", () => {
    const hits = find(index, "R-NOP-1");
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ kind: "line", href: "/doc/reqs#L6" });
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(find(index, "  ")).toEqual([]);
    expect(find(index, "r", 2)).toHaveLength(2);
  });
});

describe("find: ID column of a document-line hit (#127)", () => {
  it("shows the first ID on the line, else file:line", () => {
    const withId = find(index, "elsewhere")[0];
    expect(withId).toMatchObject({ kind: "line", id: "R-ENG-6" });
    const none = find(index, "lanterns")[0];
    expect(none).toMatchObject({ kind: "line", id: "reqs.md:7" });
  });
});

describe("find: query handling", () => {
  it("returns nothing for limit 0", () => {
    expect(find(index, "tower", 0)).toEqual([]);
  });

  it("treats regex characters as plain text", () => {
    expect(find(index, "(")).toEqual([]);
    expect(find(index, "[a-z]+")).toEqual([]);
    expect(find(index, ".*")).toEqual([]);
    expect(find(index, "R-ENG-6)")).toEqual([]);
  });

  it("requires every word, in any order, with extra spaces ignored", () => {
    expect(find(index, "  dawn   glimmer ").map((h) => h.id)).toEqual(["MEC-2"]);
    expect(find(index, "glimmer dawn").map((h) => h.id)).toEqual(["MEC-2"]);
    expect(find(index, "dawn zebra")).toEqual([]);
  });

  it("ignores case in words and in IDs", () => {
    expect(find(index, "SKULL")[0]?.id).toBe("MEC-2");
    expect(find(index, "Mec-10")[0]).toMatchObject({ kind: "card", id: "MEC-10" });
  });

  it("matches a card by ID fragment ahead of a title word, ahead of a body word", () => {
    const cs = [
      { id: "A-1", title: "plain", body: "zork body" },
      { id: "A-2", title: "zork title", body: "plain" },
      { id: "ZORK-3", title: "plain", body: "plain" },
    ];
    const idx = buildFindIndex(cs, [], ids);
    expect(find(idx, "zork").map((h) => h.id)).toEqual(["ZORK-3", "A-2", "A-1"]);
  });

  it("lists a card ahead of document lines when the score ties", () => {
    const idx = buildFindIndex(
      [{ id: "C-1", title: "x", body: "word" }],
      [{ slug: "d", file: "d.md", title: "D", markdown: "word" }],
      ids,
    );
    expect(find(idx, "word").map((h) => h.kind)).toEqual(["card", "line"]);
  });

  it("does not repeat the exact-ID hit in the word results", () => {
    const hits = find(index, "MEC-10");
    expect(hits.filter((h) => h.href === "/?focus=MEC-10")).toHaveLength(1);
    expect(hits[0]?.id).toBe("MEC-10");
  });

  it("puts an exact ID ahead of better-scoring word matches, even with a limit of 1", () => {
    const cs = [
      { id: "MEC-1", title: "x", body: "mec-1 mec-1" },
      { id: "AAA-1", title: "mec-1", body: "mec-1" },
    ];
    const idx = buildFindIndex(cs, [], ids);
    expect(find(idx, "mec-1", 1)).toHaveLength(1);
    expect(find(idx, "mec-1", 1)[0]?.id).toBe("MEC-1");
  });

  it("prefers a card over a document line that defines the same ID", () => {
    const idx = buildFindIndex(
      [{ id: "MEC-5", title: "Card five", body: "b" }],
      [{ slug: "d", file: "d.md", title: "D", markdown: "# MEC-5 in a doc" }],
      ids,
    );
    expect(find(idx, "mec-5")[0]).toMatchObject({ kind: "card", id: "MEC-5" });
  });
});

describe("find: snippets", () => {
  it("clips a long card body to 140 characters ending in an ellipsis", () => {
    const idx = buildFindIndex([{ id: "L-1", title: "t", body: "word ".repeat(100) }], [], ids);
    const snip = find(idx, "L-1")[0]?.snippet ?? "";
    expect(snip).toHaveLength(140);
    expect(snip.endsWith("…")).toBe(true);
  });

  it("starts the snippet 30 characters before the first match, with a leading ellipsis", () => {
    const body = `${"a".repeat(100)} needle ${"b".repeat(100)}`;
    const idx = buildFindIndex([{ id: "L-1", title: "t", body }], [], ids);
    const snip = find(idx, "needle")[0]?.snippet ?? "";
    expect(snip.startsWith(`…${"a".repeat(29)} needle`)).toBe(true);
    expect(snip.length).toBeLessThanOrEqual(141);
  });

  it("has no leading ellipsis when the match is near the start", () => {
    const idx = buildFindIndex([{ id: "L-1", title: "t", body: "short needle here" }], [], ids);
    expect(find(idx, "needle")[0]?.snippet).toBe("short needle here");
  });

  it("collapses newlines and runs of spaces to single spaces", () => {
    const idx = buildFindIndex([{ id: "L-1", title: "t", body: "a\n\n  b\t c" }], [], ids);
    expect(find(idx, "L-1")[0]?.snippet).toBe("a b c");
  });

  it("starts at the earliest of several words, not the first word typed", () => {
    const body = `${"x".repeat(60)} late ${"y".repeat(10)} early`;
    const idx = buildFindIndex([{ id: "L-1", title: "t", body }], [], ids);
    const snip = find(idx, "early late")[0]?.snippet ?? "";
    expect(snip).toContain("late");
    expect(snip.startsWith("…")).toBe(true);
  });
});

describe("buildFindIndex: document lines", () => {
  const build = (markdown: string, slug = "d") =>
    buildFindIndex([], [{ slug, file: `${slug}.md`, title: "D", markdown }], ids);

  it("skips blank and whitespace-only lines but keeps real line numbers", () => {
    const idx = build("one\n\n   \ntwo");
    expect(idx.entries.map((e) => (e.kind === "line" ? e.line : 0))).toEqual([1, 4]);
  });

  it("indexes nothing for an empty document or no documents", () => {
    expect(build("").entries).toEqual([]);
    expect(buildFindIndex([], [], ids).entries).toEqual([]);
  });

  it("ranks a heading over a table row over a list item, wherever each sits", () => {
    const idx = build("- R-ENG-9 list\n| R-ENG-9 | row |\n## R-ENG-9 heading");
    expect(idx.defined.get("r-eng-9")).toEqual({ slug: "d", line: 3 });
    const noHeading = build("- R-ENG-9 list\n| R-ENG-9 | row |");
    expect(noHeading.defined.get("r-eng-9")).toEqual({ slug: "d", line: 2 });
  });

  it("keeps the first definition when two share a rank", () => {
    const idx = build("- R-ENG-9 first\n- R-ENG-9 second");
    expect(idx.defined.get("r-eng-9")).toEqual({ slug: "d", line: 1 });
  });

  it("keeps the earlier document on a tie, and a later heading beats an earlier list item", () => {
    const docs = [
      { slug: "a", file: "a.md", title: "A", markdown: "- R-ENG-9 list" },
      { slug: "b", file: "b.md", title: "B", markdown: "- R-ENG-9 list too" },
      { slug: "c", file: "c.md", title: "C", markdown: "# R-ENG-9" },
    ];
    expect(buildFindIndex([], docs.slice(0, 2), ids).defined.get("r-eng-9")?.slug).toBe("a");
    expect(buildFindIndex([], docs, ids).defined.get("r-eng-9")?.slug).toBe("c");
  });

  it("does not count a longer ID as a definition of a shorter one", () => {
    const idx = build("## R-ENG-60 heading\n| R-ENG-6 | row |");
    expect(idx.defined.get("r-eng-6")).toEqual({ slug: "d", line: 2 });
  });

  it("sees a bold or code-quoted ID at the start of a line", () => {
    const idx = build(
      "## **R-ENG-1** x\n| `R-ENG-2` | row |\n- *R-ENG-3* item\n1. R-ENG-4 numbered",
    );
    expect(idx.defined.get("r-eng-1")?.line).toBe(1);
    expect(idx.defined.get("r-eng-2")?.line).toBe(2);
    expect(idx.defined.get("r-eng-3")?.line).toBe(3);
    expect(idx.defined.get("r-eng-4")?.line).toBe(4);
  });

  it("does not treat a plain sentence that names an ID as defining it", () => {
    const idx = build("We need R-ENG-1 soon.");
    expect(idx.defined.has("r-eng-1")).toBe(false);
  });

  it("reads a document with Windows line endings", () => {
    const idx = build("# R-ENG-1\r\n\r\n- R-ENG-2 item\r\n");
    expect(idx.defined.get("r-eng-1")).toEqual({ slug: "d", line: 1 });
    expect(idx.defined.get("r-eng-2")).toEqual({ slug: "d", line: 3 });
  });

  it("maps lower-case card IDs to their card ID", () => {
    const idx = buildFindIndex([{ id: "MEC-7", title: "t", body: "" }], [], ids);
    expect(idx.cardIds.get("mec-7")).toBe("MEC-7");
  });

  it("encodes a card ID in its focus link", () => {
    const idx = buildFindIndex([{ id: "A B/1", title: "t", body: "x" }], [], ids);
    expect(idx.entries[0]).toMatchObject({ href: "/?focus=A%20B%2F1" });
  });
});
