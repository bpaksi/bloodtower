import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HINT_TEXT, HINTS_COPY, RULES_GROUP, RULES_PAGES } from "../../engine/hints/copy.ts";

const PLAN = join(import.meta.dirname, "../../../plans/briefs/CU/09-hints-and-rules/plan.md");

/** The Copy table's rows: slot (with a trailing "title" or "page" word kept) → exact text. */
const copyTable = (): Map<string, string> => {
  const rows = new Map<string, string>();
  for (const line of readFileSync(PLAN, "utf8").split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    const slot = /^`([a-z0-9.-]+)`(?: (title|page))?$/.exec(cells[2] ?? "");
    if (!slot?.[1] || !cells[3]) continue;
    rows.set(slot[2] ? `${slot[1]} ${slot[2]}` : slot[1], cells[3]);
  }
  return rows;
};

describe("CU/09 copy (EV-07)", () => {
  const table = copyTable();

  it("reads the table's filled rows", () => {
    expect(table.size).toBeGreaterThanOrEqual(15);
    for (const text of table.values()) expect(text).not.toContain("[COPY");
  });

  it("every hint is the Copy table's text, one sentence under 120 characters", () => {
    for (const [slot, text] of Object.entries(HINT_TEXT)) {
      expect(text, slot).toBe(table.get(slot));
      expect(text.length, slot).toBeLessThanOrEqual(120);
    }
  });

  it("the setting row and the Rules pages are the Copy table's text", () => {
    expect(HINTS_COPY.label).toBe(table.get("settings.hints.label"));
    expect(HINTS_COPY.on).toBe(table.get("settings.hints.on"));
    expect(HINTS_COPY.off).toBe(table.get("settings.hints.off"));
    expect(RULES_GROUP).toBe(table.get("lookup.rules.group"));
    const slots = ["battle", "building", "event", "skull-drop", "day-end"];
    expect(RULES_PAGES.map((page) => page.id)).toEqual(slots.map((slot) => `rules-${slot}`));
    for (const [index, slot] of slots.entries()) {
      expect(RULES_PAGES[index]?.title).toBe(table.get(`lookup.rules.${slot} title`));
      expect(RULES_PAGES[index]?.page).toBe(table.get(`lookup.rules.${slot} page`));
    }
  });

  it("no placeholder ships in src", () => {
    const here = join(import.meta.dirname, "../../engine");
    for (const file of ["hints/copy.ts", "loops/session/view.ts"]) {
      expect(readFileSync(join(here, file), "utf8")).not.toContain("[COPY");
    }
  });
});
