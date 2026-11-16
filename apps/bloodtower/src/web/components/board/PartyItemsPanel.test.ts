import { describe, expect, it } from "vitest";
import { ITEMS_EMPTY, itemRows } from "./PartyItemsPanel.tsx";

const hero = (id: string, name: string, heldItems?: { id: string; name: string }[]) => ({
  id,
  name,
  hp: "unavailable",
  gold: "unavailable",
  items: "unavailable",
  corruptions: "unavailable",
  holder: null,
  ...(heldItems ? { heldItems } : {}),
});

describe("items panel rows", () => {
  it("one row per held item, and the locked line for a hero who holds nothing", () => {
    const rows = itemRows([
      hero("a", "Hero A", [
        { id: "potion", name: "Healing potion" },
        { id: "potion", name: "Healing potion" },
      ]),
      hero("b", "Hero B", []),
    ]);
    expect(rows.map((row) => row.text)).toEqual([
      "Hero A: Healing potion",
      "Hero A: Healing potion",
      `Hero B: ${ITEMS_EMPTY}`,
    ]);
  });

  it("EV-13: a missing item name reads unavailable", () => {
    const rows = itemRows([hero("a", "Hero A", [{ id: "x", name: "" }])]);
    expect(rows[0]?.text).toBe("Hero A: unavailable");
    expect(rows[0]?.text).not.toMatch(/: 0$|: $/);
  });

  it("a hero with no item list shows the empty line, not a blank", () => {
    expect(itemRows([hero("a", "Hero A")])[0]?.text).toBe(`Hero A: ${ITEMS_EMPTY}`);
  });
});
