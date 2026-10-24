"use client";

import type { BoardView } from "bloodtower-protocols";
import { joinWarning } from "../../lib/boardView";
import { packStillImageUrl } from "../../lib/packAsset";

/** v2 story board: status band, place stills, and text. Display only. */
export function CoreStoryBoard({ view, debug }: { view: BoardView; debug?: boolean }) {
  const warning = joinWarning(view);
  const table = view.table ?? null;
  const place = view.place ?? null;
  return (
    <main className="bt-board" data-screen={view.screen}>
      {warning ? (
        <p className="bt-board-warning" role="status">
          {warning}
        </p>
      ) : null}
      {table ? (
        <header className="bt-band" data-band>
          <span data-health={table.health}>Health {table.health}</span>
          <span data-purse={table.purse}>Purse {table.purse}</span>
          <span data-chapter>{table.chapter}</span>
          <span data-day>Day {table.day}</span>
          {table.actingGroup ? <span data-acting>{table.actingGroup}</span> : null}
          <span data-moves={table.movesLeft ?? "unavailable"}>
            Moves {table.movesLeft ?? "unavailable"}
          </span>
        </header>
      ) : null}
      {table?.waitingFor ? (
        <p className="bt-waiting-pulse" data-waiting role="status">
          {table.waitingFor}
        </p>
      ) : null}
      {place ? (
        <figure className="bt-place-still" data-place={place.building} data-still={place.stillId}>
          <img src={packStillImageUrl(place.stillId)} alt="" />
          <figcaption>{place.caption}</figcaption>
        </figure>
      ) : null}
      {table ? (
        <ul data-roster>
          {table.groups.map((group) => (
            <li
              key={group.heroId}
              data-hero-place={group.heroId}
              data-alone={group.alone ? "true" : "false"}
              data-kingdom={group.kingdomLabel}
              data-space-name={group.spaceName}
            >
              {group.heroName} · {group.kingdomLabel} · {group.spaceName}
              {group.alone ? " · alone" : ""}
              {group.inside && group.building ? ` · inside the ${group.building}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {view.levels.map((level) => (
        <section key={level.id} data-level={level.id}>
          <h2 className="text-xl font-semibold text-[var(--bt-accent)]">{level.label}</h2>
          <p className="text-lg whitespace-pre-wrap">{level.shows}</p>
        </section>
      ))}
      {view.narration ? (
        <p className="bt-narration" data-narration={view.narration.lineId}>
          {view.narration.text}
        </p>
      ) : null}
      <ul className="flex flex-wrap gap-3">
        {view.heroes.map((hero) => (
          <li key={hero.id} data-hero={hero.id}>
            {hero.name} — {hero.held ? "held" : "waiting"}
          </li>
        ))}
      </ul>
      {debug ? (
        <pre className="mt-4 max-h-64 overflow-auto text-xs opacity-70">
          {JSON.stringify(view, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
