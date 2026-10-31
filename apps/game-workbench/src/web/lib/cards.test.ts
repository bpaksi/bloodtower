import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildGraph, cardsDir, linkRuleProblems, loadCards, parseCard, RELS } from "./cards.ts";
import { layout, neighbours } from "./layout.ts";
import { COMMON, GAME_LINK_RULES } from "./link-rules.ts";

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

  it("accepts an art card with its ART- prefix", () => {
    expect(parseCard("ART-001.md", card("type: art\ntitle: x")).id).toBe("ART-001");
    expect(() => parseCard("UI-001.md", card("type: art\ntitle: x"))).toThrow(/ART-NNN/);
  });

  it("accepts the five layers, process among them (DEC-695), and the 1.1 release (DEC-696)", () => {
    for (const layer of ["core", "configurable", "optional", "story", "process"]) {
      expect(parseCard("DEC-001.md", card(`type: decision\ntitle: x\nlayer: ${layer}`)).layer).toBe(
        layer,
      );
    }
    expect(() => parseCard("DEC-001.md", card("type: decision\ntitle: x\nlayer: meta"))).toThrow(
      /unknown layer "meta"/,
    );
    const later = parseCard("MEC-001.md", card('type: mechanic\ntitle: x\nrelease: "1.1"'));
    expect(later.data.release).toBe("1.1");
    expect(() => parseCard("MEC-001.md", card('type: mechanic\ntitle: x\nrelease: "1.0"'))).toThrow(
      /unknown release/,
    );
  });

  // The lint: every card in research/game-design/cards parses, and every link resolves to a card,
  // a document ID, or carries a note saying what it is.
  // Loads the full cards folder; CI can exceed vitest's 5s default under load (see find.test.ts).
  it("has no broken cards or dangling links in the real folder", { timeout: 30_000 }, () => {
    expect(loadCards().cards.length).toBeGreaterThan(0);
    expect(loadCards().errors).toEqual([]);
    expect(buildGraph().problems).toEqual([]);
  });
});

describe("link rules", () => {
  // The lint: every link follows the rules table, or is an old break listed in the baseline.
  it("passes the real folder with the baseline, which stays small", () => {
    expect(linkRuleProblems()).toEqual([]);
    const baseline = JSON.parse(
      readFileSync(path.join(cardsDir(), ".link-baseline.json"), "utf8"),
    ) as string[];
    expect(baseline.length).toBeLessThanOrEqual(160);
    expect(baseline).toEqual([...baseline].sort());
  });

  it("has a rules row for every verb, in the README and in the code", () => {
    const readme = readFileSync(path.join(cardsDir(), "README.md"), "utf8");
    const section = readme.split("## Link rules")[1]?.split("\n## ")[0] ?? "";
    const inReadme = [...section.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]);
    const verbs = Object.keys(RELS).sort();
    expect([...inReadme].sort()).toEqual(verbs);
    expect(Object.keys(GAME_LINK_RULES.rels).sort()).toEqual(verbs);
  });

  it("README common-shapes column matches link-rules.ts COMMON", () => {
    const readme = readFileSync(path.join(cardsDir(), "README.md"), "utf8");
    const section = readme.split("## Link rules")[1]?.split("\n## ")[0] ?? "";
    const shapes: string[] = [];
    for (const m of section.matchAll(/^\| `([a-z-]+)` \|[^|]+\|[^|]+\|[^|]+\|([^|]+)\|/gm)) {
      const rel = m[1] ?? "";
      const cell = (m[2] ?? "").trim();
      if (!cell || cell === "—") continue;
      for (const part of cell.split(";")) {
        const [left, right] = part.split("→").map((s) => s.trim());
        if (!left || !right) continue;
        for (const to of right
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)) {
          shapes.push(`${left} ${rel} ${to}`);
        }
      }
    }
    expect([...shapes].sort()).toEqual([...COMMON].sort());
  });

  it("lets a new needs link between buildable things pass, and fails an odd new shape", () => {
    const { graph } = buildGraph([
      parseCard(
        "MEC-901.md",
        card("type: mechanic\ntitle: a\nlinks:\n  - { rel: needs, to: SCR-901 }"),
      ),
      parseCard(
        "SCR-901.md",
        card("type: screen\ntitle: b\nlinks:\n  - { rel: raises, to: Q-901 }"),
      ),
      parseCard("Q-901.md", card("type: question\ntitle: c")),
    ]);
    expect(linkRuleProblems(graph, [])).toEqual([
      "link SCR-901|raises|Q-901 breaks the link rules (see the rules table in the cards README)",
    ]);
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
