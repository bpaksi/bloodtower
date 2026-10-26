import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addRegion,
  assignRegion,
  checkDraft,
  emptyDraft,
  exportBoard,
  firstOpenSlot,
  neighboursOf,
  objectsOf,
  progressOf,
  removeEdge,
  setEdge,
  setObject,
  setTerrain,
} from "./model.mjs";

const spaces = [
  { id: "N-a", kingdom: "N", name: "A", terrain: "Desert", building: null },
  { id: "N-b", kingdom: "N", name: "B", terrain: "Lake", building: null },
  { id: "N-c", kingdom: "N", name: "C", terrain: "Forest", building: null },
];

test("an edge is seen from both spaces, with the opposite slot on the other side", () => {
  const d = emptyDraft();
  setEdge(d, spaces, { from: "N-a", to: "N-b", slot: "E", river: true, note: "Great Woods" });
  assert.deepEqual(neighboursOf(d, "N-a"), [
    { to: "N-b", slot: "E", river: true, note: "Great Woods" },
  ]);
  assert.deepEqual(neighboursOf(d, "N-b"), [
    { to: "N-a", slot: "W", river: true, note: "Great Woods" },
  ]);
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
  assert.deepEqual(result.errors, []);
  assert.equal(result.complete, true);
});

test("terrain can be changed, and the export carries the region and neighbours", () => {
  const d = emptyDraft();
  addRegion(d, "Longwater");
  for (const s of spaces) assignRegion(d, s.id, "REG-01");
  setTerrain(d, "N-a", "Hills");
  setEdge(d, spaces, { from: "N-a", to: "N-b", slot: "E" });
  const out = exportBoard(d, spaces);
  assert.equal(out.spaces[0].terrain, "Hills");
  assert.equal(out.spaces[0].region, "REG-01");
  assert.equal(out.spaces[0].neighbours[0].to, "N-b");
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
  for (const e of edges) setEdge(d, board, { from: e.a, to: e.b, slot: null, river: e.river });
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

test("the river and the tower sit on their own slots, one of each per space", () => {
  const d = emptyDraft();
  setObject(d, "N-a", "river", "W");
  setObject(d, "N-a", "river", "NE");
  setObject(d, "N-a", "tower", "N");
  assert.deepEqual(objectsOf(d, "N-a"), { river: "NE", tower: "N" });
  assert.throws(() => setObject(d, "N-a", "river", "N"), /cannot go on N/);
  assert.throws(() => setObject(d, "N-a", "tower", "E"), /cannot go on E/);
  setObject(d, "N-a", "river", null);
  assert.deepEqual(objectsOf(d, "N-a"), { tower: "N" });
});

test("a neighbour and an object cannot share a slot", () => {
  const d = emptyDraft();
  setObject(d, "N-a", "tower", "N");
  assert.throws(() => setEdge(d, spaces, { from: "N-a", to: "N-b", slot: "N" }), /holds the tower/);
  setEdge(d, spaces, { from: "N-a", to: "N-c", slot: "E" });
  assert.throws(() => setObject(d, "N-a", "river", "E"), /taken by N-c/);
});
