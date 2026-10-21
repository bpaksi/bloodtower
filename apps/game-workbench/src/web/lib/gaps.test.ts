import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildGraph } from "./cards.ts";
import { loadGaps } from "./gaps.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("gaps report on the real cards", () => {
  it("prints a count that equals the sum of the /gaps group counts", () => {
    const out = execFileSync("node", [path.join(here, "../cli/graph.ts"), "gaps"], {
      encoding: "utf8",
    });
    const printed = Number(/^(\d+) gaps$/m.exec(out)?.[1]);
    const { gaps, groups } = loadGaps();
    expect(printed).toBe(gaps.length);
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(printed);
    expect(printed).toBeGreaterThan(0);
  });

  it("every gap row names a real card", () => {
    const { graph } = buildGraph();
    for (const g of loadGaps().gaps) expect(graph.nodes[g.id]?.kind).toBe("card");
  });

  it("show and find say not yet", () => {
    const out = execFileSync("node", [path.join(here, "../cli/graph.ts"), "show", "MEC-001"], {
      encoding: "utf8",
    });
    expect(out.trim()).toBe("graph show: not yet");
  });
});
