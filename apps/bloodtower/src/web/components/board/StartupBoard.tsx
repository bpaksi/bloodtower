"use client";

import type { BoardView } from "bloodtower-protocols";
import { joinWarning } from "../../lib/boardView";
import { JoinQr } from "../../lib/qr";
import {
  claimCount,
  doorFrame,
  hallOpening,
  joinFromBoard,
  publicLine,
  type StoryDoor,
  settingRows,
  setupProgress,
  startupStatus,
  storyDoors,
  waitingFor,
} from "../../lib/startupBoard";
import { GoodbyeTeardown } from "../GoodbyeTeardown";
import { PortraitCard } from "../PortraitCard";
import { DialogFrame } from "./DialogFrame";

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

function PickStoryPanel({ view }: { view: BoardView }) {
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

function TowerPanel({ view }: { view: BoardView }) {
  const join = joinFromBoard(view);
  const line = publicLine(view) || "No tower yet. An iPad can connect it, or play on without it.";
  return (
    <div data-startup-panel="tower-connect">
      <p className="bt-kicker">Optional</p>
      <h1 className="bt-startup-title">Connect the tower</h1>
      {/* biome-ignore lint/performance/noImgElement: landing painting already served as a static file */}
      <img className="bt-tower-still" src="/landing/hero.webp" alt="" />
      <p className="bt-startup-cue">{line}</p>
      {join ? <JoinBlock code={join.code} url={join.url} /> : null}
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

function StartupPanel({ view }: { view: BoardView }) {
  if (view.screen === "splash" || hallOpening(view)) return <SplashPanel view={view} />;
  if (view.screen === "pick-story") return <PickStoryPanel view={view} />;
  if (view.screen === "not-playable") return <NotPlayablePanel view={view} />;
  if (view.screen === "tower-connect") return <TowerPanel view={view} />;
  if (view.screen === "game-settings") return <SettingsPanel view={view} />;
  if (view.screen === "claim-heroes") return <ClaimPanel view={view} />;
  if (view.screen === "setup") return <SetupPanel view={view} />;
  if (view.screen === "begin") return <BeginPanel />;
  if (view.screen === "session") {
    return <LinePanel kicker="Between games" title="Session" line={publicLine(view)} />;
  }
  if (view.screen === "goodbye") {
    return (
      <div data-startup-panel="goodbye">
        <p className="bt-kicker">Tonight</p>
        <h1 className="bt-startup-title">Goodbye</h1>
        <GoodbyeTeardown shows={publicLine(view)} />
      </div>
    );
  }
  return <LinePanel kicker="The table" title="Pick a game" line={publicLine(view)} />;
}

/** Centred startup dialog over the landing painting. No controls. */
const setupStepId = (view: BoardView): string | undefined => {
  if (view.screen !== "setup") return undefined;
  const promptId = view.actions.find((action) =>
    action.promptId.startsWith("continue-setup-"),
  )?.promptId;
  return promptId ? promptId.slice("continue-setup-".length) : undefined;
};

export function StartupBoard({ view, debug }: { view: BoardView; debug?: boolean }) {
  const warning = joinWarning(view);
  const status = startupStatus(view);
  const waiting = waitingFor(view);
  const setupStep = setupStepId(view);
  return (
    <main
      className="bt-board"
      data-board-mode="startup"
      data-board-layer="startup"
      data-screen={view.screen}
      data-setup-step={setupStep}
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
