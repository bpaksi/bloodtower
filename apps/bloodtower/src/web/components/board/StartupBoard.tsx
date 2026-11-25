"use client";

import type { BoardView, PieceCheckView } from "bloodtower-protocols";
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
import { DialogFrame } from "./DialogFrame";
import { GameStats } from "./GameStats.tsx";
import { GearBoardPanel } from "./GearBoardPanel.tsx";
import { HeroCard } from "./HeroCard";

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
          <HeroCard key={hero.id} hero={hero} />
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

/** One game's stats (SCR-019, C3/17): the `game-stats` level, painted by `GameStats`. */
const gameStats = (view: BoardView): { label: string; shows: string } | null =>
  view.levels.find((row) => row.id === "game-stats") ?? null;

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
  if (stats) return <GameStats label={stats.label} shows={stats.shows} />;
  return (
    <div data-startup-panel="session">
      <p className="bt-kicker">Between games</p>
      <h1 className="bt-startup-title">Session</h1>
      <SessionRows session={session} />
    </div>
  );
}

const KINGDOM_POINT: Record<"N" | "E" | "S" | "W", { x: number; y: number }> = {
  N: { x: 140, y: 42 },
  E: { x: 238, y: 110 },
  S: { x: 140, y: 178 },
  W: { x: 42, y: 110 },
};

function PieceCheckTowerMark() {
  return (
    <div className="bt-tower-band" role="img" aria-label="The Tower">
      <svg viewBox="0 0 30 40" width="45" height="60" aria-hidden="true">
        <path d="M15 1 L18 10 L12 10 Z" fill="#2a2420" stroke="#c9a85a" strokeWidth="0.8" />
        <circle cx="15" cy="6.5" r="1.3" fill="#d4543a" />
        <path d="M10 13 L20 13 L22 37 L8 37 Z" fill="#1f1b18" stroke="#c9a85a" strokeWidth="0.9" />
        <rect x="14.2" y="17" width="1.6" height="4" rx="0.8" fill="#d4543a" />
        <rect x="12.4" y="25" width="1.4" height="3.2" rx="0.7" fill="#8a1e14" />
        <rect x="16.2" y="25" width="1.4" height="3.2" rx="0.7" fill="#8a1e14" />
        <path
          d="M13 37 v-4 a2 2 0 0 1 4 0 v4 Z"
          fill="#0e0c0a"
          stroke="#c9a85a"
          strokeWidth="0.6"
        />
        <line x1="4" y1="37.5" x2="26" y2="37.5" stroke="#c9a85a" strokeWidth="0.8" />
      </svg>
    </div>
  );
}

function UnconfirmedBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="bt-badge bt-badge--outline"
      role="status"
      data-unconfirmed-badge=""
      data-unconfirmed-count={count}
      aria-label={`${count} unconfirmed`}
    >
      <svg className="bt-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <circle cx="8" cy="8" r="6.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="4.6" r="0.9" fill="currentColor" />
        <rect x="7.3" y="6.8" width="1.4" height="4.8" rx="0.6" fill="currentColor" />
      </svg>{" "}
      {count}
    </span>
  );
}

/** SVG board diagram for each piece-check step (SCR-011, EV-09, EV-16, EV-22). Display only. */
function PieceCheckDiagram({ pieceCheck }: { pieceCheck: PieceCheckView }) {
  if (pieceCheck.stepId === "drums" && pieceCheck.drums) {
    const { rows } = pieceCheck.drums;
    return (
      <svg
        className="bt-piece-check-diagram"
        data-piece-check-diagram="drums"
        viewBox="0 0 360 170"
        role="img"
        aria-label="Expected glyphs per drum side"
      >
        <rect
          x="4"
          y="4"
          width="352"
          height="162"
          rx="8"
          fill="rgba(26,20,16,0.08)"
          stroke="#c9a85a"
          strokeWidth="1.2"
        />
        <text x="16" y="24" fontSize="11" fontWeight="700" fill="#5a4a30">
          DRUM
        </text>
        {(["N", "E", "S", "W"] as const).map((dir, i) => (
          <text
            key={dir}
            x={112 + i * 64}
            y="24"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
            fill="#5a4a30"
          >
            {dir}
          </text>
        ))}
        {rows.map((row, rowIdx) => {
          const y = 52 + rowIdx * 42;
          return (
            <g key={row.level}>
              <line x1="12" y1={y - 18} x2="348" y2={y - 18} stroke="rgba(90,74,48,0.22)" />
              <text x="16" y={y + 4} fontSize="12" fontWeight="700" fill="#2a2420">
                {row.level.toUpperCase()}
              </text>
              <text x="16" y={y + 18} fontSize="10" fill="#6b5739">
                {row.side}
              </text>
              {row.faces.map((face, faceIdx) => (
                <g key={face.side}>
                  <rect
                    x={84 + faceIdx * 64}
                    y={y - 12}
                    width="56"
                    height="28"
                    rx="4"
                    fill={face.glyph ? "rgba(201,168,90,0.28)" : "rgba(42,36,32,0.06)"}
                    stroke={face.glyph ? "#8a6828" : "rgba(90,74,48,0.25)"}
                    strokeWidth="1"
                  />
                  <text
                    x={112 + faceIdx * 64}
                    y={y + 6}
                    fontSize="10"
                    fontWeight={face.glyph ? "700" : "400"}
                    textAnchor="middle"
                    fill={face.glyph ? "#2a2420" : "#8a7a60"}
                  >
                    {face.glyph ?? "—"}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    );
  }

  if (pieceCheck.stepId === "trapped-skulls") {
    const count = pieceCheck.trappedSkulls ?? 0;
    return (
      <svg
        className="bt-piece-check-diagram"
        data-piece-check-diagram="trapped-skulls"
        viewBox="0 0 280 180"
        role="img"
        aria-label={`Drop ${count} skulls in the top of the tower`}
      >
        <path
          d="M112 72 L168 72 L180 166 L100 166 Z"
          fill="#1f1b18"
          stroke="#c9a85a"
          strokeWidth="2"
        />
        <ellipse
          cx="140"
          cy="72"
          rx="28"
          ry="8"
          fill="#0e0c0a"
          stroke="#c9a85a"
          strokeWidth="1.5"
        />
        <path
          d="M140 24 L140 58 M132 50 L140 60 L148 50"
          stroke="#8a1e14"
          strokeWidth="3"
          fill="none"
        />
        <circle cx="140" cy="118" r="22" fill="#8a1e14" stroke="#e8dcc0" strokeWidth="2" />
        <text x="140" y="125" fontSize="20" fontWeight="700" textAnchor="middle" fill="#f7eed9">
          {count}
        </text>
      </svg>
    );
  }

  if (pieceCheck.stepId === "broken-seals") {
    const seals = pieceCheck.seals ?? [];
    return (
      <svg
        className="bt-piece-check-diagram"
        data-piece-check-diagram="broken-seals"
        viewBox="0 0 280 180"
        role="img"
        aria-label="Broken seals on the tower"
      >
        <path
          d="M108 26 L172 26 L186 164 L94 164 Z"
          fill="#1f1b18"
          stroke="#c9a85a"
          strokeWidth="2"
        />
        {seals.slice(0, 6).map((seal, i) => {
          const y = 48 + i * 20;
          return (
            <g key={seal.id}>
              <rect
                x="114"
                y={y - 10}
                width="52"
                height="14"
                rx="3"
                fill="#8a1e14"
                stroke="#e8dcc0"
                strokeWidth="1"
              />
              <text x="140" y={y} fontSize="8" fontWeight="700" textAnchor="middle" fill="#f7eed9">
                {seal.name.slice(0, 12)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // Board-based diagram for hero-minis, skulls, foes, and quest-tokens.
  return (
    <svg
      className="bt-piece-check-diagram"
      data-piece-check-diagram={pieceCheck.stepId}
      viewBox="0 0 280 220"
      role="img"
      aria-label={`Board diagram for ${pieceCheck.stepId}`}
    >
      <circle
        cx="140"
        cy="110"
        r="96"
        fill="rgba(201,168,90,0.14)"
        stroke="#8a6828"
        strokeWidth="2"
      />
      <line x1="140" y1="14" x2="140" y2="206" stroke="rgba(90,74,48,0.3)" strokeDasharray="4 4" />
      <line x1="44" y1="110" x2="236" y2="110" stroke="rgba(90,74,48,0.3)" strokeDasharray="4 4" />
      <circle cx="140" cy="110" r="22" fill="#1f1b18" stroke="#c9a85a" strokeWidth="1.8" />
      <text x="140" y="114" fontSize="9" fontWeight="700" textAnchor="middle" fill="#e8dcc0">
        TOWER
      </text>
      {(["N", "E", "S", "W"] as const).map((k) => {
        const pt = KINGDOM_POINT[k];
        return (
          <text
            key={k}
            x={pt.x}
            y={pt.y - 14}
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            fill="#6b5739"
          >
            {k}
          </text>
        );
      })}
      {pieceCheck.stepId === "hero-minis"
        ? (pieceCheck.heroes ?? []).map((hero, index) => {
            const pt = KINGDOM_POINT[hero.kingdom];
            const offset = (index % 2 === 0 ? -1 : 1) * Math.floor(index / 2) * 18;
            return (
              <g key={hero.heroId}>
                <circle
                  cx={pt.x + offset}
                  cy={pt.y + 6}
                  r="11"
                  fill="#2a2420"
                  stroke="#c9a85a"
                  strokeWidth="1.5"
                />
                <text
                  x={pt.x + offset}
                  y={pt.y + 10}
                  fontSize="9"
                  fontWeight="700"
                  textAnchor="middle"
                  fill="#f7eed9"
                >
                  {hero.heroName.slice(0, 2).toUpperCase()}
                </text>
              </g>
            );
          })
        : null}
      {pieceCheck.stepId === "skulls"
        ? (pieceCheck.buildings ?? []).map((b, index) => {
            const pt = KINGDOM_POINT[b.kingdom];
            const offset = (index - 1) * 16;
            return (
              <g key={b.spaceId}>
                <circle
                  cx={pt.x + offset}
                  cy={pt.y + 8}
                  r="11"
                  fill="#8a1e14"
                  stroke="#e8dcc0"
                  strokeWidth="1.4"
                />
                <text
                  x={pt.x + offset}
                  y={pt.y + 12}
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="middle"
                  fill="#f7eed9"
                >
                  {b.skulls}
                </text>
              </g>
            );
          })
        : null}
      {pieceCheck.stepId === "foes"
        ? (pieceCheck.foes ?? []).map((foe, index) => {
            const angle = (index / Math.max(1, (pieceCheck.foes ?? []).length)) * Math.PI * 2;
            const x = 140 + Math.cos(angle) * 62;
            const y = 110 + Math.sin(angle) * 62;
            return (
              <g key={foe.id}>
                <polygon
                  points={`${x},${y - 12} ${x + 11},${y + 10} ${x - 11},${y + 10}`}
                  fill="#8a1e14"
                  stroke="#e8dcc0"
                  strokeWidth="1.4"
                />
              </g>
            );
          })
        : null}
      {pieceCheck.stepId === "quest-tokens"
        ? (pieceCheck.questTokens ?? []).map((token, index) => {
            const pt = KINGDOM_POINT[token.kingdom];
            const offset = (index % 2 === 0 ? -1 : 1) * Math.floor(index / 2) * 18;
            return (
              <g key={token.spaceId}>
                <rect
                  x={pt.x + offset - 10}
                  y={pt.y - 4}
                  width="20"
                  height="20"
                  rx="4"
                  fill="#c9a85a"
                  stroke="#2a2420"
                  strokeWidth="1.4"
                />
                <text
                  x={pt.x + offset}
                  y={pt.y + 10}
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="middle"
                  fill="#1f1b18"
                >
                  Q
                </text>
              </g>
            );
          })
        : null}
    </svg>
  );
}

function PieceCheckPanel({ pieceCheck }: { pieceCheck: PieceCheckView }) {
  return (
    <div
      className="bt-piece-check"
      data-startup-panel="piece-check"
      data-piece-check-step={pieceCheck.stepId}
      data-piece-check-number={pieceCheck.stepNumber}
    >
      <div className="bt-piece-check-head">
        <PieceCheckTowerMark />
        <UnconfirmedBadge count={pieceCheck.skippedCount} />
      </div>
      {pieceCheck.title ? (
        <h1 className="bt-startup-title bt-title" data-piece-check-title="">
          {pieceCheck.title}
        </h1>
      ) : null}
      <PieceCheckDiagram pieceCheck={pieceCheck} />
      {pieceCheck.stepId === "hero-minis" && pieceCheck.heroes ? (
        <ul className="bt-piece-check-list" data-piece-check-items="">
          {pieceCheck.heroes.map((hero) => (
            <li key={hero.heroId} data-hero-space={hero.spaceId}>
              {hero.heroName}: {hero.spaceName} ({hero.spaceId})
            </li>
          ))}
        </ul>
      ) : null}
      {pieceCheck.stepId === "skulls" && pieceCheck.buildings ? (
        <ul className="bt-piece-check-list" data-piece-check-items="">
          {pieceCheck.buildings.length === 0 ? (
            <li>No skulls on buildings.</li>
          ) : (
            pieceCheck.buildings.map((b) => (
              <li key={b.spaceId} data-building-skulls={`${b.spaceId}:${b.skulls}`}>
                {b.name}: {b.skulls}
              </li>
            ))
          )}
        </ul>
      ) : null}
      {pieceCheck.stepId === "foes" && pieceCheck.foes ? (
        <ul className="bt-piece-check-list" data-piece-check-items="">
          {pieceCheck.foes.map((foe) => (
            <li key={foe.id} data-foe-space={foe.spaceId}>
              {foe.name}: {foe.spaceName} ({foe.spaceId})
            </li>
          ))}
        </ul>
      ) : null}
      {pieceCheck.stepId === "broken-seals" && pieceCheck.seals ? (
        <ul className="bt-piece-check-list" data-piece-check-items="">
          {pieceCheck.seals.map((seal) => (
            <li key={seal.id} data-broken-seal={seal.id}>
              {seal.name}
            </li>
          ))}
        </ul>
      ) : null}
      {pieceCheck.stepId === "quest-tokens" && pieceCheck.questTokens ? (
        <ul className="bt-piece-check-list" data-piece-check-items="">
          {pieceCheck.questTokens.map((token) => (
            <li key={token.spaceId} data-quest-token={token.spaceId}>
              {token.spaceName} ({token.spaceId})
            </li>
          ))}
        </ul>
      ) : null}
      {pieceCheck.line ? (
        <p className="bt-startup-cue bt-piece-check-line" data-piece-check-line="">
          {pieceCheck.line}
        </p>
      ) : null}
    </div>
  );
}

function StartupPanel({ view }: { view: BoardView }) {
  if (view.screen === "piece-check" && view.pieceCheck) {
    return <PieceCheckPanel pieceCheck={view.pieceCheck} />;
  }
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
      data-piece-check-step={view.pieceCheck?.stepId ?? undefined}
      data-piece-check-number={view.pieceCheck?.stepNumber ?? undefined}
      data-unconfirmed-count={view.pieceCheck?.skippedCount ?? undefined}
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
