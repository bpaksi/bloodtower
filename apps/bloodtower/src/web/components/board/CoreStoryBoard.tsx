"use client";

import { type BoardView, isOpeningMomentId } from "bloodtower-protocols";
import { joinWarning, pauseText } from "../../lib/boardView";
import { packStillImageUrl } from "../../lib/packAsset";
import { isStartupScreen } from "../../lib/startupBoard";
import { GearBoardPanel } from "./GearBoardPanel.tsx";
import { OpeningMoment } from "./OpeningMoment";
import { StartupBoard } from "./StartupBoard";

/** v2 story board. Startup is a centred dialog. Play is the move band or the place still. Display only. */
export function CoreStoryBoard({ view, debug }: { view: BoardView; debug?: boolean }) {
  if (isStartupScreen(view.screen)) return <StartupBoard view={view} debug={debug} />;

  const warning = joinWarning(view);
  const paused = pauseText(view.screen);
  const table = view.table ?? null;
  const place = view.place ?? null;
  const layer = place ? "place" : "move";
  const momentId =
    view.narration && isOpeningMomentId(view.narration.lineId) ? view.narration.lineId : null;
  const showMove = layer === "move" && !momentId;
  return (
    <main
      className="bt-board"
      data-screen={view.screen}
      data-board-mode="play"
      data-board-layer={layer}
      data-moment={momentId ?? undefined}
      data-paused={view.gear?.paused ? "true" : "false"}
      data-gear-opens={view.gear?.opens ?? 0}
      data-volume={view.gear?.volume ?? undefined}
    >
      <div className="bt-board-backdrop" aria-hidden="true" />
      {warning ? (
        <p className="bt-board-warning" role="status">
          {warning}
        </p>
      ) : null}
      {paused ? (
        <p className="bt-narration" role="status">
          {paused}
        </p>
      ) : null}
      {showMove && table ? (
        <header className="bt-band" data-band>
          {table.groups.map((group) => (
            <span key={group.heroId} data-health="unavailable">
              {group.heroName} unavailable
            </span>
          ))}
          <span data-purse="unavailable">unavailable</span>
          <span data-chapter>{table.chapter}</span>
          <span data-day>Day {table.day}</span>
          {table.actingGroup ? <span data-acting>{table.actingGroup}</span> : null}
          <span data-moves={table.movesLeft ?? "unavailable"}>
            {table.movesLeft == null ? "unavailable" : table.movesLeft}
          </span>
        </header>
      ) : null}
      {momentId && layer !== "place" ? <OpeningMoment momentId={momentId} /> : null}
      {showMove && table?.waitingFor ? (
        <p className="bt-waiting-pulse" data-waiting role="status">
          {table.waitingFor}
        </p>
      ) : null}
      {layer === "place" && place ? (
        <figure className="bt-place-still" data-place={place.building} data-still={place.stillId}>
          {/* biome-ignore lint/performance/noImgElement: pack stills are static files on the session host */}
          <img src={packStillImageUrl(place.stillId)} alt="" />
          <figcaption>{place.caption}</figcaption>
        </figure>
      ) : null}
      {view.gear ? <GearBoardPanel gear={view.gear} /> : null}
      {debug ? (
        <pre className="mt-4 max-h-64 overflow-auto text-xs opacity-70">
          {JSON.stringify(view, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
