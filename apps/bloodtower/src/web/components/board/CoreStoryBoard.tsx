"use client";

import { type BoardView, isOpeningMomentId } from "bloodtower-protocols";
import { joinWarning, pauseText } from "../../lib/boardView";
import { packStillImageUrl } from "../../lib/packAsset";
import { isStartupScreen } from "../../lib/startupBoard";
import { DialogFrame } from "./DialogFrame";
import { GearBoardPanel } from "./GearBoardPanel.tsx";
import { OpeningMoment } from "./OpeningMoment";
import { StartupBoard } from "./StartupBoard";

/** The mockup's tower mark, small enough that the pause dialog stays a typical frame. */
function TowerMark() {
  return (
    <div className="bt-tower-band" role="img" aria-label="The Tower">
      <svg viewBox="0 0 30 40" width="45" height="60" aria-hidden="true">
        <path d="M15 1 L18 10 L12 10 Z" fill="#2a2420" stroke="#c9a85a" strokeWidth="0.8" />
        <circle cx="15" cy="6.5" r="1.3" fill="#d4543a" />
        <path d="M10 13 L20 13 L22 37 L8 37 Z" fill="#1f1b18" stroke="#c9a85a" strokeWidth="0.9" />
        <path
          d="M13 37 v-4 a2 2 0 0 1 4 0 v4 Z"
          fill="#0e0c0a"
          stroke="#c9a85a"
          strokeWidth="0.6"
        />
      </svg>
    </div>
  );
}

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
        <DialogFrame size="compact" className="bt-ink-in" data-tower-quiet="" role="status">
          <TowerMark />
          <p className="bt-startup-cue">The tower has gone quiet. The game waits.</p>
        </DialogFrame>
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
      {showMove && table?.waitingFor && !paused ? (
        <DialogFrame size="compact" className="bt-ink-in" data-play-waiting="" role="status">
          <p className="bt-waiting-pulse" data-waiting role="status">
            {table.waitingFor}
          </p>
        </DialogFrame>
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
