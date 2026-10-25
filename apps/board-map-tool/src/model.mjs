// The board map's data model: spaces, the edges between them, regions, and the checks.
// An edge is one fact seen from two spaces. Each side has its own compass slot (or null
// for the list under the cross). The other side's slot is the opposite point, unless the
// entry sets it.

export const SLOTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const TERRAINS = ["Desert", "Hills", "Mountains", "Lake", "Forest", "Grasslands"];

const OPPOSITE = { N: "S", NE: "SW", E: "W", SE: "NW", S: "N", SW: "NE", W: "E", NW: "SE" };

export function emptyDraft() {
  return { regions: [], regionOf: {}, terrain: {}, edges: {} };
}

export function edgeKey(a, b) {
  return [a, b].sort().join("|");
}

// Set one space's slot on an edge, and the other space's slot to the opposite point.
// Throws when either slot is already used by another neighbour, so Bob picks which one
// keeps it (DEC-236).
export function setEdge(draft, spaces, { from, to, slot, river = false, note = "" }) {
  const ids = new Set(spaces.map((s) => s.id));
  if (!ids.has(from) || !ids.has(to)) throw new Error("Unknown space");
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

export function removeEdge(draft, a, b) {
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
  if (regionId === null) {
    delete draft.regionOf[spaceId];
    return draft;
  }
  if (!draft.regions.some((r) => r.id === regionId)) throw new Error(`Unknown region ${regionId}`);
  draft.regionOf[spaceId] = regionId;
  return draft;
}

export function setTerrain(draft, spaceId, terrain) {
  if (!TERRAINS.includes(terrain)) throw new Error(`Unknown terrain ${terrain}`);
  draft.terrain[spaceId] = terrain;
  return draft;
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
      neighbours: neighboursOf(draft, s.id),
    })),
  };
}
