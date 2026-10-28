import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addRegion,
  assignRegion,
  BUILDING_TYPES,
  emptyDraft,
  setCompleted,
  setEdge,
  setObject,
} from "./model.mjs";
import { toPackBoard } from "./pack-board.mjs";

// The smallest board the checks accept: one of each building in each kingdom, 16 spaces.
const spaces = ["N", "E", "S", "W"].flatMap((k) =>
  BUILDING_TYPES.map((type) => ({
    id: `${k}-${type.toLowerCase()}`,
    kingdom: k,
    name: `${k} ${type}`,
    terrain: "Desert",
    building: type,
  })),
);

// Every space in a ring with no slots, then all completed.
function finished(edit = () => {}) {
  const d = emptyDraft();
  spaces.forEach((s, i) => {
    const next = spaces[(i + 1) % spaces.length];
    setEdge(d, spaces, { from: s.id, to: next.id, slot: null });
  });
  edit(d);
  for (const s of spaces) setCompleted(d, s.id, true);
  return d;
}

const space = (board, id) => board.spaces.find((s) => s.id === id);

test("a finished map becomes pack spaces with slotted neighbours, the tower ring and regions", () => {
  const d = finished((draft) => {
    addRegion(draft, "Longwater");
    assignRegion(draft, "N-bazaar", "REG-01");
    setEdge(draft, spaces, { from: "N-village", to: "N-bazaar", slot: "E" });
    setObject(draft, "N-village", "tower", "N");
  });
  const { board, problems } = toPackBoard(d, spaces);
  assert.equal(problems, undefined);
  assert.deepEqual(board.region_labels, [{ id: "REG-01", name: "Longwater" }]);
  assert.deepEqual(space(board, "N-village"), {
    id: "N-village",
    name: "N Village",
    kingdom: "N",
    terrain: "desert",
    building: "village",
    tower_adjacent: true,
    adjacent: ["N-bazaar", "W-citadel"],
    neighbours: [
      { to: "N-bazaar", slot: "E" },
      { to: "W-citadel", slot: null },
    ],
  });
  const bazaar = space(board, "N-bazaar");
  assert.equal(bazaar.region, "REG-01");
  assert.equal(bazaar.tower_adjacent, undefined);
  assert.deepEqual(bazaar.neighbours[0], { to: "N-village", slot: "W" });
});

test("placed neighbours come clockwise from N, then the ones under the cross", () => {
  const d = finished((draft) => {
    setEdge(draft, spaces, { from: "N-bazaar", to: "N-sanctuary", slot: "W" });
    setEdge(draft, spaces, { from: "N-bazaar", to: "N-village", slot: "NE" });
    setEdge(draft, spaces, { from: "N-bazaar", to: "E-citadel", slot: null });
  });
  const bazaar = space(toPackBoard(d, spaces).board, "N-bazaar");
  assert.deepEqual(
    bazaar.neighbours.map((n) => [n.to, n.slot]),
    [
      ["N-village", "NE"],
      ["N-sanctuary", "W"],
      ["E-citadel", null],
    ],
  );
});

test("a map with open spaces is refused and names them", () => {
  const d = finished();
  setCompleted(d, "S-bazaar", false);
  const { board, problems } = toPackBoard(d, spaces);
  assert.equal(board, undefined);
  assert.match(problems[0], /S-bazaar/);
});

test("spaces with no region do not stop the export, other check errors do", () => {
  assert.ok(toPackBoard(finished(), spaces).board);
  const d = finished();
  d.buildings["N-village"] = null;
  const { board, problems } = toPackBoard(d, spaces);
  assert.equal(board, undefined);
  assert.ok(problems.some((p) => p.includes("N has 0 Villages")));
});
