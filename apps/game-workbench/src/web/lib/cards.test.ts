import { describe, expect, it } from "vitest";
import { buildGraph, loadCards, parseCard } from "./cards.ts";
import { layout, neighbours } from "./layout.ts";

const card = (front: string, body = "") => `---\n${front}\n---\n${body}`;

describe("card files", () => {
  it("parses a card with links and sources", () => {
    const c = parseCard(
      "IDEA-007.md",
      card(
        "type: idea\ntitle: Fog\nlinks:\n  - { rel: raises, to: Q-001 }\nsources:\n  - { file: x.md, lines: 3-4 }",
        "Body.",
      ),
    );
    expect(c).toMatchObject({
      id: "IDEA-007",
      status: "open",
      links: [{ rel: "raises", to: "Q-001" }],
    });
    expect(c.sources).toEqual([{ file: "x.md", lines: "3-4" }]);
  });

  it("rejects a prefix that does not match the type, an unknown verb and a missing title", () => {
    expect(() => parseCard("Q-001.md", card("type: idea\ntitle: x"))).toThrow(/IDEA-NNN/);
    expect(() =>
      parseCard("IDEA-001.md", card("type: idea\ntitle: x\nlinks:\n  - { rel: likes, to: Q-001 }")),
    ).toThrow(/unknown link rel/);
    expect(() => parseCard("IDEA-001.md", card("type: idea"))).toThrow(/title/);
  });

  it("accepts the tower card types with their own prefixes", () => {
    for (const [type, id] of [
      ["glyph", "GLY-001"],
      ["seal", "SEAL-012"],
      ["light", "LGT-024"],
      ["light-effect", "LFX-006"],
      ["light-sequence", "LSQ-021"],
      ["drum", "DRM-003"],
    ]) {
      expect(parseCard(`${id}.md`, card(`type: ${type}\ntitle: x`)).id).toBe(id);
    }
    expect(() => parseCard("LGT-001.md", card("type: drum\ntitle: x"))).toThrow(/DRM-NNN/);
  });

  // The lint: every card in research/game-design/cards parses, and every link resolves to a card,
  // a document ID, or carries a note saying what it is.
  it("has no broken cards or dangling links in the real folder", () => {
    expect(loadCards().cards.length).toBeGreaterThan(0);
    expect(loadCards().errors).toEqual([]);
    expect(buildGraph().problems).toEqual([]);
  });
});

describe("focus layout", () => {
  const { graph } = buildGraph([
    parseCard("IDEA-001.md", card("type: idea\ntitle: a\nlinks:\n  - { rel: raises, to: Q-001 }")),
    parseCard("Q-001.md", card("type: question\ntitle: b")),
    parseCard(
      "DEC-001.md",
      card("type: decision\ntitle: c\nlinks:\n  - { rel: answers, to: Q-001 }"),
    ),
  ]);

  it("reads verbs from the focus card's side", () => {
    expect(neighbours(graph, "Q-001")).toEqual([
      { id: "IDEA-001", verbs: ["raised by"], notes: [] },
      { id: "DEC-001", verbs: ["answered by"], notes: [] },
    ]);
  });

  it("puts the focus in the centre and second-step cards on the outer ring", () => {
    const { placed } = layout(graph, "IDEA-001", 1000, 700);
    expect(placed[0]).toMatchObject({ id: "IDEA-001", x: 500, y: 350, ring: 0 });
    expect(placed.find((p) => p.id === "Q-001")?.ring).toBe(1);
    expect(placed.find((p) => p.id === "DEC-001")).toMatchObject({ ring: 2, via: "Q-001" });
  });
});
