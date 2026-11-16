import type { BoardView } from "bloodtower-protocols";
import { PortraitCard } from "../PortraitCard";

type PoolHero = BoardView["heroes"][number];

/** Copy row 4 (`card.class`). A role with no word reads unavailable, never a guess. */
const CLASS_WORDS: Record<string, string> = {
  fighter: "Fighter",
  healer: "Healer",
  "magic-user": "Magic-user",
  scout: "Scout",
  ranger: "Ranger",
  bard: "Bard",
};

const UNAVAILABLE = "unavailable"; // Copy row 6a

const field = (label: string, value: number | undefined): string =>
  value === undefined ? `${label} ${UNAVAILABLE}` : `${label} ${value}`;

/**
 * One hero's card on the Story board at Pick (CU/08, PT-15). Display only: no button, no action
 * (DEC-278). A seated hero's card greys out (DEC-098). Every value comes from the pack through
 * the board view; none is written here.
 */
export const HeroCard = ({ hero }: { hero: PoolHero }) => (
  <li
    className="bt-hero-card"
    data-hero={hero.id}
    data-held={hero.held ? "true" : "false"}
    data-fight={hero.fight ?? ""}
    data-hit-points={hero.hitPoints ?? ""}
  >
    <PortraitCard name={hero.name} label={hero.name} compact />
    <p className="bt-hero-card-class" data-card-class="">
      {hero.role !== undefined ? (CLASS_WORDS[hero.role] ?? UNAVAILABLE) : UNAVAILABLE}
    </p>
    <p className="bt-hero-card-stat" data-card-fight="">
      {field("Fight", hero.fight)}
    </p>
    <p className="bt-hero-card-stat" data-card-hp="">
      {field("Hit points", hero.hitPoints)}
    </p>
    <p className="bt-hero-card-line" data-card-line="">
      {hero.ability ?? UNAVAILABLE}
    </p>
    <p className="bt-claim-state">{hero.held ? "Picked" : "Open"}</p>
  </li>
);
