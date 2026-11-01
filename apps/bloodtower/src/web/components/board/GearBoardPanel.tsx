"use client";

import type { GearView } from "bloodtower-protocols";
import { JoinQr } from "../../lib/qr.ts";

const TITLE: Record<string, string> = {
  "current-party": "Current party",
  "game-board-setup": "Game board setup",
  volume: "Volume",
  "look-up": "Look up",
  "change-who-holds-whom": "Change who holds whom",
  "join-another-ipad": "Join another iPad",
};

/** Display only. The iPad presses; this panel never has a button. */
export function GearBoardPanel({ gear }: { gear: GearView }) {
  if (!gear.panel) return null;
  const title = TITLE[gear.panel] ?? gear.panel;
  return (
    <section data-panel={gear.panel} data-piece-checks={gear.pieceChecks} data-volume={gear.volume}>
      <p>Game paused.</p>
      <h2>{title}</h2>
      {gear.picked ? <p data-picked={gear.picked}>{gear.picked}</p> : null}
      {gear.panel === "current-party" ? (
        <ul data-party>
          {gear.party.map((hero) => (
            <li key={hero.id} data-hero={hero.id} data-holder={hero.holder ?? ""}>
              <span data-name>{hero.name}</span>
              <span data-hp>HP {hero.hp}</span>
              <span data-gold>Gold {hero.gold}</span>
              <span data-items>Items {hero.items}</span>
              <span data-corruptions>Corruptions {hero.corruptions}</span>
              <span data-holder-name>Holder {hero.holder ?? "nobody"}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {gear.panel === "game-board-setup" ? (
        <ol data-setup-steps>
          {gear.setupSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
      {gear.panel === "volume" ? <p>How loud should the tower be? Press one to hear it.</p> : null}
      {gear.panel === "look-up" ? (
        gear.card ? (
          <p data-card={gear.card}>{gear.card}</p>
        ) : (
          <ul data-cards>
            {gear.cards.map((card) => (
              <li key={card.id}>{card.title}</li>
            ))}
          </ul>
        )
      ) : null}
      {gear.panel === "change-who-holds-whom" ? (
        <ul>
          {gear.party.map((hero) => (
            <li key={hero.id} data-hero={hero.id} data-holder={hero.holder ?? ""}>
              {hero.name} · {hero.holder ?? "nobody"}
            </li>
          ))}
        </ul>
      ) : null}
      {gear.panel === "join-another-ipad" && gear.joinUrl ? (
        <div data-qr>
          <JoinQr url={gear.joinUrl} />
          <p data-join-url>{gear.joinUrl}</p>
        </div>
      ) : null}
    </section>
  );
}
