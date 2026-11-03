"use client";

import type { BoardView } from "bloodtower-protocols";
import { joinWarning } from "../../lib/boardView";
import { JoinQr } from "../../lib/qr";
import {
  baseBoardSteps,
  CORNER_QR_SCREENS,
  claimCount,
  doorFrame,
  EMPTY_GAMES_LINE,
  joinFromBoard,
  publicLine,
  type SessionBoard,
  type StoryDoor,
  sessionBoard,
  settingRows,
  setupProgress,
  startupStatus,
  storyDoors,
  towerChoiceStatus,
  volumeLine,
  waitingFor,
} from "../../lib/startupBoard";
import { PortraitCard } from "../PortraitCard";
import { DialogFrame } from "./DialogFrame";
import { GearBoardPanel } from "./GearBoardPanel.tsx";

/** Join QR and the six-digit code. Display only: the iPad does the pressing. */
function JoinBlock({ code, url, large }: { code: string; url: string; large?: boolean }) {
  return (
    <div className="bt-startup-join" data-join-code={code}>
      <p className="bt-kicker">Join code</p>
      <div className={large ? "bt-qr bt-qr-lg" : "bt-qr"}>
        <JoinQr url={url} />
      </div>
      <p className="bt-join-code">{code}</p>
    </div>
  );
}

function SplashPanel({ view }: { view: BoardView }) {
  const join = joinFromBoard(view);
  return (
    <div data-startup-panel="splash">
      <p className="bt-kicker">Return to Dark Tower</p>
      <h1 className="bt-startup-title bt-flicker">Blood Tower</h1>
      {join ? (
        <>
          <p className="bt-startup-cue">The hall is open.</p>
          <JoinBlock code={join.code} url={join.url} />
          <p className="bt-startup-cue">
            Hunters play from an iPad. Open Join and enter this code.
          </p>
          <p className="bt-startup-cue">
            The tower is optional. Play on an iPad skips it. Connect tower stays on the iPad.
          </p>
        </>
      ) : (
        <p className="bt-startup-cue">
          The hall is opening. Packs and the table are still loading.
        </p>
      )}
    </div>
  );
}

function CoverPlate({ door }: { door: StoryDoor }) {
  return (
    <div className="bt-carousel-plate" aria-hidden="true">
      {door.cover ? (
        // biome-ignore lint/performance/noImgElement: pack cover is a static file the host serves
        <img className="bt-carousel-cover" alt="" src={door.cover} />
      ) : null}
    </div>
  );
}

function DoorFocus({ door }: { door: StoryDoor }) {
  return (
    <article
      className="bt-carousel-focus"
      data-story-focus={door.id}
      aria-current="true"
      data-playable={door.playable ? "true" : "false"}
    >
      <CoverPlate door={door} />
      <h2>{door.title}</h2>
      <p className="bt-carousel-tagline">{door.tagline}</p>
      {door.players ? <p className="bt-carousel-players">{door.players}</p> : null}
      {door.playable ? null : <p className="bt-carousel-players">Not playable yet</p>}
    </article>
  );
}

function DoorPeek({ door, side }: { door: StoryDoor; side: "previous" | "next" }) {
  return (
    <aside
      className="bt-carousel-peek"
      data-carousel-side={side}
      data-story-peek={door.id}
      data-playable={door.playable ? "true" : "false"}
    >
      <CoverPlate door={door} />
      <p>{door.title}</p>
    </aside>
  );
}

function VolumePanel({ line, live }: { line: string; live: boolean }) {
  const text = <p className="bt-startup-cue bt-volume-line">{line}</p>;
  return (
    <div data-startup-panel="volume" data-volume-live={live ? "true" : "false"}>
      {live ? (
        text
      ) : (
        <div className="bt-row--disabled" aria-disabled="true">
          {text}
        </div>
      )}
    </div>
  );
}

function PickStoryPanel({ view }: { view: BoardView }) {
  const volume = volumeLine(view);
  if (volume) return <VolumePanel line={volume.line} live={volume.live} />;
  const { focus, previous, next } = doorFrame(storyDoors(view));
  const wide = previous != null || next != null;
  return (
    <div data-startup-panel="pick-story">
      <p className="bt-kicker">Choose a door</p>
      <h1 className="bt-startup-title">Pick a story</h1>
      {focus ? (
        <div className={wide ? "bt-carousel" : "bt-door"}>
          {previous ? <DoorPeek door={previous} side="previous" /> : null}
          <DoorFocus door={focus} />
          {next ? <DoorPeek door={next} side="next" /> : null}
        </div>
      ) : (
        <p className="bt-startup-cue">No story is loaded yet.</p>
      )}
    </div>
  );
}

function TableJoinPanel({ view }: { view: BoardView }) {
  const join = joinFromBoard(view);
  return (
    <div data-startup-panel="table-join">
      <p className="bt-kicker">The table</p>
      <h1 className="bt-startup-title">Join the table</h1>
      {join ? (
        <>
          <JoinBlock code={join.code} url={join.url} large />
          <p className="bt-startup-cue">{publicLine(view)}</p>
        </>
      ) : (
        <p className="bt-startup-cue">
          The hall is opening. Packs and the table are still loading.
        </p>
      )}
    </div>
  );
}

function BaseBoardPanel({ view }: { view: BoardView }) {
  return (
    <div data-startup-panel="base-board">
      <p className="bt-kicker">On the table</p>
      <h1 className="bt-startup-title">Base board</h1>
      <ol className="bt-base-steps" data-base-steps="">
        {baseBoardSteps(view).map((line) => (
          <li key={line} className="bt-startup-cue">
            {line}
          </li>
        ))}
      </ol>
    </div>
  );
}

function TowerChoicePanel({ view }: { view: BoardView }) {
  const status = towerChoiceStatus(view);
  return (
    <div data-startup-panel="tower-choice">
      <p className="bt-kicker">Optional</p>
      <h1 className="bt-startup-title">The tower</h1>
      {/* biome-ignore lint/performance/noImgElement: landing painting already served as a static file */}
      <img className="bt-tower-still" src="/landing/hero.webp" alt="" />
      {status ? (
        <p className="bt-tower-status" role="status" data-tower-status="">
          {status}
        </p>
      ) : null}
      <p className="bt-startup-cue">{publicLine(view)}</p>
    </div>
  );
}

function TowerWakePanel({ view }: { view: BoardView }) {
  return (
    <div data-startup-panel="tower-wake">
      <p className="bt-kicker">Optional</p>
      <h1 className="bt-startup-title">The tower</h1>
      <p className="bt-startup-cue" data-tower-progress="">
        {publicLine(view)}
      </p>
      <div className="bt-progress" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}

function SettingsPanel({ view }: { view: BoardView }) {
  const rows = settingRows(view);
  return (
    <div data-startup-panel="game-settings">
      <p className="bt-kicker">Before the party</p>
      <h1 className="bt-startup-title">Game settings</h1>
      {rows.length === 0 ? (
        <p className="bt-startup-cue">This story has nothing to set. Confirm on an iPad.</p>
      ) : (
        <dl className="bt-settings">
          {rows.map((row) => (
            <div key={row.id} className="bt-setting" data-setting={row.id}>
              <dt>{row.label}</dt>
              <dd data-setting-value="">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function ClaimPanel({ view }: { view: BoardView }) {
  const join = joinFromBoard(view);
  return (
    <div data-startup-panel="claim-heroes">
      <p className="bt-kicker">The party</p>
      <h1 className="bt-startup-title">Party Join</h1>
      <p className="bt-startup-progress" data-claim-count="">
        {claimCount(view)}
      </p>
      {join ? <JoinBlock code={join.code} url={join.url} large /> : null}
      <ul className="bt-hunter-roster">
        {view.heroes.map((hero) => (
          <li key={hero.id} data-hero={hero.id} data-held={hero.held ? "true" : "false"}>
            <PortraitCard name={hero.name} label={hero.name} compact />
            <p className="bt-claim-state">{hero.held ? "Picked" : "Open"}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SetupPanel({ view }: { view: BoardView }) {
  const progress = setupProgress(view);
  return (
    <div data-startup-panel="setup">
      <p className="bt-kicker">On the table</p>
      <h1 className="bt-startup-title">Board setup</h1>
      <p className="bt-startup-progress" data-setup-progress="">
        {progress.label}
      </p>
      <p className="bt-startup-cue" data-setup-instruction="">
        {progress.instruction}
      </p>
      <p className="bt-startup-cue">
        Set the pieces on the table. This screen does not draw the board or mark the heroes.
      </p>
    </div>
  );
}

function BeginPanel() {
  return (
    <div data-startup-panel="begin">
      <p className="bt-kicker">Ready</p>
      <h1 className="bt-startup-title">Begin</h1>
      <p className="bt-startup-cue">The table is set.</p>
      <p className="bt-startup-cue">
        Figures stand on the board. This screen does not mark them. An iPad presses Begin.
      </p>
    </div>
  );
}

function NotPlayablePanel({ view }: { view: BoardView }) {
  const title = publicLine(view);
  return (
    <div data-startup-panel="not-playable">
      <h1 className="bt-startup-title">Not playable yet</h1>
      {title ? <p className="bt-startup-cue">{title}</p> : null}
    </div>
  );
}

function LinePanel({ kicker, title, line }: { kicker: string; title: string; line: string }) {
  return (
    <div data-startup-panel="line">
      <p className="bt-kicker">{kicker}</p>
      <h1 className="bt-startup-title">{title}</h1>
      {line ? <p className="bt-startup-cue">{line}</p> : null}
    </div>
  );
}

/** SCR-021 on the board: choices as plain lines, tonight's games, the tower's state. No buttons. */
function SessionRows({ session }: { session: SessionBoard }) {
  return (
    <ul className="bt-session-rows" data-session-rows="">
      {session.hasContinue ? <li data-session-row="continue">Continue</li> : null}
      <li data-session-row="new-game">New game</li>
      <li data-session-row="games-label" className="bt-session-label">
        Tonight's games
      </li>
      {session.games.length === 0 ? (
        <li data-session-row="empty">{EMPTY_GAMES_LINE}</li>
      ) : (
        session.games.map((game) => (
          <li key={game.label} data-session-row="game">
            {game.label} <span className="bt-quit-mark">{game.mark}</span>
          </li>
        ))
      )}
      <li data-session-row="done">Done for tonight</li>
      <li data-session-row="tower" className="bt-session-tower">
        {session.tower}
      </li>
    </ul>
  );
}

/** One game's stats (SCR-019, C2/07): the "Label: value" lines on the `game-stats` level. */
const gameStats = (
  view: BoardView,
): { title: string; rows: { label: string; value: string }[] } | null => {
  const level = view.levels.find((row) => row.id === "game-stats");
  if (!level) return null;
  const rows = level.shows.split("\n").flatMap((line) => {
    const at = line.indexOf(": ");
    return at > 0 ? [{ label: line.slice(0, at), value: line.slice(at + 2) }] : [];
  });
  return { title: level.label, rows };
};

function StatsPanel({ stats }: { stats: NonNullable<ReturnType<typeof gameStats>> }) {
  return (
    <div data-startup-panel="game-stats">
      <p className="bt-kicker">Tonight's games</p>
      <h1 className="bt-startup-title">{stats.title}</h1>
      <dl className="bt-stat-rows" data-stat-rows="">
        {stats.rows.map((row) => (
          <div key={row.label} className="bt-stat-row" data-stat-row={row.label}>
            <dt>{row.label}</dt>
            <dd data-stat-value="">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SessionPanel({ view }: { view: BoardView }) {
  const session = sessionBoard(view);
  const join = joinFromBoard(view);
  const stats = gameStats(view);
  if (session.dropped !== null && join) {
    return (
      <div data-startup-panel="session-dropped">
        <p className="bt-kicker">Between games</p>
        <h1 className="bt-startup-title">Join the table</h1>
        <JoinBlock code={join.code} url={join.url} large />
        <p className="bt-startup-cue">{session.dropped}</p>
      </div>
    );
  }
  if (session.confirm) {
    return (
      <div data-startup-panel="session-confirm">
        <h1 className="bt-startup-title">{session.confirm.title}</h1>
        {session.confirm.line.split("\n").map((line) => (
          <p key={line} className="bt-startup-cue">
            {line}
          </p>
        ))}
      </div>
    );
  }
  if (stats) return <StatsPanel stats={stats} />;
  return (
    <div data-startup-panel="session">
      <p className="bt-kicker">Between games</p>
      <h1 className="bt-startup-title">Session</h1>
      <SessionRows session={session} />
    </div>
  );
}

function StartupPanel({ view }: { view: BoardView }) {
  if (view.screen === "splash") return <SplashPanel view={view} />;
  if (view.screen === "pick-story") return <PickStoryPanel view={view} />;
  if (view.screen === "not-playable") return <NotPlayablePanel view={view} />;
  if (view.screen === "table-join") return <TableJoinPanel view={view} />;
  if (view.screen === "base-board") return <BaseBoardPanel view={view} />;
  if (view.screen === "tower-choice") return <TowerChoicePanel view={view} />;
  if (view.screen === "tower-wake") return <TowerWakePanel view={view} />;
  if (view.screen === "game-settings") return <SettingsPanel view={view} />;
  if (view.screen === "claim-heroes") return <ClaimPanel view={view} />;
  if (view.screen === "setup") return <SetupPanel view={view} />;
  if (view.screen === "begin") return <BeginPanel />;
  if (view.screen === "session") return <SessionPanel view={view} />;
  return <LinePanel kicker="The table" title="Blood Tower" line={publicLine(view)} />;
}

/** Centred startup dialog over the landing painting. No controls. */
const setupStepId = (view: BoardView): string | undefined => {
  if (view.screen !== "setup") return undefined;
  const promptId = view.actions.find((action) =>
    action.promptId.startsWith("continue-setup-"),
  )?.promptId;
  return promptId ? promptId.slice("continue-setup-".length) : undefined;
};

/** Done for tonight, confirmed: the landing painting alone. No dialog, no control (DEC-713, SCR-002). */
function SessionOverBoard({ view }: { view: BoardView }) {
  return (
    <main
      className="bt-board"
      data-board-mode="startup"
      data-board-layer="startup"
      data-screen={view.screen}
      data-paused="false"
      data-gear-opens={view.gear?.opens ?? 0}
      data-volume={view.gear?.volume ?? undefined}
    >
      <div className="bt-board-backdrop" aria-hidden="true" />
      {view.gear ? <GearBoardPanel gear={view.gear} /> : null}
    </main>
  );
}

export function StartupBoard({ view, debug }: { view: BoardView; debug?: boolean }) {
  if (view.screen === "session-over") return <SessionOverBoard view={view} />;
  const warning = joinWarning(view);
  const status = startupStatus(view);
  const waiting =
    view.screen === "session" && gameStats(view)
      ? "Waiting for an iPad to play again or go back."
      : waitingFor(view);
  const setupStep = setupStepId(view);
  const join = joinFromBoard(view);
  return (
    <main
      className="bt-board"
      data-board-mode="startup"
      data-board-layer="startup"
      data-screen={view.screen}
      data-setup-step={setupStep}
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
      {debug ? (
        <p className="bt-status-strip" data-status-strip>
          <span data-status="tower">{status.tower}</span>
          <span data-status="devices">{status.devices}</span>
          <span data-status="step">{status.step}</span>
        </p>
      ) : null}
      {join && CORNER_QR_SCREENS.has(view.screen) ? (
        <aside className="bt-join-corner" data-join-corner="" data-join-code={join.code}>
          <div className="bt-qr">
            <JoinQr url={join.url} />
          </div>
          <p className="bt-join-code">{join.code}</p>
        </aside>
      ) : null}
      {view.gear ? <GearBoardPanel gear={view.gear} /> : null}
      <div className="bt-startup-stage">
        <DialogFrame className="bt-ink-in" data-startup-dialog="">
          <StartupPanel view={view} />
        </DialogFrame>
        <p
          className="bt-next"
          data-next-prompt=""
          data-len={waiting.length > 80 ? "long" : waiting.length > 42 ? "mid" : undefined}
          role="status"
          aria-label="Waiting"
        >
          <b>{waiting}</b>
        </p>
      </div>
      {debug ? (
        <pre className="mt-4 max-h-64 overflow-auto text-xs opacity-70">
          {JSON.stringify(view, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
