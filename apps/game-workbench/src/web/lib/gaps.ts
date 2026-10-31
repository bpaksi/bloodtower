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
 * The text `pnpm graph gaps` prints: the 1.0 list by rule, then the 1.1 list under its own
 * heading (DEC-696), then a line `N gaps`.
 */
export function gapsText(): string {
  const { gaps, groups, titles } = loadGaps();
  const lines: string[] = [];
  const later = gaps.filter((g) => g.release === "1.1").length;
  for (const g of groups) {
    if (g.release === "1.1" && g === groups.find((x) => x.release === "1.1")) {
      lines.push(`== Waits for 1.1 (${later}) ==`, "");
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
  lines.push(
    `${gaps.length} gaps${later ? ` (${gaps.length - later} for 1.0, ${later} for 1.1)` : ""}`,
  );
  return lines.join("\n");
}

function uniqueGaps(group: GapGroup): Gap[] {
  const seen = new Set<Gap>();
  for (const a of group.byArea) for (const g of a.gaps) seen.add(g);
  return [...seen];
}
