/** RtDT board graph (DEC-221). Loaded from pack data; the engine holds no I/O. */

export type KingdomId = "N" | "E" | "S" | "W";

export type BoardKingdom = {
  id: KingdomId;
  /** Player-facing name (DEC-226). */
  name: string;
  label: string;
};

export type BoardSpace = {
  id: string;
  name: string;
  kingdom: KingdomId;
  terrain: string;
  building?: string;
  adjacent: string[];
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

export const neighborsOf = (board: BoardGraph, spaceId: string): BoardSpace[] => {
  const space = board.spaceById.get(spaceId);
  if (!space) return [];
  return space.adjacent
    .map((id) => board.spaceById.get(id))
    .filter((s): s is BoardSpace => s != null);
};
