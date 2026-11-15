"use client";

import type { BoardView } from "bloodtower-protocols";
import { useEffect, useState } from "react";
import { CORRUPTION_LOSS_LIMIT } from "../../../engine/loops/day/rules.ts";
import { DialogFrame } from "./DialogFrame";

type Table = NonNullable<BoardView["table"]>;
type Roll = NonNullable<Table["rolls"]>[number];
type GroupsCard = NonNullable<Table["groupsCard"]>;

/** [COPY: day-start-groups] Loremaster slot (step 45) under the groups card. */
const GROUPS_CARD_COPY = "[COPY: day-start-groups]";

const signed = (n: number, word: string) =>
  n < 0 ? `(−${Math.abs(n)} ${word})` : `(+${n} ${word})`;

/** `<Group>: <total>` then one term per modifier: virtue, terrain, corruption (UI-021). */
export function rollText(roll: Roll): string {
  const terms: string[] = [];
  if (roll.virtue !== 0) terms.push(signed(roll.virtue, "virtue"));
  if (roll.terrain !== 0) terms.push(signed(roll.terrain, "terrain"));
  if (roll.corruption !== 0) terms.push(signed(roll.corruption, "corruption"));
  if (roll.split) terms.push(signed(roll.split, "split"));
  return [`${roll.name}: ${roll.total}`, ...terms].join(" ");
}

/**
 * The groups card (PT-18, CU/04 mockup `#day-start`): "Day N" and one line per group with its
 * heroes. No button. It leaves by itself after `holdMs`, the engine's `AUTO_ADVANCE_MS` (Q4.4),
 * and the roll panel follows. Shown once per day: the timer is keyed on the card's day.
 */
function useGroupsCard(card: GroupsCard | null | undefined): GroupsCard | null {
  const [doneDay, setDoneDay] = useState<number | null>(null);
  const day = card?.day ?? null;
  const holdMs = card?.holdMs ?? null;
  useEffect(() => {
    if (day === null || holdMs === null) return;
    const timer = setTimeout(() => setDoneDay(day), holdMs);
    return () => clearTimeout(timer);
  }, [day, holdMs]);
  if (!card || doneDay === card.day) return null;
  return card;
}

function GroupsCardPanel({ card }: { card: GroupsCard }) {
  return (
    <DialogFrame
      size="compact"
      className="bt-ink-in"
      id="groups-card"
      // Placed like the other day panels (board.css centres every [data-day-panel] above the band).
      data-day-panel="groups-card"
      data-groups-card=""
      data-hold-ms={card.holdMs}
      role="status"
      // The draft centres the card's lines (CU/04 mockup #day-start).
      style={{ textAlign: "center" }}
    >
      <h2 data-groups-day="">Day {card.day}</h2>
      <ul data-groups="">
        {card.groups.map((group, index) => (
          <li key={group.groupId} data-group={group.groupId}>
            Group {index + 1}: {group.heroNames.join(", ")}
          </li>
        ))}
      </ul>
      <p data-copy="day-start-groups">{GROUPS_CARD_COPY}</p>
    </DialogFrame>
  );
}

/** Edge band extras (UI-028, DEC-686) and the threat bar (UI-047). Display only. */
export function DayBandExtras({ table }: { table: Table }) {
  const left = table.daysLeft;
  return (
    <>
      <span data-days-left={left ?? "unavailable"}>
        {left == null ? "days left unavailable" : `${left} days left`}
      </span>
    </>
  );
}

/**
 * One hero's corruptions on that hero's panel (UI-030). Nothing for a hero with none. The
 * engine holds counts only; the names arrive with C3-08 (Bob 2026-11-07).
 */
export function HeroCorruptions({ table, heroId }: { table: Table; heroId: string }) {
  const rows = (table.corruptions ?? []).filter(
    (row) => row.panelHeroId === heroId && row.count > 0,
  );
  return rows.map((hero) => (
    <span key={hero.heroId} data-hero-corruptions={hero.heroId} data-count={hero.count}>
      {" "}
      {hero.heroName}: {hero.count} {hero.count === 1 ? "corruption" : "corruptions"}
    </span>
  ));
}

/** [band.mark.label] Loremaster, step 45 (CU/10). `{hero}` is the one hero who carries the mark. */
const markLabel = (hero: string) => `${hero} has two corruptions. A third ends the game.`;

/**
 * The corruption mark (PT-17, UI-028): an icon per hero one corruption short of the loss limit,
 * inside the lead's panel span. Display only: no words, no button, no action. A count that is not
 * known draws nothing, never a zero.
 */
export function HeroCorruptionMarks({ table, heroId }: { table: Table; heroId: string }) {
  const rows = (table.corruptions ?? []).filter(
    (row) => row.panelHeroId === heroId && row.count === CORRUPTION_LOSS_LIMIT - 1,
  );
  return rows.map((hero) => (
    <span
      key={hero.heroId}
      className="bt-corruption-mark"
      data-corruption-mark={hero.heroId}
      role="img"
      aria-label={markLabel(hero.heroName)}
    >
      <svg viewBox="0 0 20 20" width="1em" height="1em" aria-hidden="true">
        <path d="M10 1 L19 18 H1 Z" fill="#8a1e14" stroke="#e8dcc0" strokeWidth="1.2" />
        <rect x="9" y="7" width="2" height="6" fill="#e8dcc0" />
        <rect x="9" y="14" width="2" height="2" fill="#e8dcc0" />
      </svg>
    </span>
  ));
}

export function ThreatBar({ table }: { table: Table }) {
  const threat = table.threat;
  return (
    <div className="bt-threat" id="threat" data-threat={threat ?? "unavailable"}>
      <span className="bt-label">threat</span>
      {threat == null ? (
        <span data-threat-unavailable="">unavailable</span>
      ) : (
        <span className="bt-threat-skulls" role="img" aria-label={`${threat} coming`}>
          {Array.from({ length: threat }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: identical marks, order is the only identity
            <i key={index} className="bt-threat-skull" data-skull="" />
          ))}
          <span data-threat-count>{threat} coming</span>
        </span>
      )}
    </div>
  );
}

/** Groups card, roll, skull and effects panels. One at a time, chosen by `table.phase`. */
export function DayPanel({ table }: { table: Table }) {
  const phase = table.phase ?? null;
  const card = useGroupsCard(phase === "roll" ? table.groupsCard : null);
  if (card) return <GroupsCardPanel card={card} />;
  if (phase === "roll") {
    return (
      <DialogFrame size="compact" className="bt-ink-in" id="roll" data-day-panel="roll">
        <p className="bt-label" data-roll-day="">
          Day {table.day}
        </p>
        <ul data-rolls="">
          {(table.rolls ?? []).map((roll) => (
            <li key={roll.groupId} data-roll={roll.groupId} data-total={roll.total}>
              {rollText(roll)}
            </li>
          ))}
        </ul>
      </DialogFrame>
    );
  }
  if (phase === "skull-sim") {
    // PT-07: the no-tower night shows a heading and one line per skull, stacked (CU/03 mockup).
    const skull = table.skull;
    return (
      <DialogFrame size="compact" className="bt-ink-in" id="skull" data-day-panel={phase}>
        <h2 data-skull-heading="">Night falls</h2>
        <ul data-skull-lines="">
          {(skull?.lines ?? []).map((line, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: two skulls can land on one building; drop order is the identity
            <li key={`${line}-${index}`} data-skull-line="">
              {line}
            </li>
          ))}
        </ul>
        {(skull?.fell ?? []).map((name) => (
          <p key={name} data-fell={name}>
            {name} falls.
          </p>
        ))}
      </DialogFrame>
    );
  }
  if (phase === "skull") {
    const skull = table.skull;
    return (
      <DialogFrame size="compact" className="bt-ink-in" id="skull" data-day-panel={phase}>
        <p data-skull-kingdom={skull?.kingdomLabel ?? "unavailable"}>
          {skull?.kingdomLabel
            ? `A skull falls in ${skull.kingdomLabel}. Choose a building.`
            : "A skull falls. Choose a building."}
        </p>
        <ul data-skull-buildings="">
          {(skull?.buildings ?? []).map((building) => (
            <li
              key={building.spaceId}
              data-building={building.spaceId}
              data-fallen={building.fallen ? "true" : "false"}
              data-skulls={building.skulls}
            >
              {building.name}: {building.fallen ? "fallen" : `${building.skulls} of 4 skulls`}
            </li>
          ))}
        </ul>
        {(skull?.fell ?? []).map((name) => (
          <p key={name} data-fell={name}>
            {name} falls.
          </p>
        ))}
      </DialogFrame>
    );
  }
  if (phase === "effects") {
    const effects = table.effects ?? [];
    return (
      <DialogFrame size="compact" className="bt-ink-in" id="effects" data-day-panel="effects">
        <ul data-effects="">
          {effects.map((line, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: two lines may read the same; order is the identity
            <li key={`${line}-${index}`} data-effect="">
              {line}
            </li>
          ))}
        </ul>
      </DialogFrame>
    );
  }
  return null;
}
