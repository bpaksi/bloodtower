import { describe, expect, it } from "vitest";
import { buildGraph, parseCard } from "./cards.ts";
import { areaProgress } from "./progress.ts";

const card = (id: string, front: string) => parseCard(`${id}.md`, `---\n${front}\n---\n`);

describe("area progress", () => {
  const { graph } = buildGraph([
    card("AREA-001", "type: area\ntitle: Movement"),
    card(
      "Q-001",
      "type: question\ntitle: a\nstatus: open\nlayer: core\nlinks:\n  - { rel: part-of, to: AREA-001 }",
    ),
    card(
      "OPT-001",
      "type: option\ntitle: b\nstatus: proposed\nlayer: core\nlinks:\n  - { rel: part-of, to: AREA-001 }\n  - { rel: conflicts, to: OPT-002 }",
    ),
    card(
      "OPT-002",
      "type: option\ntitle: c\nstatus: proposed\nlinks:\n  - { rel: part-of, to: AREA-001 }",
    ),
    card(
      "DEC-001",
      "type: decision\ntitle: d\nstatus: decided\nlayer: story\nlinks:\n  - { rel: part-of, to: AREA-001 }",
    ),
    card(
      "IDEA-001",
      "type: idea\ntitle: e\nstatus: parked\nlinks:\n  - { rel: part-of, to: AREA-001 }",
    ),
  ]);

  it("counts decided, proposed and open, leaves parked out, and splits by layer", () => {
    const [row] = areaProgress(graph);
    expect(row).toMatchObject({ decided: 1, proposed: 2, open: 1, percent: 25 });
    expect(row?.byLayer).toEqual({ core: 2, configurable: 0, optional: 0, story: 1 });
    expect(row?.openQuestions.map((q) => q.id)).toEqual(["Q-001"]);
    expect(row?.conflicts.map((c) => `${c.from.id}>${c.to}`)).toEqual(["OPT-001>OPT-002"]);
  });
});
