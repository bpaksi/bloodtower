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
