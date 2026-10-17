import type { StoryboardState } from "bloodtower-protocols";
import { holdingText, joinWarning, pauseText } from "../../lib/boardView";
import { displayCaption } from "../../lib/caption.ts";
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
import { KeeperScene } from "./KeeperScene";
import { KEEPER_MOMENT_ID } from "./keeperLines";

/**
 * Display only for game controls. Holdings do not change here.
 * grey-stair.03 plays the Keeper; Tap to play appears only if the browser blocks autoplay.
 * Look: Illusionist R2 draft in docs/art-direction (game-look.md, tokens.css, mocks/story-board.html).
 */
export function StoryBoard({ state }: { state: StoryboardState }) {
  const tower = towerStatusLines(state.tower);
  const paused = pauseText(state.pause, state.hunters);
  const warning = joinWarning(state.join);
  const chapter = TABLE_STORY.title;
  return (
    <main className="bt-board" data-screen={state.screen} data-moment={state.moment?.id ?? ""}>
      <div className="bt-board-vignette" aria-hidden="true" />
      <header className="bt-board-header">
        <div className="bt-zone bt-panel">
          <div className="bt-num">{towerStripState(state.tower)}</div>
          <div className="bt-zone-copy">
            <span className="bt-lbl">Tower · Battery · Calibration</span>
            <p>
              Tower {tower.connection}. Battery {tower.battery}. Calibration {tower.calibration}.
            </p>
          </div>
        </div>
        <div className="bt-board-title">
          <h1>Story board</h1>
          <p className="bt-chapter bt-flicker">{chapter}</p>
        </div>
        <div className="bt-zone bt-panel bt-join-zone">
          <span className="bt-lbl">Join</span>
          <p className="bt-num">{state.join ? state.join.code : "————"}</p>
        </div>
      </header>
      {state.screen !== "splash" ? <StatusStrip state={state} /> : null}
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
        <HunterList hunters={state.hunters} />
        <section className="bt-story">
          {state.screen === "splash" ? <SplashPanel state={state} /> : null}
          {state.screen === "tower-connect" ? <TowerConnectPanel state={state} /> : null}
          {state.screen === "pick-story" ? <PickStoryPanel /> : null}
          {state.screen === "party-join" ? <PartyJoinPanel state={state} /> : null}
          {state.screen === "begin" ? <BeginPanel /> : null}
          {state.screen === "play" ? <PlayPanel state={state} /> : null}
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

const HunterList = ({ hunters }: { hunters: StoryboardState["hunters"] }) => {
  const acting = actingHunterId(hunters);
  return (
    <aside>
      <h2 className="bt-roll-title">Hunters</h2>
      {hunters.length === 0 ? (
        <p className="bt-roll-empty">Hunters unavailable.</p>
      ) : (
        <ul className="bt-roll">
          {hunters.map((hunter) => {
            const away = hunter.holders.length === 0;
            const classes = ["bt-cart"];
            if (hunter.id === acting) classes.push("bt-cart-act");
            if (away) classes.push("bt-cart-away");
            return (
              <li key={hunter.id} className={classes.join(" ")}>
                <span className="bt-cart-ph" aria-hidden="true">
                  {hunter.name.slice(0, 1)}
                </span>
                <span>
                  <span className="bt-cart-nm">{hunter.name}</span>
                  <span className="bt-cart-st">
                    {hunter.name} — {holdingText(hunter)}
                  </span>
                </span>
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

const PickStoryPanel = () => (
  <article className="bt-page bt-parchment bt-ink-in">
    <div>
      <p className="bt-kicker">The door</p>
      <h2>{TABLE_STORY.title}</h2>
      <p className="bt-narration">{TABLE_STORY.blurb}</p>
      <p className="bt-muted">{TABLE_STORY.players}</p>
      <p className="bt-lede">{SCREEN_NEXT["pick-story"]}</p>
    </div>
  </article>
);

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

const BeginPanel = () => (
  <article className="bt-page bt-parchment bt-ink-in">
    <div>
      <p className="bt-kicker">{TABLE_STORY.title}</p>
      <h2>The table is set</h2>
      <p className="bt-narration">The table is set. Any iPad can begin.</p>
      <p className="bt-muted">{SCREEN_NEXT.begin}</p>
    </div>
  </article>
);

const PlayPanel = ({ state }: { state: StoryboardState }) => {
  if (state.moment?.id === KEEPER_MOMENT_ID) {
    const scene = sceneCopy(state.moment);
    return (
      <>
        <article className="bt-page bt-parchment bt-ink-in">
          <div>
            <p className="bt-kicker">{scene.kicker}</p>
            <h2>{scene.title}</h2>
          </div>
          <KeeperScene />
        </article>
        <div className="bt-items bt-panel">
          <span className="bt-lbl">Still</span>
          <p data-fallback={state.moment.fallbackAudio ?? ""}>
            Still {state.moment.still ?? "unavailable"}. Fallback{" "}
            {state.moment.fallbackAudio ?? "unavailable"}.
          </p>
        </div>
      </>
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
    <>
      <article className="bt-page bt-parchment bt-ink-in">
        <div>
          <p className="bt-kicker">{scene.kicker}</p>
          <h2>{scene.title}</h2>
          <p className="bt-narration">{text}</p>
        </div>
        <div className="bt-still">{state.moment.still ?? "unavailable"}</div>
      </article>
      <div className="bt-items bt-panel">
        <span className="bt-lbl">Still</span>
        <p data-fallback={state.moment.fallbackAudio ?? ""}>
          Still {state.moment.still ?? "unavailable"}. Fallback{" "}
          {state.moment.fallbackAudio ?? "unavailable"}.
        </p>
      </div>
    </>
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
