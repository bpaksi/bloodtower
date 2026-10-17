import type { StoryboardState } from "bloodtower-protocols";
import { holdingText, joinWarning, pauseText } from "../../lib/boardView";
import { displayCaption } from "../../lib/caption.ts";
import { portraitSrc } from "../../lib/portrait.ts";
import { JoinQr } from "../../lib/qr";
import {
  claimedCount,
  FORTUNE_LINE,
  joinedDeviceIds,
  partyJoinNextReason,
  SCREEN_NEXT,
  SCREEN_TITLE,
  TABLE_STORY,
  towerStripState,
} from "../../lib/screens";
import { towerStatusLines } from "../../lib/towerStatus";
import { PortraitCard } from "../PortraitCard";
import { KeeperScene } from "./KeeperScene";
import { KEEPER_MOMENT_ID } from "./keeperLines";

/**
 * Display only for game controls. Holdings do not change here.
 * grey-stair.03 plays the Keeper; Tap to play appears only if the browser blocks autoplay.
 */
export function StoryBoard({
  state,
  onKeeperLineEnded,
}: {
  state: StoryboardState;
  onKeeperLineEnded?: (momentId: string, line: number) => void;
}) {
  const tower = towerStatusLines(state.tower);
  const paused = pauseText(state.pause, state.hunters);
  const warning = joinWarning(state.join);
  const keeperMoment = state.screen === "play" && state.moment?.id === KEEPER_MOMENT_ID;
  return (
    <main
      className={
        keeperMoment
          ? "mx-auto flex h-dvh max-w-5xl flex-col gap-3 overflow-hidden px-6 py-3"
          : "mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-8 py-10"
      }
      data-screen={state.screen}
      data-board-layout={keeperMoment ? "keeper" : "standard"}
    >
      <header className="flex shrink-0 items-end justify-between gap-6">
        <h1 className={keeperMoment ? "text-2xl" : "text-4xl"}>Story board</h1>
        {keeperMoment ? null : (
          <p className="text-right leading-relaxed">
            Tower {tower.connection}. Battery {tower.battery}. Calibration {tower.calibration}.
          </p>
        )}
      </header>
      {state.screen !== "splash" ? <StatusStrip state={state} /> : null}
      {paused ? (
        <p
          className={`shrink-0 bg-stone-800 px-4 py-3 ${keeperMoment ? "text-lg" : "text-2xl"}`}
          role="status"
        >
          {paused}
        </p>
      ) : null}
      {warning ? (
        <p
          className={`shrink-0 bg-stone-800 px-4 py-3 ${keeperMoment ? "text-lg" : "text-2xl"}`}
          role="alert"
        >
          {warning}
        </p>
      ) : null}
      {state.screen === "splash" ? <SplashPanel state={state} /> : null}
      {state.screen === "tower-connect" ? <TowerConnectPanel state={state} /> : null}
      {state.screen === "pick-story" ? <PickStoryPanel state={state} /> : null}
      {state.screen === "party-join" ? <PartyJoinPanel state={state} /> : null}
      {state.screen === "begin" ? <BeginPanel state={state} /> : null}
      {state.screen === "play" ? (
        <PlayPanel state={state} onKeeperLineEnded={onKeeperLineEnded} />
      ) : null}
      {state.screen === "quit" ? <QuitPanel /> : null}
    </main>
  );
}

const StatusStrip = ({ state }: { state: StoryboardState }) => {
  const devices = joinedDeviceIds(state.hunters);
  return (
    <p className="bt-status shrink-0" data-status-strip="">
      <span data-status="tower">
        State <strong>{towerStripState(state.tower)}</strong>
      </span>
      <span data-status="devices">
        Devices <strong>{devices.length === 0 ? "none yet" : devices.join(", ")}</strong>
      </span>
      <span data-status="step">
        Step <strong>{SCREEN_TITLE[state.screen]}</strong>
      </span>
    </p>
  );
};

const JoinBlock = ({ join, large }: { join: StoryboardState["join"]; large?: boolean }) => (
  <section className={`flex items-center gap-8 ${large ? "flex-wrap" : ""}`}>
    {join ? (
      <div className={`${large ? "h-64 w-64" : "h-40 w-40"} bg-stone-100 p-2 text-stone-950`}>
        <JoinQr url={join.url} />
      </div>
    ) : (
      <p>Join code unavailable.</p>
    )}
    <div className="space-y-2">
      <p className={`${large ? "text-6xl" : "text-5xl"} tracking-widest`}>
        {join ? join.code : "unavailable"}
      </p>
      {join ? <p className="break-all text-lg text-[var(--bt-muted)]">{join.url}</p> : null}
    </div>
  </section>
);

const HunterList = ({ hunters }: { hunters: StoryboardState["hunters"] }) => (
  <section>
    <h2 className="text-sm uppercase tracking-wide">Hunters</h2>
    {hunters.length === 0 ? (
      <p>Hunters unavailable.</p>
    ) : (
      <ul className="mt-2 space-y-1 text-xl">
        {hunters.map((hunter) => (
          <li key={hunter.id}>
            {hunter.name} — {holdingText(hunter)}
          </li>
        ))}
      </ul>
    )}
  </section>
);

const PartyPortraits = ({
  hunters,
  packId,
}: {
  hunters: StoryboardState["hunters"];
  packId: StoryboardState["packId"];
}) =>
  hunters.length === 0 ? (
    <HunterList hunters={hunters} />
  ) : (
    <ul className="grid grid-cols-4 gap-3">
      {hunters.map((hunter) => (
        <li key={hunter.id} className="bt-card min-w-0 !px-3 !py-2">
          <PortraitCard
            compact
            name={hunter.name}
            src={portraitSrc(packId, hunter.portrait)}
            label={`${hunter.name} — ${holdingText(hunter)}`}
          />
        </li>
      ))}
    </ul>
  );

const SplashPanel = ({ state }: { state: StoryboardState }) => (
  <>
    <p className="text-6xl leading-tight">Bloodtower</p>
    <article className="bt-card max-w-xl text-2xl leading-relaxed" data-fortune="">
      <p className="bt-kicker">Fortune</p>
      <p className="mt-2">{FORTUNE_LINE}</p>
    </article>
    <p className="text-xl text-[var(--bt-muted)]">
      {state.join ? "Ready. Opening the tower step." : "Loading the table…"}
    </p>
    <JoinBlock join={state.join} />
    <HunterList hunters={state.hunters} />
    <p className="text-2xl">{SCREEN_NEXT.splash}</p>
  </>
);

const TowerConnectPanel = ({ state }: { state: StoryboardState }) => (
  <>
    <article className="bt-card space-y-3 text-2xl">
      <p className="bt-kicker">The tower</p>
      <p className="text-4xl">
        {state.tower.connection === "connected" ? "Tower is on the table." : "Wake the tower."}
      </p>
      <p className="text-[var(--bt-muted)]">{SCREEN_NEXT["tower-connect"]}</p>
    </article>
    <JoinBlock join={state.join} />
    <HunterList hunters={state.hunters} />
    <p className="text-5xl leading-tight">{state.prompt ? state.prompt.label : "Waiting."}</p>
  </>
);

const PickStoryPanel = ({ state }: { state: StoryboardState }) => (
  <>
    <article className="bt-card max-w-2xl space-y-3">
      <p className="bt-kicker">The door</p>
      <h2 className="text-5xl">{TABLE_STORY.title}</h2>
      <p className="text-2xl leading-relaxed">{TABLE_STORY.blurb}</p>
      <p className="text-xl text-[var(--bt-muted)]">{TABLE_STORY.players}</p>
      <p className="text-3xl">{SCREEN_NEXT["pick-story"]}</p>
    </article>
    <JoinBlock join={state.join} />
  </>
);

const PartyJoinPanel = ({ state }: { state: StoryboardState }) => {
  const claimed = claimedCount(state.hunters);
  const total = state.hunters.length;
  return (
    <>
      <p className="text-2xl">
        {total === 0 ? "Hunters unavailable." : `${claimed} of ${total} hunters claimed`}
      </p>
      <JoinBlock join={state.join} large />
      <PartyPortraits hunters={state.hunters} packId={state.packId} />
      <p className="text-5xl leading-tight">
        {state.prompt
          ? state.prompt.label
          : (partyJoinNextReason(
              state.gate.unheld,
              new Map(state.hunters.map((hunter) => [hunter.id, hunter.name])),
            ) ?? SCREEN_NEXT["party-join"])}
      </p>
    </>
  );
};

const BeginPanel = ({ state }: { state: StoryboardState }) => (
  <>
    <article className="bt-card space-y-3 text-2xl">
      <p className="bt-kicker">{TABLE_STORY.title}</p>
      <p>The table is set. Any iPad can begin.</p>
      <p className="text-[var(--bt-muted)]">{SCREEN_NEXT.begin}</p>
    </article>
    <JoinBlock join={state.join} />
    <HunterList hunters={state.hunters} />
    <p className="text-5xl leading-tight">{state.prompt ? state.prompt.label : "Waiting."}</p>
  </>
);

const PlayPanel = ({
  state,
  onKeeperLineEnded,
}: {
  state: StoryboardState;
  onKeeperLineEnded?: (momentId: string, line: number) => void;
}) => {
  if (state.moment?.id === KEEPER_MOMENT_ID) {
    return (
      <section className="bt-keeper-stage" data-keeper-stage="">
        <KeeperScene
          keeperLine={state.keeperLine ?? 0}
          onLineEnded={(line) => onKeeperLineEnded?.(KEEPER_MOMENT_ID, line)}
        />
      </section>
    );
  }
  return (
    <>
      <JoinBlock join={state.join} />
      <HunterList hunters={state.hunters} />
      <p className="text-5xl leading-tight">{state.prompt ? state.prompt.label : "Waiting."}</p>
      <section className="max-w-3xl text-2xl leading-relaxed">
        {state.moment ? (
          <p data-still={state.moment.still ?? ""} data-fallback={state.moment.fallbackAudio ?? ""}>
            {state.moment.text == null ? "Text unavailable." : displayCaption(state.moment.text)}
          </p>
        ) : (
          <p>Moment unavailable.</p>
        )}
      </section>
    </>
  );
};

const QuitPanel = () => (
  <article className="bt-card max-w-2xl space-y-3 text-2xl">
    <p>The story pauses here.</p>
    <p className="text-[var(--bt-muted)]">{SCREEN_NEXT.quit}</p>
  </article>
);
