import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addRegion,
  assignRegion,
  buildingOf,
  checkDraft,
  emptyDraft,
  firstOpenSlot,
  isCompleted,
  neighboursOf,
  objectsOf,
  parseDraft,
  progressOf,
  removeEdge,
  setBuilding,
  setCompleted,
  setEdge,
  setObject,
  setTerrain,
  terrainOf,
} from "./model.mjs";

const spaces = [
  { id: "N-a", kingdom: "N", name: "A", terrain: "Desert", building: null },
  { id: "N-b", kingdom: "N", name: "B", terrain: "Lake", building: null },
  { id: "N-c", kingdom: "N", name: "C", terrain: "Forest", building: null },
];

test("an edge is seen from both spaces, with the opposite slot on the other side", () => {
  const d = emptyDraft();
  setEdge(d, spaces, { from: "N-a", to: "N-b", slot: "E", note: "Great Woods" });
  assert.deepEqual(neighboursOf(d, "N-a"), [{ to: "N-b", slot: "E", note: "Great Woods" }]);
  assert.deepEqual(neighboursOf(d, "N-b"), [{ to: "N-a", slot: "W", note: "Great Woods" }]);
});

test("a slot already used on a space is refused, so Bob picks which neighbour keeps it", () => {
  const d = emptyDraft();
  setEdge(d, spaces, { from: "N-a", to: "N-b", slot: "E" });
  setEdge(d, spaces, { from: "N-a", to: "N-c", slot: "NE" });
  assert.throws(() => setEdge(d, spaces, { from: "N-a", to: "N-c", slot: "E" }), /taken by N-b/);
});

test("a neighbour can be moved to the list to free its slot", () => {
  const d = emptyDraft();
  setEdge(d, spaces, { from: "N-a", to: "N-b", slot: "E" });
  setEdge(d, spaces, { from: "N-a", to: "N-b", slot: null });
  setEdge(d, spaces, { from: "N-a", to: "N-c", slot: "E" });
  assert.equal(neighboursOf(d, "N-a").find((n) => n.to === "N-c").slot, "E");
});

test("a space cannot neighbour itself, and unknown spaces are refused", () => {
  const d = emptyDraft();
  assert.throws(() => setEdge(d, spaces, { from: "N-a", to: "N-a", slot: "N" }));
  assert.throws(
    () => setEdge(d, spaces, { from: "N-a", to: "X-nowhere", slot: "N" }),
    /Unknown space/,
  );
});

test("removing an edge removes it from both spaces", () => {
  const d = emptyDraft();
  setEdge(d, spaces, { from: "N-a", to: "N-b", slot: "E" });
  removeEdge(d, "N-b", "N-a");
  assert.deepEqual(neighboursOf(d, "N-a"), []);
});

test("regions get REG numbers in order, and every space needs one", () => {
  const d = emptyDraft();
  addRegion(d, "The Great Woods");
  addRegion(d, "Regal Run");
  assert.deepEqual(
    d.regions.map((r) => r.id),
    ["REG-01", "REG-02"],
  );
  assert.throws(() => addRegion(d, "Regal Run"), /already exists/);
  assignRegion(d, "N-a", "REG-01");
  const result = checkDraft(d, spaces);
  assert.equal(result.complete, false);
  assert.ok(result.errors.includes("N-b has no region"));
});

test("a check passes only when every space has a region and neighbours", () => {
  const d = emptyDraft();
  addRegion(d, "Longwater");
  for (const s of spaces) assignRegion(d, s.id, "REG-01");
  setEdge(d, spaces, { from: "N-a", to: "N-b", slot: "E" });
  setEdge(d, spaces, { from: "N-c", to: "N-b", slot: "S" });
  setEdge(d, spaces, { from: "N-a", to: "N-c", slot: "SE" });
  const result = checkDraft(d, spaces);
  assert.deepEqual(
    result.errors.filter((e) => !e.includes("each kingdom")),
    [],
  );
});

test("terrain can be changed, and the draft keeps the region and neighbours", () => {
  const d = emptyDraft();
  addRegion(d, "Longwater");
  for (const s of spaces) assignRegion(d, s.id, "REG-01");
  setTerrain(d, "N-a", "Hills");
  setEdge(d, spaces, { from: "N-a", to: "N-b", slot: "E" });
  assert.equal(terrainOf(d, spaces[0]), "Hills");
  assert.equal(d.regionOf[spaces[0].id], "REG-01");
  assert.equal(neighboursOf(d, spaces[0].id)[0].to, "N-b");
});

test("the starting edges from the board map all fit the model", async () => {
  const { readFile } = await import("node:fs/promises");
  const board = JSON.parse(
    await readFile(new URL("./spaces.json", import.meta.url), "utf8"),
  ).spaces;
  const { edges } = JSON.parse(
    await readFile(new URL("./starting-edges.json", import.meta.url), "utf8"),
  );
  const d = emptyDraft();
  for (const e of edges) setEdge(d, board, { from: e.a, to: e.b, slot: null });
  assert.equal(Object.keys(d.edges).length, edges.length);
  const hasEdge = board.every((s) => neighboursOf(d, s.id).length > 0);
  assert.equal(hasEdge, true, "every space has at least one starting neighbour");
});

test("the first open slot is taken in clockwise order, on both spaces", () => {
  const d = emptyDraft();
  assert.equal(firstOpenSlot(d, "N-a", "N-b"), "N");
  setEdge(d, spaces, { from: "N-a", to: "N-c", slot: "N" });
  assert.equal(firstOpenSlot(d, "N-a", "N-b"), "NE");
  setEdge(d, spaces, { from: "N-a", to: "N-b", slot: "NE" });
  assert.equal(neighboursOf(d, "N-b").find((n) => n.to === "N-a").slot, "SW");
});

test("progress counts spaces, regions, pairs and the sides placed or in the tray", () => {
  const d = emptyDraft();
  addRegion(d, "Longwater");
  assignRegion(d, "N-a", "REG-01");
  setEdge(d, spaces, { from: "N-a", to: "N-b", slot: "E" });
  setEdge(d, spaces, { from: "N-c", to: "N-b", slot: null });
  const p = progressOf(d, spaces);
  assert.equal(p.spaces, 3);
  assert.equal(p.withRegion, 1);
  assert.equal(p.withNeighbours, 3);
  assert.equal(p.pairs, 2);
  assert.equal(p.sidesPlaced, 2);
  assert.equal(p.sidesInTray, 2);
  assert.equal(p.kingdoms.N.withRegion, 1);
});

test("the tower sits on N, and only on N", () => {
  const d = emptyDraft();
  setObject(d, "N-a", "tower", "N");
  assert.deepEqual(objectsOf(d, "N-a"), { tower: "N" });
  assert.throws(() => setObject(d, "N-a", "tower", "E"), /cannot go on E/);
  assert.throws(() => setObject(d, "N-a", "river", "W"), /Unknown object river/);
  setObject(d, "N-a", "tower", null);
  assert.deepEqual(objectsOf(d, "N-a"), {});
});

test("a neighbour and the tower cannot share a slot", () => {
  const d = emptyDraft();
  setObject(d, "N-a", "tower", "N");
  assert.throws(() => setEdge(d, spaces, { from: "N-a", to: "N-b", slot: "N" }), /holds the tower/);
  setEdge(d, spaces, { from: "N-a", to: "N-c", slot: "E" });
  assert.throws(() => setObject(d, "N-a", "tower", "E"), /cannot go on E/);
});

test("a completed space is read-only until it is reopened", () => {
  const d = emptyDraft();
  addRegion(d, "Longwater");
  assignRegion(d, "N-a", "REG-01");
  setEdge(d, spaces, { from: "N-a", to: "N-b", slot: "E" });
  setCompleted(d, "N-a", true);
  assert.equal(isCompleted(d, "N-a"), true);
  assert.throws(() => setTerrain(d, "N-a", "Hills"), /is completed/);
  assert.throws(() => assignRegion(d, "N-a", null), /is completed/);
  assert.throws(() => setObject(d, "N-a", "tower", "N"), /is completed/);
  assert.throws(() => setEdge(d, spaces, { from: "N-c", to: "N-a", slot: "W" }), /is completed/);
  assert.throws(() => removeEdge(d, "N-a", "N-b"), /is completed/);
  setCompleted(d, "N-a", false);
  setTerrain(d, "N-a", "Hills");
  assert.equal(isCompleted(d, "N-a"), false);
});

test("each kingdom needs exactly one building of each type", () => {
  const kingdoms = ["N", "E", "S", "W"];
  const types = ["Village", "Bazaar", "Sanctuary", "Citadel"];
  const board = [];
  for (const k of kingdoms)
    for (let i = 0; i < 15; i++)
      board.push({
        id: `${k}-${i}`,
        kingdom: k,
        name: `${k}${i}`,
        terrain: "Desert",
        building: null,
      });
  const d = emptyDraft();
  addRegion(d, "Longwater");
  for (const s of board) assignRegion(d, s.id, "REG-01");
  for (const k of kingdoms)
    types.forEach((type, i) => {
      setBuilding(d, `${k}-${i}`, type);
    });
  const buildingErrors = (draft) =>
    checkDraft(draft, board).errors.filter((e) => e.includes("each kingdom"));
  assert.deepEqual(buildingErrors(d), []);

  setBuilding(d, "N-4", "Village");
  const errors = buildingErrors(d);
  assert.ok(errors.includes("N has 2 Villages; each kingdom needs exactly one"));
  assert.equal(buildingOf(d, board[4]), "Village");
  setBuilding(d, "N-1", null);
  assert.ok(buildingErrors(d).includes("N has 0 Bazaars; each kingdom needs exactly one"));
  setBuilding(d, "N-1", "Bazaar");
  setBuilding(d, "N-4", null);
  assert.equal(buildingOf(d, board[4]), null);
  assert.throws(() => setBuilding(d, "N-4", "Castle"), /Unknown building/);
});

test("an object the tool no longer knows can still be taken off the cross", () => {
  const d = emptyDraft();
  d.objects = { "N-a": { river: "W" } };
  setObject(d, "N-a", "river", null);
  assert.deepEqual(objectsOf(d, "N-a"), {});
  d.objects = { "N-a": { river: "W" } };
  assert.throws(() => setObject(d, "N-a", "river", "W"), /Unknown object river/);
});

test("a draft with bad entries loads, keeping what is good and listing what was dropped", () => {
  const text = JSON.stringify({
    regions: [{ id: "REG-01", name: "Longwater" }, { id: 7 }],
    regionOf: { "N-a": "REG-01", "N-b": "REG-99", "X-gone": "REG-01" },
    terrain: { "N-a": "Lava" },
    objects: { "N-a": { river: "W", tower: "N" } },
    buildings: { "N-a": "Castle" },
    completed: { "N-a": true },
    edges: {
      "N-a|N-b": { a: "N-a", b: "N-b", slots: { "N-a": "E", "N-b": "W" }, note: "ok" },
      "N-a|N-c": { a: "N-a", b: "N-missing", slots: {} },
    },
  });
  const { draft, problems } = parseDraft(text, spaces);
  assert.deepEqual(draft.regions, [{ id: "REG-01", name: "Longwater" }]);
  assert.deepEqual(draft.regionOf, { "N-a": "REG-01" });
  assert.deepEqual(draft.terrain, {});
  assert.deepEqual(draft.objects, { "N-a": { tower: "N" } });
  assert.deepEqual(draft.buildings, {});
  assert.deepEqual(draft.completed, { "N-a": true });
  assert.deepEqual(Object.keys(draft.edges), ["N-a|N-b"]);
  assert.ok(problems.some((p) => p.includes("region REG-99")));
  assert.ok(problems.some((p) => p.includes("river on N-a")));
  assert.ok(problems.some((p) => p.includes("building Castle")));
  assert.ok(problems.some((p) => p.includes("edge N-a|N-c is broken")));
});

test("text that is not a draft returns no draft, so the caller can set it aside", () => {
  assert.equal(parseDraft("{not json", spaces).draft, null);
  assert.equal(parseDraft("[1,2]", spaces).draft, null);
  assert.equal(parseDraft("null", spaces).draft, null);
});

test("a chosen slot can replace the neighbour on it, which goes to the tray", () => {
  const d = emptyDraft();
  setEdge(d, spaces, { from: "N-a", to: "N-b", slot: "E" });
  assert.throws(() => setEdge(d, spaces, { from: "N-a", to: "N-c", slot: "E" }), /is taken by N-b/);
  setEdge(d, spaces, { from: "N-a", to: "N-c", slot: "E", replace: true });
  assert.equal(neighboursOf(d, "N-a").find((n) => n.to === "N-c").slot, "E");
  assert.equal(neighboursOf(d, "N-a").find((n) => n.to === "N-b").slot, null);
});
