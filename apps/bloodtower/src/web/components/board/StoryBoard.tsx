import type { StoryboardState } from "bloodtower-protocols";
import { holdingText, joinWarning, pauseText } from "../../lib/boardView";
import { displayCaption } from "../../lib/caption.ts";
import { portraitSrc } from "../../lib/portrait.ts";
import { JoinQr } from "../../lib/qr";
import {
  claimedCount,
  currentStory,
  FORTUNE_LINE,
  focusedStory,
  joinedDeviceIds,
  partyJoinNextReason,
  playersText,
  SCREEN_NEXT,
  SCREEN_TITLE,
  towerStripState,
} from "../../lib/screens";
import { towerStatusLines } from "../../lib/towerStatus";
import { PortraitCard } from "../PortraitCard";
import { KeeperScene } from "./KeeperScene";
import { KEEPER_MOMENT_ID } from "./keeperLines";

/**
 * Display only for game controls. Holdings do not change here.
 * grey-stair.03 plays the Keeper; Tap to play appears only if the browser blocks autoplay.
 * Look: Illusionist R2 draft in docs/art-direction (game-look.md, tokens.css, mocks/story-board.html).
 */
export function StoryBoard({
  state,
  debug = false,
  onKeeperLineEnded,
}: {
  state: StoryboardState;
  debug?: boolean;
  onKeeperLineEnded?: (momentId: string, line: number) => void;
}) {
  const tower = towerStatusLines(state.tower);
  const paused = pauseText(state.pause, state.hunters);
  const warning = joinWarning(state.join);
  const header = headerCopy(state);
  const keeperMoment = state.screen === "play" && state.moment?.id === KEEPER_MOMENT_ID;
  return (
    <main
      className="bt-board"
      data-screen={state.screen}
      data-moment={state.moment?.id ?? ""}
      data-board-layout={keeperMoment ? "keeper" : "standard"}
    >
      <div className="bt-board-vignette" aria-hidden="true" />
      <header className="bt-board-header">
        <div className="bt-zone bt-panel">
          <div className="bt-num">{towerStripState(state.tower)}</div>
          <div className="bt-zone-copy">
            <span className="bt-lbl">Tower</span>
            <b>{tower.connection}</b>
          </div>
        </div>
        <div className="bt-board-title">
          <h1 className="bt-flicker">
            <small>{header.scene}</small>
            {header.place}
          </h1>
        </div>
        <div className="bt-zone bt-panel bt-join-zone">
          <span className="bt-lbl">Join</span>
          <p className="bt-num">{state.join ? state.join.code : "————"}</p>
        </div>
      </header>
      {debug ? (
        <p className="bt-tower-line">
          Tower {tower.connection}. Battery {tower.battery}. Calibration {tower.calibration}.
        </p>
      ) : null}
      {debug && state.screen !== "splash" ? <StatusStrip state={state} /> : null}
      {paused ? (
        <p className="bt-banner" role="status">
          {paused}
        </p>
      ) : null}
      {warning ? (
        <p className="bt-banner" role="alert">
          {warning}
        </p>
      ) : null}
      <div className="bt-board-main">
        <HunterList
          hunters={state.hunters}
          packId={state.packId}
          portraits={state.screen === "party-join"}
        />
        <section className="bt-story">
          {state.screen === "splash" ? <SplashPanel state={state} /> : null}
          {state.screen === "tower-connect" ? <TowerConnectPanel state={state} /> : null}
          {state.screen === "pick-story" ? <PickStoryPanel state={state} /> : null}
          {state.screen === "party-join" ? <PartyJoinPanel state={state} /> : null}
          {state.screen === "begin" ? <BeginPanel state={state} /> : null}
          {state.screen === "play" ? (
            <PlayPanel state={state} onKeeperLineEnded={onKeeperLineEnded} />
          ) : null}
          {state.screen === "quit" ? <QuitPanel /> : null}
          <NextPrompt label={nextPrompt(state)} />
        </section>
        <aside className="bt-pub bt-panel">
          <span className="bt-lbl">Table</span>
          <JoinBlock join={state.join} large={state.screen === "party-join"} />
        </aside>
      </div>
    </main>
  );
}

const nextPrompt = (state: StoryboardState): string => {
  if (state.screen === "splash") return SCREEN_NEXT.splash;
  if (state.screen === "quit") return SCREEN_NEXT.quit;
  if (state.screen === "pick-story") return state.prompt?.label ?? SCREEN_NEXT["pick-story"];
  if (state.screen === "party-join" && !state.prompt) {
    return (
      partyJoinNextReason(
        state.gate.unheld,
        new Map(state.hunters.map((hunter) => [hunter.id, hunter.name])),
      ) ?? SCREEN_NEXT["party-join"]
    );
  }
  return state.prompt ? state.prompt.label : "Waiting.";
};

const sceneCopy = (moment: NonNullable<StoryboardState["moment"]>) => {
  if (moment.id === KEEPER_MOMENT_ID) {
    return { kicker: "✠ The Grey Stair ✠", title: "The Keeper" };
  }
  if (moment.id.startsWith("grey-stair")) {
    return { kicker: "✠ The Grey Stair ✠", title: "A Grey Stair" };
  }
  if (moment.id.startsWith("proving-ground")) {
    return { kicker: "✠ The Proving Ground ✠", title: "The Hall" };
  }
  return { kicker: "✠ The Night ✠", title: "The Moment" };
};

/** Header: kicker is the scene, large title is the place (Illusionist mock). */
const headerCopy = (state: StoryboardState): { scene: string; place: string } => {
  if (state.moment) {
    if (state.moment.id === KEEPER_MOMENT_ID) {
      return { scene: "The Grey Stair", place: "The Keeper" };
    }
    if (state.moment.id.startsWith("grey-stair")) {
      return { scene: "The Grey Stair", place: "A Grey Stair" };
    }
    if (state.moment.id.startsWith("proving-ground")) {
      return { scene: "The Proving Ground", place: "The Hall" };
    }
    return { scene: "The Night", place: "The Moment" };
  }
  if (state.screen === "splash") return { scene: "Bloodtower", place: "The Table" };
  if (state.screen === "tower-connect") return { scene: "The Tower", place: "On the Table" };
  if (state.screen === "pick-story") return { scene: "The Door", place: "Choose a Story" };
  if (state.screen === "party-join") return { scene: "The Party", place: "Gather" };
  if (state.screen === "begin") return { scene: "The Night", place: "The Table is Set" };
  if (state.screen === "quit") return { scene: "The Table", place: "Paused" };
  return { scene: "The Night", place: "The Moment" };
};

const actingHunterId = (hunters: StoryboardState["hunters"]): string | null =>
  hunters.find((hunter) => hunter.holders.length > 0 && !hunter.disconnected)?.id ??
  hunters.find((hunter) => hunter.holders.length > 0)?.id ??
  null;

const StatusStrip = ({ state }: { state: StoryboardState }) => {
  const devices = joinedDeviceIds(state.hunters);
  return (
    <p className="bt-status" data-status-strip="">
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
  <section>
    {join ? (
      <div className={`bt-qr${large ? " bt-qr-lg" : ""}`}>
        <JoinQr url={join.url} />
      </div>
    ) : (
      <p className="bt-join-missing">Join code unavailable.</p>
    )}
    {join ? <p className="bt-join-url">{join.url}</p> : <p className="bt-join-code">unavailable</p>}
  </section>
);

const HunterList = ({
  hunters,
  packId,
  portraits = false,
}: {
  hunters: StoryboardState["hunters"];
  packId?: StoryboardState["packId"];
  portraits?: boolean;
}) => {
  const acting = actingHunterId(hunters);
  return (
    <aside className="bt-hunters">
      <h2 className="bt-roll-title">Hunters</h2>
      {hunters.length === 0 ? (
        <p className="bt-roll-empty">Hunters unavailable.</p>
      ) : (
        <ul className="bt-roll">
          {hunters.map((hunter) => {
            const away = hunter.holders.length === 0 || hunter.disconnected;
            const classes = ["bt-cart"];
            if (portraits) classes.push("bt-cart-portrait");
            if (hunter.id === acting) classes.push("bt-cart-act");
            if (away) classes.push("bt-cart-away");
            const accessibleLabel = `${hunter.name} — ${holdingText(hunter)}`;
            return (
              <li key={hunter.id} className={classes.join(" ")} data-hunter={hunter.id}>
                {portraits ? (
                  <>
                    <PortraitCard
                      compact
                      frameOnly
                      name={hunter.name}
                      src={portraitSrc(packId, hunter.portrait)}
                      accessibleLabel={accessibleLabel}
                    />
                    <span className="bt-cart-copy">
                      <span className="bt-cart-nm">{hunter.name}</span>
                      <span className="bt-cart-st">{holdingText(hunter)}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="bt-cart-ph" aria-hidden="true">
                      {hunter.name.slice(0, 1)}
                    </span>
                    <span className="bt-cart-copy">
                      <span className="bt-cart-nm">{hunter.name}</span>
                      <span className="bt-cart-st">{holdingText(hunter)}</span>
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
};

const NextPrompt = ({ label }: { label: string }) => (
  <div className="bt-next">
    <span className="bt-lbl">Next</span>
    <b>{label}</b>
  </div>
);

const MomentMeta = ({ moment }: { moment: NonNullable<StoryboardState["moment"]> }) => (
  <span
    className="bt-moment-meta"
    aria-hidden="true"
    data-still={moment.still ?? ""}
    data-fallback={moment.fallbackAudio ?? ""}
  />
);

const SplashPanel = ({ state }: { state: StoryboardState }) => (
  <article className="bt-page bt-parchment bt-ink-in" data-fortune="">
    <div>
      <p className="bt-kicker">Fortune</p>
      <h2>Bloodtower</h2>
      <p className="bt-narration">{FORTUNE_LINE}</p>
    </div>
    <p className="bt-lede">
      {state.join ? "Ready. Opening the tower step." : "Loading the table…"}
    </p>
  </article>
);

const TowerConnectPanel = ({ state }: { state: StoryboardState }) => (
  <article className="bt-page bt-parchment bt-ink-in">
    <div>
      <p className="bt-kicker">The tower</p>
      <h2>
        {state.tower.connection === "connected" ? "Tower is on the table." : "Wake the tower."}
      </h2>
      <p className="bt-muted">{SCREEN_NEXT["tower-connect"]}</p>
    </div>
  </article>
);

const PickStoryPanel = ({ state }: { state: StoryboardState }) => {
  const focus = focusedStory(state.stories);
  const players = focus ? playersText(focus.players) : null;
  return (
    <>
      <article className="bt-page bt-parchment bt-ink-in" data-story={focus?.id}>
        <div>
          <p className="bt-kicker">The door</p>
          <h2>{focus ? focus.title : "Stories unavailable."}</h2>
          {focus?.blurb ? <p className="bt-narration">{focus.blurb}</p> : null}
          {players ? <p className="bt-muted">{players}</p> : null}
          {focus && !focus.loadable ? <p className="bt-narration">Can't load</p> : null}
          <p className="bt-lede">{SCREEN_NEXT["pick-story"]}</p>
        </div>
      </article>
      {state.stories && state.stories.cards.length > 1 ? (
        <ul className="bt-muted" aria-label="Stories">
          {state.stories.cards.map((card) => (
            <li
              key={card.id}
              data-story-door={card.id}
              aria-current={card.id === state.stories?.focus ? "true" : undefined}
            >
              {card.id === state.stories?.focus ? "› " : ""}
              {card.title}
              {card.loadable ? "" : " (can't load)"}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
};

const PartyJoinPanel = ({ state }: { state: StoryboardState }) => {
  const claimed = claimedCount(state.hunters);
  const total = state.hunters.length;
  return (
    <article className="bt-page bt-parchment bt-ink-in">
      <div>
        <p className="bt-kicker">The party</p>
        <h2>Gather the hunters</h2>
        <p className="bt-claimed">
          {total === 0 ? "Hunters unavailable." : `${claimed} of ${total} hunters claimed`}
        </p>
      </div>
    </article>
  );
};

const BeginPanel = ({ state }: { state: StoryboardState }) => (
  <article className="bt-page bt-parchment bt-ink-in">
    <div>
      <p className="bt-kicker">{currentStory(state.stories)?.title ?? "The story"}</p>
      <h2>The table is set</h2>
      <p className="bt-narration">The table is set. Any iPad can begin.</p>
      <p className="bt-muted">{SCREEN_NEXT.begin}</p>
    </div>
  </article>
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
      <article className="bt-page bt-parchment bt-ink-in bt-page-keeper" data-keeper-stage="">
        <KeeperScene
          keeperLine={state.keeperLine ?? 0}
          onLineEnded={(line) => onKeeperLineEnded?.(KEEPER_MOMENT_ID, line)}
        />
      </article>
    );
  }
  if (!state.moment) {
    return (
      <article className="bt-page bt-parchment">
        <p className="bt-narration">Moment unavailable.</p>
      </article>
    );
  }
  const scene = sceneCopy(state.moment);
  const text = state.moment.text == null ? "Text unavailable." : displayCaption(state.moment.text);
  return (
    <article className="bt-page bt-parchment bt-ink-in">
      <MomentMeta moment={state.moment} />
      <div>
        <p className="bt-kicker">{scene.kicker}</p>
        <h2>{scene.title}</h2>
        <p className="bt-narration">{text}</p>
      </div>
    </article>
  );
};

const QuitPanel = () => (
  <article className="bt-page bt-parchment bt-ink-in">
    <div>
      <p className="bt-kicker">The table</p>
      <h2>The story pauses here.</h2>
      <p className="bt-muted">{SCREEN_NEXT.quit}</p>
    </div>
  </article>
);
