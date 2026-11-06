import { LATER_RELEASES } from "@dark-tower/workbench";
import { findGaps, type Gap, type GapGroup, groupGaps } from "@dark-tower/workbench/server";
import { buildGraph } from "./cards.ts";

/** The gaps report for the game's cards. The /gaps page and `pnpm graph gaps` both use this. */
export function loadGaps(): { gaps: Gap[]; groups: GapGroup[]; titles: Record<string, string> } {
  const { graph } = buildGraph();
  const gaps = findGaps(graph);
  const titles: Record<string, string> = {};
  for (const n of Object.values(graph.nodes)) if (n.kind === "card") titles[n.id] = n.title;
  return { gaps, groups: groupGaps(gaps), titles };
}

/**
 * The text `pnpm graph gaps` prints: the 1.0 list by rule, then the 1.1 list and the 1.2 list,
 * each under its own heading (DEC-696, DEC-812), then a line `N gaps`.
 */
export function gapsText(): string {
  const { gaps, groups, titles } = loadGaps();
  const lines: string[] = [];
  const count = (release: string) => gaps.filter((g) => g.release === release).length;
  for (const g of groups) {
    if (g.release !== "1.0" && g === groups.find((x) => x.release === g.release)) {
      lines.push(`== Waits for ${g.release} (${count(g.release)}) ==`, "");
    }
    lines.push(`${g.label} (${g.count})`);
    for (const gap of g.byArea.length ? uniqueGaps(g) : []) {
      const where =
        gap.areas.length && gap.areas[0] !== gap.id
          ? ` [${gap.areas.map((a) => titles[a] ?? a).join(", ")}]`
          : "";
      lines.push(`  ${gap.id}  ${gap.title}${gap.detail ? ` (${gap.detail})` : ""}${where}`);
    }
    lines.push("");
  }
  const split = LATER_RELEASES.filter((r) => count(r) > 0).map((r) => `${count(r)} for ${r}`);
  lines.push(
    `${gaps.length} gaps${split.length ? ` (${[`${count("1.0")} for 1.0`, ...split].join(", ")})` : ""}`,
  );
  return lines.join("\n");
}

function uniqueGaps(group: GapGroup): Gap[] {
  const seen = new Set<Gap>();
  for (const a of group.byArea) for (const g of a.gaps) seen.add(g);
  return [...seen];
}
