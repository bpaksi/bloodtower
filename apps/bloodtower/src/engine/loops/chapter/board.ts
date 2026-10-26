/** RtDT board graph (DEC-221). Loaded from pack data; the engine holds no I/O. */

export type KingdomId = "N" | "E" | "S" | "W";

export type BoardKingdom = {
  id: KingdomId;
  /** Player-facing name (DEC-226). */
  name: string;
  label: string;
};

/** Compass slots, clockwise from the tower-up point (UI-023, DEC-235). */
export const COMPASS_SLOTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type CompassSlot = (typeof COMPASS_SLOTS)[number];

export type BoardNeighbour = { to: string; slot?: CompassSlot | null };

export type BoardSpace = {
  id: string;
  name: string;
  kingdom: KingdomId;
  terrain: string;
  building?: string;
  adjacent: string[];
  /** When present this list is walked instead of `adjacent`. A null or absent slot is valid. */
  neighbours?: BoardNeighbour[];
};

export type BoardGraph = {
  kingdoms: BoardKingdom[];
  spaces: BoardSpace[];
  spaceById: ReadonlyMap<string, BoardSpace>;
};

export type BoardSpaceInput = Omit<BoardSpace, "adjacent"> & { adjacent?: string[] };

export const buildBoardGraph = (input: {
  kingdoms: BoardKingdom[];
  spaces: BoardSpaceInput[];
}): BoardGraph => {
  const spaces: BoardSpace[] = input.spaces.map((space) => ({
    ...space,
    adjacent: space.adjacent ?? [],
  }));
  return {
    kingdoms: input.kingdoms,
    spaces,
    spaceById: new Map(spaces.map((space) => [space.id, space])),
  };
};

export const kingdomDisplayName = (board: BoardGraph, kingdom: KingdomId): string => {
  const row = board.kingdoms.find((k) => k.id === kingdom);
  return row?.name ?? kingdom;
};

export const citadelForKingdom = (board: BoardGraph, kingdom: KingdomId): BoardSpace => {
  const found = board.spaces.find((s) => s.kingdom === kingdom && s.building === "citadel");
  if (!found) {
    throw new Error(`No citadel for kingdom ${kingdom} on the board.`);
  }
  return found;
};

export const spaceName = (board: BoardGraph, spaceId: string): string =>
  board.spaceById.get(spaceId)?.name ?? spaceId;

/** The one adjacency list a space walks: `neighbours` when loaded, else `adjacent` with null slots. */
const adjacencyOf = (space: BoardSpace): BoardNeighbour[] =>
  space.neighbours ?? space.adjacent.map((to) => ({ to, slot: null }));

export type SlottedNeighbour = { space: BoardSpace; slot: CompassSlot };

/**
 * Open neighbours with their compass slot (Done-when, W7-step-2). A set slot is kept.
 * Null slots fill the empty slots in list order, N clockwise. Two neighbours on one slot
 * throw: the game never picks a winner (DEC-236). More than eight unslotted neighbours throw
 * too: no truncation, no overflow.
 */
export const slottedNeighborsOf = (board: BoardGraph, spaceId: string): SlottedNeighbour[] => {
  const here = board.spaceById.get(spaceId);
  if (!here) return [];
  const open = adjacencyOf(here).flatMap((n) => {
    const space = board.spaceById.get(n.to);
    return space ? [{ space, slot: n.slot ?? null }] : [];
  });
  const taken = new Map<CompassSlot, string>();
  for (const n of open) {
    if (!n.slot) continue;
    const other = taken.get(n.slot);
    if (other) {
      throw new Error(`Space ${spaceId}: ${other} and ${n.space.id} both claim slot ${n.slot}.`);
    }
    taken.set(n.slot, n.space.id);
  }
  const empty = COMPASS_SLOTS.filter((slot) => !taken.has(slot));
  const out: SlottedNeighbour[] = [];
  for (const n of open) {
    if (n.slot) {
      out.push({ space: n.space, slot: n.slot });
      continue;
    }
    const slot = empty.shift();
    if (!slot) {
      throw new Error(`Space ${spaceId} has more than eight neighbours and no free slot.`);
    }
    out.push({ space: n.space, slot });
  }
  return out;
};

export const neighborsOf = (board: BoardGraph, spaceId: string): BoardSpace[] =>
  slottedNeighborsOf(board, spaceId).map((n) => n.space);
