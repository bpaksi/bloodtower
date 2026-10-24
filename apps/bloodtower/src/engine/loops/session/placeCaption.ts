/** Story-board captions for the first Enter of each place (Leave only, no encounter text). */

export const PLACE_BUILDINGS = ["village", "bazaar", "citadel", "sanctuary"] as const;
export type PlaceBuilding = (typeof PLACE_BUILDINGS)[number];

export const PLACE_STILL_ID: Record<PlaceBuilding, string> = {
  village: "place.village",
  bazaar: "place.bazaar",
  citadel: "place.citadel",
  sanctuary: "place.sanctuary",
};

export const PLACE_CAPTION: Record<PlaceBuilding, string> = {
  village: "Quiet roofs. A well, a few doors. Nothing stirs.",
  bazaar: "Stalls stand empty. The cloth still smells of spice.",
  citadel: "Stone walls, a closed gate. The kingdom\u2019s mark above the door.",
  sanctuary: "A low stone sanctuary. The door is shut, but the threshold is dry.",
};

export const isPlaceBuilding = (value: string | undefined): value is PlaceBuilding =>
  value != null && (PLACE_BUILDINGS as readonly string[]).includes(value);
