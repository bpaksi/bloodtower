import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { backlinks, outlinks } from "@dark-tower/workbench";
import { describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/find/route.ts";
import { buildGraph } from "./cards.ts";

// Each test spawns the CLI; CI runners are slow.
vi.setConfig({ testTimeout: 60000 });

const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), "../cli/graph.ts");
const run = (...args: string[]) => execFileSync("node", [cli, ...args], { encoding: "utf8" });

describe("pnpm graph show", () => {
  it("MEC-012 prints the card, links both ways with verbs and notes, and sources", () => {
    const { graph } = buildGraph();
    const out = run("show", "MEC-012");
    const node = graph.nodes["MEC-012"];
    expect(node?.kind).toBe("card");
    expect(out).toContain(`MEC-012  ${node?.title}`);
    const [pointsHere, fromHere] = [backlinks(graph, "MEC-012"), outlinks(graph, "MEC-012")];
    expect(pointsHere.length + fromHere.length).toBeGreaterThan(0);
    const section = (name: string) => {
      const start = out.indexOf(`${name}:`);
      return start < 0 ? "" : out.slice(start);
    };
    for (const [name, groups, other] of [
      ["Points here", pointsHere, "Sources:"],
      ["Links from here", fromHere, "Points here:"],
    ] as const) {
      const part = section(name).split(other)[0] ?? "";
      for (const g of groups) {
        expect(part).toContain(`  ${g.verb}\n`);
        for (const l of g.links) {
          expect(part).toContain(`    ${l.id}  `);
          if (l.note) expect(part).toContain(`(${l.note})`);
        }
      }
    }
    if (node?.kind === "card") {
      for (const s of node.sources) expect(out).toContain(s.file);
    }
    expect(out).toContain("Sources:");
  });

  it("a card nothing points at says so", () => {
    const { graph } = buildGraph();
    const lonely = Object.values(graph.nodes).find(
      (n) => n.kind === "card" && backlinks(graph, n.id).length === 0,
    );
    expect(lonely).toBeDefined();
    expect(run("show", lonely?.id ?? "")).toContain("Points here: none");
  });

  it("an unknown ID exits 1", () => {
    expect(() => execFileSync("node", [cli, "show", "NOPE-999"], { stdio: "pipe" })).toThrow();
  });
});

describe("pnpm graph find", () => {
  it.each(["MEC-012", "tower", "R-ENG-6"])(
    "prints the hits GET /api/find returns for %s",
    async (q) => {
      const res = GET(new Request(`http://x/api/find?q=${encodeURIComponent(q)}`));
      const { hits } = (await res.json()) as {
        hits: { href: string; id: string; title: string; snippet: string }[];
      };
      expect(hits.length).toBeGreaterThan(0);
      const lines = run("find", q).trimEnd().split("\n");
      expect(lines).toEqual(hits.map((h) => [h.href, h.id, h.title, h.snippet].join("  ")));
    },
  );
});
