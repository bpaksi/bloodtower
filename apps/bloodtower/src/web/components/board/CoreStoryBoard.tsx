"use client";

import { type BoardView, isOpeningMomentId } from "bloodtower-protocols";
import { Fragment } from "react";
import { joinWarning, pauseText } from "../../lib/boardView";
import { packStillImageUrl, placeStillFile } from "../../lib/packAsset";
import { claimCount, isStartupScreen } from "../../lib/startupBoard";
import { AssetIdLabel } from "./AssetIdLabel";
import { BuildingBoardPanel } from "./BuildingBoardPanel";
import { ChanceSpin } from "./ChanceSpin";
import {
  DayBandExtras,
  DayPanel,
  HeroCorruptionMarks,
  HeroCorruptions,
  ThreatBar,
} from "./DayPanels";
import { DialogFrame } from "./DialogFrame";
import { EventScene } from "./EventScene";
import { GearBoardPanel } from "./GearBoardPanel.tsx";
import { HintScroll } from "./HintScroll";
import { OpeningMoment } from "./OpeningMoment";
import { StartupBoard } from "./StartupBoard";
import { VirtuePanel } from "./VirtuePanel";

/** A hero's hit points on the edge band; unknown ones read unavailable, never zero. */
function BandHealth({
  name,
  hp,
}: {
  name: string;
  hp: { hp: number; max: number } | null | undefined;
}) {
  return hp ? (
    <span data-health={`${hp.hp}/${hp.max}`}>
      {name} {hp.hp}/{hp.max}
    </span>
  ) : (
    <span data-health="unavailable">{name} unavailable</span>
  );
}

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
  // The starting-purse step has its own panel (CU/15); every other startup screen is the dialog.
  if (view.screen === "setup" && view.chance)
    return <ChanceSpin view={view} chance={view.chance} />;
  if (isStartupScreen(view.screen)) return <StartupBoard view={view} debug={debug} />;

  const warning = joinWarning(view);
  const paused = pauseText(view.screen);
  // The pause for a lost tower says so; the screen line carries "Tower lost" (DEC-301).
  const towerLost = view.levels.at(-1)?.shows === "Tower lost";
  // A drop pause shows the pick count in place of the tower line (DEC-953); its screen line is it.
  const rePick = paused !== null && /^\d+ of \d+ picked$/.test(view.levels.at(-1)?.shows ?? "");
  const table = view.table ?? null;
  const place = view.place ?? null;
  const layer = place ? "place" : "move";
  const momentId =
    view.narration && isOpeningMomentId(view.narration.lineId) ? view.narration.lineId : null;
  const showMove = layer === "move" && !momentId;
  // The hint is the loop's first beat: a Scroll holds the step back; under art it is a caption.
  const hint = view.hint ?? null;
  const holding = hint !== null && !hint.caption;
  // An event scene replaces the day panels while it shows (C3/12); health and purse join the band.
  const event = showMove ? (table?.event ?? null) : null;
  const eventHero = (heroId: string) => event?.heroes.find((hero) => hero.heroId === heroId);
  return (
    <main
      className="bt-board"
      data-screen={view.screen}
      data-board-mode="play"
      data-board-layer={layer}
      data-moment={momentId ?? undefined}
      data-hint-hold={holding ? "true" : undefined}
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
          {towerLost ? (
            <p className="bt-label" data-tower-lost="">
              Tower lost
            </p>
          ) : null}
          {rePick ? (
            <p className="bt-startup-cue" data-pick-status={claimCount(view)}>
              {claimCount(view)}
            </p>
          ) : (
            <p className="bt-startup-cue">The tower has gone quiet. The game waits.</p>
          )}
        </DialogFrame>
      ) : null}
      {showMove && table ? (
        <header className="bt-band" id="band" data-band>
          {table.groups.map((group) => (
            <Fragment key={group.heroId}>
              <span data-hero-panel={group.heroId}>
                <BandHealth name={group.heroName} hp={eventHero(group.heroId)?.hp} />
                <HeroCorruptionMarks table={table} heroId={group.heroId} />
                <HeroCorruptions table={table} heroId={group.heroId} />
              </span>
              {/* The other present heroes of the acting group get their own panel while an event shows (EV-01). */}
              {eventHero(group.heroId)
                ? event?.heroes
                    .filter((hero) => !table.groups.some((other) => other.heroId === hero.heroId))
                    .map((hero) => (
                      <span key={hero.heroId} data-hero-panel={hero.heroId}>
                        <BandHealth name={hero.name} hp={hero.hp} />
                      </span>
                    ))
                : null}
            </Fragment>
          ))}
          {event && event.purse !== null ? (
            <span data-purse={event.purse}>{event.purse} gold</span>
          ) : (
            <span data-purse="unavailable">unavailable</span>
          )}
          <span data-chapter>{table.chapter}</span>
          <span data-day>Day {table.day}</span>
          <DayBandExtras table={table} />
          {table.actingGroup ? <span data-acting>{table.actingGroup}</span> : null}
          <span data-moves={table.movesLeft ?? "unavailable"}>
            {table.movesLeft == null ? "unavailable" : table.movesLeft}
          </span>
        </header>
      ) : null}
      {showMove && table ? <ThreatBar table={table} /> : null}
      {event && !paused && !holding ? <EventScene scene={event} /> : null}
      {showMove && table && !event && !paused && !holding ? <DayPanel table={table} /> : null}
      {showMove && table?.virtue && !event && !paused && !holding ? (
        <VirtuePanel table={table} />
      ) : null}
      {momentId && layer !== "place" ? <OpeningMoment momentId={momentId} /> : null}
      {showMove && table?.waitingFor && !table.virtue && !event && !paused && !holding ? (
        <DialogFrame size="compact" className="bt-ink-in" data-play-waiting="" role="status">
          <p className="bt-waiting-pulse" data-waiting role="status">
            {table.waitingFor}
          </p>
        </DialogFrame>
      ) : null}
      {layer === "place" && place ? (
        <figure className="bt-place-still" data-place={place.building} data-still={place.stillId}>
          {/* biome-ignore lint/performance/noImgElement: pack stills are static files on the session host */}
          <img src={packStillImageUrl(placeStillFile(place.stillId))} alt="" />
          <figcaption>{place.caption}</figcaption>
        </figure>
      ) : null}
      {layer === "place" && place ? <AssetIdLabel assetId={place.stillId} /> : null}
      {layer === "place" && table?.building && !paused ? (
        <BuildingBoardPanel table={table} />
      ) : null}
      {hint && !paused ? <HintScroll hint={hint} /> : null}
      {view.gear ? <GearBoardPanel gear={view.gear} /> : null}
      {debug ? (
        <pre className="mt-4 max-h-64 overflow-auto text-xs opacity-70">
          {JSON.stringify(view, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
