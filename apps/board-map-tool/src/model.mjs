// The board map's data model: spaces, the edges between them, regions, and the checks.
// An edge is one fact seen from two spaces. Each side has its own compass slot (or null
// for the list under the cross). The other side's slot is the opposite point, unless the
// entry sets it.

export const SLOTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const TERRAINS = ["Desert", "Hills", "Mountains", "Lake", "Forest", "Grasslands"];

// The order "first open slot" means: clockwise from north.
export const SLOT_ORDER = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const OPPOSITE = { N: "S", NE: "SW", E: "W", SE: "NW", S: "N", SW: "NE", W: "E", NW: "SE" };

export function emptyDraft() {
  return { regions: [], regionOf: {}, terrain: {}, objects: {}, completed: {}, edges: {} };
}

export function edgeKey(a, b) {
  return [a, b].sort().join("|");
}

// Set one space's slot on an edge, and the other space's slot to the opposite point.
// Throws when either slot is already used by another neighbour, so Bob picks which one
// keeps it (DEC-236).
// A completed space is read-only until it is reopened (Bob, 2026-10-26).
export function isCompleted(draft, spaceId) {
  return Boolean(draft.completed?.[spaceId]);
}

function assertEditable(draft, ...spaceIds) {
  for (const id of spaceIds) {
    if (isCompleted(draft, id)) throw new Error(`${id} is completed. Reopen it to change it.`);
  }
}

export function setCompleted(draft, spaceId, on) {
  draft.completed ??= {};
  if (on) draft.completed[spaceId] = true;
  else delete draft.completed[spaceId];
  return draft;
}

export function setEdge(draft, spaces, { from, to, slot, river = false, note = "" }) {
  const ids = new Set(spaces.map((s) => s.id));
  if (!ids.has(from) || !ids.has(to)) throw new Error("Unknown space");
  assertEditable(draft, from, to);
  if (from === to) throw new Error("A space cannot neighbour itself");
  if (slot !== null && !SLOTS.includes(slot)) throw new Error(`Unknown slot ${slot}`);

  const key = edgeKey(from, to);
  const otherSlot = slot === null ? null : OPPOSITE[slot];
  const sides = { [from]: slot, [to]: otherSlot };
  for (const [space, s] of Object.entries(sides)) {
    if (s === null) continue;
    const clash = neighboursOf(draft, space).find(
      (n) => n.slot === s && n.to !== (space === from ? to : from),
    );
    const object = objectAt(draft, space, s);
    if (object) throw new Error(`Slot ${s} at ${space} holds the ${object}`);
    if (clash) {
      throw new Error(
        `Slot ${s} at ${space} is taken by ${clash.to}. Move ${clash.to} to the list, or pick another slot.`,
      );
    }
  }

  draft.edges[key] = {
    a: [from, to].sort()[0],
    b: [from, to].sort()[1],
    slots: sides,
    river: Boolean(river),
    note: note.trim(),
  };
  return draft;
}

// The first slot in SLOT_ORDER that is open on both spaces, so the edge can be placed.
// An edge already between the two keeps its own slots while it is checked.
export function firstOpenSlot(draft, from, to) {
  const key = edgeKey(from, to);
  const current = draft.edges[key];
  const free = (space, slot) => {
    const other = space === from ? to : from;
    if (objectAt(draft, space, slot)) return false;
    return !neighboursOf(draft, space).some((n) => n.slot === slot && n.to !== other);
  };
  for (const slot of SLOT_ORDER) {
    if (current && current.slots[from] === slot) return slot;
    if (free(from, slot) && free(to, OPPOSITE[slot])) return slot;
  }
  return null;
}

export function removeEdge(draft, a, b) {
  assertEditable(draft, a, b);
  delete draft.edges[edgeKey(a, b)];
  return draft;
}

// The neighbours of one space, seen from that space.
export function neighboursOf(draft, id) {
  return Object.values(draft.edges)
    .filter((e) => e.a === id || e.b === id)
    .map((e) => {
      const to = e.a === id ? e.b : e.a;
      return { to, slot: e.slots[id] ?? null, river: e.river, note: e.note };
    })
    .sort((x, y) => x.to.localeCompare(y.to));
}

export function addRegion(draft, name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("A region needs a name");
  if (draft.regions.some((r) => r.name === trimmed))
    throw new Error(`Region ${trimmed} already exists`);
  const next = draft.regions.length + 1;
  const id = `REG-${String(next).padStart(2, "0")}`;
  draft.regions.push({ id, name: trimmed });
  return draft;
}

export function assignRegion(draft, spaceId, regionId) {
  assertEditable(draft, spaceId);
  if (regionId === null) {
    delete draft.regionOf[spaceId];
    return draft;
  }
  if (!draft.regions.some((r) => r.id === regionId)) throw new Error(`Unknown region ${regionId}`);
  draft.regionOf[spaceId] = regionId;
  return draft;
}

export function setTerrain(draft, spaceId, terrain) {
  assertEditable(draft, spaceId);
  if (!TERRAINS.includes(terrain)) throw new Error(`Unknown terrain ${terrain}`);
  draft.terrain[spaceId] = terrain;
  return draft;
}

// Things that sit in a compass slot but are not spaces: the River (W, E or a diagonal) and
// The Tower (always N). Each space has at most one of each. Stored as objects[spaceId][kind] = slot;
// a kind with no slot is not on the cross.
export const OBJECT_KINDS = [
  { id: "river", label: "River", slots: ["W", "E", "NW", "NE", "SW", "SE"] },
  { id: "tower", label: "The Tower", slots: ["N"] },
];

export function objectsOf(draft, spaceId) {
  return draft.objects?.[spaceId] ?? {};
}

// Places a river or the tower on a slot, or takes it off the cross (slot null).
export function setObject(draft, spaceId, kind, slot) {
  assertEditable(draft, spaceId);
  const def = OBJECT_KINDS.find((k) => k.id === kind);
  if (!def) throw new Error(`Unknown object ${kind}`);
  draft.objects ??= {};
  const current = { ...objectsOf(draft, spaceId) };
  if (slot === null) {
    delete current[kind];
  } else {
    if (!def.slots.includes(slot)) throw new Error(`${def.label} cannot go on ${slot}`);
    const neighbour = neighboursOf(draft, spaceId).find((n) => n.slot === slot);
    const other = objectAt(draft, spaceId, slot, kind);
    if (neighbour) throw new Error(`Slot ${slot} at ${spaceId} is taken by ${neighbour.to}`);
    if (other) throw new Error(`Slot ${slot} at ${spaceId} is taken by the ${other}`);
    current[kind] = slot;
  }
  if (Object.keys(current).length) draft.objects[spaceId] = current;
  else delete draft.objects[spaceId];
  return draft;
}

// The object kind on a slot of a space (other than `except`), or undefined.
export function objectAt(draft, spaceId, slot, except) {
  const hit = Object.entries(objectsOf(draft, spaceId)).find(
    ([kind, s]) => s === slot && kind !== except,
  );
  return hit ? hit[0] : undefined;
}

export function terrainOf(draft, space) {
  return draft.terrain[space.id] ?? space.terrain;
}

// Problems that block the export (errors) and things to look at (warnings).
export function checkDraft(draft, spaces) {
  const errors = [];
  const warnings = [];
  const regionIds = new Set(draft.regions.map((r) => r.id));

  for (const space of spaces) {
    if (!draft.regionOf[space.id]) errors.push(`${space.id} has no region`);
    else if (!regionIds.has(draft.regionOf[space.id]))
      errors.push(`${space.id} points at an unknown region`);
    if (neighboursOf(draft, space.id).length === 0)
      errors.push(`${space.id} has no neighbours entered`);
  }

  for (const region of draft.regions) {
    const members = spaces.filter((s) => draft.regionOf[s.id] === region.id);
    if (members.length === 0) warnings.push(`${region.name} (${region.id}) has no spaces yet`);
  }

  for (const space of spaces) {
    const slots = neighboursOf(draft, space.id)
      .filter((n) => n.slot !== null)
      .map((n) => n.slot);
    const dupes = slots.filter((s, i) => slots.indexOf(s) !== i);
    for (const s of new Set(dupes)) errors.push(`${space.id} uses slot ${s} twice`);
  }

  return { errors, warnings, complete: errors.length === 0 };
}

// The file the game reads (DEC-240): spaces with their region, terrain and neighbours.
export function exportBoard(draft, spaces) {
  return {
    regions: draft.regions,
    spaces: spaces.map((s) => ({
      id: s.id,
      kingdom: s.kingdom,
      name: s.name,
      terrain: terrainOf(draft, s),
      building: s.building,
      region: draft.regionOf[s.id],
      objects: objectsOf(draft, s.id),
      neighbours: neighboursOf(draft, s.id),
    })),
  };
}

// How far the entry has got, for the toolbar. A side is "placed" once it has a compass slot,
// and "in the tray" while it does not.
export function progressOf(draft, spaces) {
  const edges = Object.values(draft.edges);
  const sides = edges.length * 2;
  const placed = edges.reduce(
    (n, e) => n + Object.values(e.slots).filter((slot) => slot !== null).length,
    0,
  );
  const kingdoms = {};
  for (const k of ["N", "E", "S", "W"]) {
    const members = spaces.filter((s) => s.kingdom === k);
    kingdoms[k] = {
      total: members.length,
      withRegion: members.filter((s) => draft.regionOf[s.id]).length,
    };
  }
  return {
    spaces: spaces.length,
    withRegion: spaces.filter((s) => draft.regionOf[s.id]).length,
    withNeighbours: spaces.filter((s) => neighboursOf(draft, s.id).length > 0).length,
    completed: spaces.filter((s) => isCompleted(draft, s.id)).length,
    pairs: edges.length,
    sidesPlaced: placed,
    sidesInTray: sides - placed,
    kingdoms,
  };
}
