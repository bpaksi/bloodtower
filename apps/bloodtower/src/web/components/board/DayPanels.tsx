"use client";

import type { BoardView } from "bloodtower-protocols";
import { DialogFrame } from "./DialogFrame";

type Table = NonNullable<BoardView["table"]>;
type Roll = NonNullable<Table["rolls"]>[number];

/** [COPY: regroup] Loremaster sample text; the board shows it, the iPad carries the choice. */
export const REGROUP_LINE = "A new day. Stay together, or split up?";

const signed = (n: number, word: string) =>
  n < 0 ? `(−${Math.abs(n)} ${word})` : `(+${n} ${word})`;

/** `<Group>: <total>` then one term per modifier: virtue, terrain, corruption (UI-021). */
export function rollText(roll: Roll): string {
  const terms: string[] = [];
  if (roll.virtue !== 0) terms.push(signed(roll.virtue, "virtue"));
  if (roll.terrain !== 0) terms.push(signed(roll.terrain, "terrain"));
  if (roll.corruption !== 0) terms.push(signed(roll.corruption, "corruption"));
  return [`${roll.name}: ${roll.total}`, ...terms].join(" ");
}

/** Edge band extras (UI-028, DEC-686) and the threat bar (UI-047). Display only. */
export function DayBandExtras({ table }: { table: Table }) {
  const left = table.daysLeft;
  return (
    <>
      <span data-days-left={left ?? "unavailable"}>
        {left == null ? "days left unavailable" : `${left} days left`}
      </span>
      {table.corruptions
        ?.filter((hero) => hero.count > 0)
        .map((hero) => (
          <span key={hero.heroId} data-hero-corruptions={hero.heroId} data-count={hero.count}>
            {hero.heroName}: {hero.count} {hero.count === 1 ? "corruption" : "corruptions"}
          </span>
        ))}
    </>
  );
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

/** Day start, roll, skull and effects panels. One at a time, chosen by `table.phase`. */
export function DayPanel({ table }: { table: Table }) {
  const phase = table.phase ?? null;
  if (phase === "regroup") {
    return (
      <DialogFrame size="compact" className="bt-ink-in" id="regroup" data-day-panel="regroup">
        <p className="bt-label">Day {table.day}</p>
        <p data-regroup-line="">{REGROUP_LINE}</p>
        <ul data-groups="">
          {table.groups.map((group) => (
            <li key={group.heroId} data-group={group.heroId}>
              {group.heroName} · {group.spaceName}
              {group.alone ? " · alone" : ""}
            </li>
          ))}
        </ul>
      </DialogFrame>
    );
  }
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
  if (phase === "skull" || phase === "skull-sim") {
    const skull = table.skull;
    return (
      <DialogFrame size="compact" className="bt-ink-in" id="skull" data-day-panel={phase}>
        <p data-skull-kingdom={skull?.kingdomLabel ?? "unavailable"}>
          {skull?.kingdomLabel
            ? phase === "skull-sim"
              ? `A skull falls in ${skull.kingdomLabel}.`
              : `A skull falls in ${skull.kingdomLabel}. Choose a building.`
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
