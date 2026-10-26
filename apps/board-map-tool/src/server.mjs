// Local-only server for the board map entry tool. Serves the page and keeps a working draft
// in data/draft.json. Export writes the game's board file into the base pack (DEC-240) and
// only when every check passes.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  addRegion,
  assignRegion,
  BUILDING_TYPES,
  buildingOf,
  checkDraft,
  emptyDraft,
  exportBoard,
  firstOpenSlot,
  isCompleted,
  neighboursOf,
  OBJECT_KINDS,
  objectsOf,
  progressOf,
  removeEdge,
  SLOTS,
  setBuilding,
  setCompleted,
  setEdge,
  setObject,
  setTerrain,
  TERRAINS,
  terrainOf,
} from "./model.mjs";
import { startingDraft } from "./seed.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, "..");
const repoRoot = join(appDir, "..", "..");
const spaces = JSON.parse(await readFile(join(here, "spaces.json"), "utf8")).spaces;
const draftPath = join(appDir, "data", "draft.json");
const exportPath = join(repoRoot, "packs-v2", "base", "board-map.json");
const port = Number(process.env.PORT ?? 4790);

let draft = emptyDraft();
try {
  draft = JSON.parse(await readFile(draftPath, "utf8"));
} catch (err) {
  if (err.code !== "ENOENT") throw err;
  draft = await startingDraft();
}

async function save() {
  await mkdir(dirname(draftPath), { recursive: true });
  const tmp = `${draftPath}.tmp`;
  await writeFile(tmp, `${JSON.stringify(draft, null, 2)}\n`);
  await rename(tmp, draftPath);
}

function state() {
  return {
    spaces: spaces.map((s) => ({
      ...s,
      terrain: terrainOf(draft, s),
      region: draft.regionOf[s.id] ?? null,
      building: buildingOf(draft, s),
      objects: objectsOf(draft, s.id),
      completed: isCompleted(draft, s.id),
      neighbours: neighboursOf(draft, s.id),
    })),
    regions: draft.regions,
    objectKinds: OBJECT_KINDS,
    buildingTypes: BUILDING_TYPES,
    slots: SLOTS,
    terrains: TERRAINS,
    check: checkDraft(draft, spaces),
    progress: progressOf(draft, spaces),
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

const actions = {
  // slot "auto" takes the first open slot on both spaces (SLOT_ORDER), or fails if none is open.
  "/api/edge": async (b) => {
    const slot = b.slot === "auto" ? firstOpenSlot(draft, b.from, b.to) : b.slot;
    if (b.slot === "auto" && slot === null)
      throw new Error(`No open slot on ${b.from} and ${b.to}`);
    return setEdge(draft, spaces, { ...b, slot });
  },
  "/api/edge/remove": async (b) => removeEdge(draft, b.a, b.b),
  "/api/region": async (b) => addRegion(draft, b.name),
  "/api/assign": async (b) => assignRegion(draft, b.space, b.region ?? null),
  "/api/terrain": async (b) => setTerrain(draft, b.space, b.terrain),
  "/api/object": async (b) => setObject(draft, b.space, b.kind, b.slot ?? null),
  "/api/complete": async (b) => setCompleted(draft, b.space, Boolean(b.on)),
  "/api/building": async (b) => setBuilding(draft, b.space, b.type ?? null),
};

async function route(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  if (req.method === "GET" && url.pathname === "/api/state") return send(res, 200, state());
  if (req.method === "POST" && actions[url.pathname]) {
    try {
      await actions[url.pathname](await readBody(req));
      await save();
      return send(res, 200, state());
    } catch (err) {
      return send(res, 409, { error: err.message, ...state() });
    }
  }
  if (req.method === "POST" && url.pathname === "/api/export") {
    const result = checkDraft(draft, spaces);
    if (!result.complete)
      return send(res, 409, {
        error: "The check still has errors, so nothing was exported.",
        ...state(),
      });
    await mkdir(dirname(exportPath), { recursive: true });
    await writeFile(exportPath, `${JSON.stringify(exportBoard(draft, spaces), null, 2)}\n`);
    return send(res, 200, { exported: exportPath, ...state() });
  }
  if (req.method === "GET") {
    const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
    try {
      const body = await readFile(join(appDir, "public", file));
      res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
      return res.end(body);
    } catch {
      return send(res, 404, { error: "Not found" });
    }
  }
  return send(res, 405, { error: "Method not allowed" });
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

createServer((req, res) => {
  route(req, res).catch((err) => {
    console.error(err);
    send(res, 500, { error: err.message });
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Board map entry tool at http://127.0.0.1:${port}`);
});
