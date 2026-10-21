// Placeholder content for the Story board layouts. Roles are DEC-100; the four attributes are
// DEC-101. The attribute values are invented (1-5) because the cards say "numbers for later".
import type { Rng } from "../../../lib/rng.ts";

export type Role = "Fighter" | "Healer" | "Magic user" | "Scout" | "Ranger" | "Scholar";
export type Hero = {
  name: string;
  role: Role;
  might: number;
  stealth: number;
  magic: number;
  wits: number;
  ability: string;
};

export const POOL_HEROES: readonly Hero[] = [
  { name: "Hero A", role: "Fighter", might: 5, stealth: 2, magic: 1, wits: 2, ability: "Duel" },
  { name: "Hero B", role: "Healer", might: 2, stealth: 2, magic: 3, wits: 3, ability: "Heal" },
  { name: "Hero C", role: "Magic user", might: 1, stealth: 2, magic: 5, wits: 3, ability: "Glyph" },
  { name: "Hero D", role: "Scout", might: 2, stealth: 5, magic: 1, wits: 3, ability: "Disarm" },
  { name: "Hero E", role: "Ranger", might: 3, stealth: 3, magic: 1, wits: 5, ability: "Track" },
  { name: "Hero F", role: "Scholar", might: 1, stealth: 2, magic: 3, wits: 5, ability: "Lore" },
];

export const PLAYERS = ["Player 1", "Player 2", "Player 3", "Player 4"] as const;

export const ITEMS = ["Rope", "Lantern", "Healing herbs", "Silver key", "Old map"] as const;

export const SUMMARY_ROWS: readonly [string, string][] = [
  ["Difficulty", "Normal"],
  ["Players", "3"],
  ["Heroes", "Fighter, Scout, Scholar"],
  ["Tower", "Unavailable"],
];

export const JOIN_URL = "bloodtower.local:4747/join";

export type LayoutId = "waiting" | "acting" | "roll" | "items" | "summary" | "qr" | "play";
export const LAYOUTS: readonly { id: LayoutId; name: string; cards: string }[] = [
  { id: "waiting", name: "Waiting dialog", cards: "UI-015 + UI-014" },
  { id: "acting", name: "Now acting", cards: "UI-011" },
  { id: "roll", name: "Hero roll", cards: "UI-012" },
  { id: "items", name: "Party items", cards: "UI-013" },
  { id: "summary", name: "Summary", cards: "UI-009" },
  { id: "qr", name: "Join QR", cards: "UI-010" },
  { id: "play", name: "Play (all panels)", cards: "SCR-014" },
];

/** Who holds each pool hero in the hero-roll layout (null = still free); a pure function of the rng. */
export function assignHolders(rng: Rng): (string | null)[] {
  return POOL_HEROES.map(() => (rng.chance(0.6) ? rng.pick(PLAYERS) : null));
}
