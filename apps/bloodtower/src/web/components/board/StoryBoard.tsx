import type { StoryboardState, StoryCard } from "bloodtower-protocols";
import { holdingText, joinWarning, pauseText } from "../../lib/boardView";
import { displayCaption } from "../../lib/caption.ts";
import { packStillImageUrl } from "../../lib/packAsset.ts";
import { portraitSrc } from "../../lib/portrait.ts";
import { JoinQr } from "../../lib/qr";
import {
  chosenLabel,
  chosenStory,
  claimedCount,
  currentStory,
  FORTUNE_LINE,
  focusedStory,
  gameSettingsNext,
  joinedDeviceIds,
  neighborStory,
  partyJoinNextReason,
  playersText,
  SCREEN_NEXT,
  SCREEN_TITLE,
  setupStepTitle,
  summaryItems,
  towerRequiredReason,
  towerStripState,
} from "../../lib/screens";
import { pageServerOrigin } from "../../lib/serverOrigin.ts";
import { towerStatusLines } from "../../lib/towerStatus";
import { VOLUME_ANSWER_LABEL, volumeBoardCopy } from "../../lib/volumeTest.ts";
import { PortraitCard } from "../PortraitCard";
import { CameraStill } from "./CameraStill";
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
      <div className="bt-board-backdrop" aria-hidden="true" />
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
      {debug && state.volumeTest?.logged ? <VolumeLogged logged={state.volumeTest.logged} /> : null}
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
        {state.summary ? (
          <SummaryPanel summary={state.summary} tower={state.tower} />
        ) : (
          <HunterList hunters={state.hunters} />
        )}
        <section className="bt-story">
          {state.screen === "splash" ? <SplashPanel state={state} /> : null}
          {state.screen === "tower-connect" ? <TowerConnectPanel state={state} /> : null}
          {state.screen === "tower-volume-test" ? <VolumeTestPanel state={state} /> : null}
          {state.screen === "pick-story" ? <PickStoryPanel state={state} /> : null}
          {state.screen === "game-settings" ? <GameSettingsPanel state={state} /> : null}
          {state.screen === "not-playable" ? <NotPlayablePanel state={state} /> : null}
          {state.screen === "party-join" ? <PartyJoinPanel state={state} /> : null}
          {state.screen === "setup" ? <SetupPanel state={state} /> : null}
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
  if (state.screen === "tower-connect" && !state.prompt) {
    return (
      towerRequiredReason(chosenStory(state.stories, state.gameSettings ?? null), state.tower) ??
      "Waiting."
    );
  }
  if (state.screen === "setup") return SCREEN_NEXT.setup;
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
  if (state.screen === "game-settings") return { scene: "The Door", place: "Game Settings" };
  if (state.screen === "not-playable") return { scene: "The Door", place: "Not Yet Playable" };
  if (state.screen === "party-join") return { scene: "The Party", place: "Claim Hunters" };
  if (state.screen === "setup") return { scene: "The Table", place: "Setup" };
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

const HunterList = ({ hunters }: { hunters: StoryboardState["hunters"] }) => (
  <aside className="bt-hunters">
    <h2 className="bt-roll-title">Hunters</h2>
    {hunters.length === 0 ? (
      <p className="bt-roll-empty">Hunters unavailable.</p>
    ) : (
      <HunterCarts hunters={hunters} />
    )}
  </aside>
);

/** One cartouche per hunter. With `portraits` (Claim Hunters) each shows the pack portrait. */
const HunterCarts = ({
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
              <PortraitCard
                compact
                frameOnly
                name={hunter.name}
                src={portraitSrc(packId, hunter.portrait)}
                accessibleLabel={accessibleLabel}
              />
            ) : (
              <span className="bt-cart-ph" aria-hidden="true">
                {hunter.name.slice(0, 1)}
              </span>
            )}
            <span className="bt-cart-copy">
              <span className="bt-cart-nm">{hunter.name}</span>
              <span className="bt-cart-st">{holdingText(hunter)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
};

/**
 * "Tonight's game" (R3-UI-25): beside every start-up dialog, each choice as it is made. An item
 * with nothing chosen reads "not chosen yet"; Back clears the item it undoes.
 */
const SummaryPanel = ({
  summary,
  tower,
}: {
  summary: NonNullable<StoryboardState["summary"]>;
  tower: StoryboardState["tower"];
}) => {
  const cover = summary.game ? coverSrc(summary.game.cover) : undefined;
  return (
    <aside className="bt-summary bt-panel" data-summary="">
      <h2 className="bt-roll-title">Tonight's game</h2>
      {cover ? <img className="bt-summary-cover" src={cover} alt="" /> : null}
      <dl>
        {summaryItems(summary, tower).map((item) => (
          <div
            key={item.id}
            className="bt-summary-item"
            data-summary-item={item.id}
            data-empty={item.empty ? "true" : undefined}
          >
            <dt className="bt-lbl">{item.label}</dt>
            {item.lines.map((line) => (
              <dd key={line}>{line}</dd>
            ))}
          </div>
        ))}
      </dl>
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
    <p className="bt-lede">{state.join ? "Ready. Opening the stories." : "Loading the table…"}</p>
  </article>
);

const TowerConnectPanel = ({ state }: { state: StoryboardState }) => {
  const story = chosenStory(state.stories, state.gameSettings ?? null);
  const reason = towerRequiredReason(story, state.tower);
  return (
    <article className="bt-page bt-parchment bt-ink-in">
      <div>
        <p className="bt-kicker">{story ? story.title : "The tower"}</p>
        <h2>
          {state.tower.connection === "connected" ? "Tower is on the table." : "Wake the tower."}
        </h2>
        {story?.tower === "required" ? (
          <p className="bt-narration">This story needs the tower.</p>
        ) : null}
        <p className="bt-muted" data-tower-reason={reason ? "" : undefined}>
          {reason ?? SCREEN_NEXT["tower-connect"]}
        </p>
      </div>
    </article>
  );
};

/**
 * The tower volume test (Proving Ground section 6a). The board shows the level playing, the
 * balance check and the question; it has no buttons, so the answer is pressed on an iPad.
 */
const VolumeTestPanel = ({ state }: { state: StoryboardState }) => {
  const test = state.volumeTest;
  if (!test) return null;
  const copy = volumeBoardCopy(test);
  return (
    <article
      className="bt-page bt-parchment bt-ink-in"
      data-volume-phase={test.phase}
      data-volume-mode={test.mode}
      data-volume-level={test.level ?? undefined}
    >
      <div>
        <p className="bt-kicker">{SCREEN_TITLE["tower-volume-test"]}</p>
        <h2>{copy.title}</h2>
        <p className="bt-narration">{copy.line}</p>
        {test.phase === "levels" ? (
          <ol className="bt-levels" aria-label="Levels">
            {[0, 1, 2].map((level) => (
              <li key={level} data-level={level} data-current={test.level === level || undefined}>
                Level {level}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </article>
  );
};

/** The debug overlay's line for the logged volume stat (R3-UI-40): what was answered, and when. */
const VolumeLogged = ({
  logged,
}: {
  logged: NonNullable<NonNullable<StoryboardState["volumeTest"]>["logged"]>;
}) => (
  <p className="bt-status" data-volume-logged="">
    <span>
      Volume test <strong>{VOLUME_ANSWER_LABEL[logged.answer]}</strong>
    </span>
    <span>
      Note <strong>{logged.note ?? "none"}</strong>
    </span>
    <span>
      Firmware <strong>{logged.firmware ?? "unavailable"}</strong>
    </span>
    <span>
      At <strong>{logged.at}</strong>
    </span>
  </p>
);

/** The pack's cover on the host, or undefined when the card has none. Board only: devices show no images. */
const coverSrc = (cover: StoryCard["cover"]): string | undefined =>
  cover ? `${pageServerOrigin()}${cover}` : undefined;

/**
 * Pick Game carousel (R3-UI-24): the focused story large, a neighbour peeking at each side.
 * The board has no buttons; the devices move the highlight.
 */
const PickStoryPanel = ({ state }: { state: StoryboardState }) => {
  const focus = focusedStory(state.stories);
  const previous = neighborStory(state.stories, -1);
  const next = neighborStory(state.stories, 1);
  // With two cards both neighbours are the same story: show it once, on the right.
  const peekBefore = previous && previous.id !== next?.id ? previous : null;
  const players = focus ? playersText(focus.players) : null;
  const tagline = focus?.tagline ?? focus?.blurb ?? null;
  return (
    <div className="bt-carousel">
      {peekBefore ? <CarouselPeek card={peekBefore} side="previous" /> : null}
      <article className="bt-page bt-parchment bt-ink-in bt-carousel-focus" data-story={focus?.id}>
        {focus && coverSrc(focus.cover) ? (
          <img className="bt-carousel-cover" src={coverSrc(focus.cover)} alt="" />
        ) : null}
        <div>
          <p className="bt-kicker">The door</p>
          <h2>{focus ? focus.title : "Stories unavailable."}</h2>
          {tagline ? <p className="bt-narration">{tagline}</p> : null}
          {players ? <p className="bt-muted">{players}</p> : null}
          {focus && !focus.loadable ? <p className="bt-narration">Can't load</p> : null}
          <p className="bt-lede">{SCREEN_NEXT["pick-story"]}</p>
        </div>
      </article>
      {next ? <CarouselPeek card={next} side="next" /> : null}
    </div>
  );
};

const CarouselPeek = ({ card, side }: { card: StoryCard; side: "previous" | "next" }) => (
  <article className="bt-carousel-peek" data-carousel-side={side} data-story-peek={card.id}>
    {coverSrc(card.cover) ? (
      <img className="bt-carousel-cover" src={coverSrc(card.cover)} alt="" />
    ) : null}
    <p>{card.title}</p>
    {card.loadable ? null : <p>Can't load</p>}
  </article>
);

/**
 * Game settings (R3-UI-22): a dialog listing each of the chosen pack's settings, its options and
 * the current value. The devices change them; the board has no buttons.
 */
const GameSettingsPanel = ({ state }: { state: StoryboardState }) => {
  const settings = state.gameSettings ?? null;
  const story = chosenStory(state.stories, settings);
  return (
    <article className="bt-page bt-parchment bt-ink-in" data-game-settings={settings?.story ?? ""}>
      <div>
        <p className="bt-kicker">{story ? story.title : "The story"}</p>
        <h2>{SCREEN_TITLE["game-settings"]}</h2>
        {!settings || settings.settings.length === 0 ? (
          <p className="bt-narration">This story has no settings.</p>
        ) : (
          <dl className="bt-settings">
            {settings.settings.map((setting) => (
              <div key={setting.id} className="bt-setting" data-setting={setting.id}>
                <dt>{setting.label}</dt>
                <dd>
                  <b data-setting-value="">{chosenLabel(settings, setting.id) ?? "unavailable"}</b>
                  <span className="bt-setting-options">
                    {setting.options.map((option) => (
                      <span
                        key={option.id}
                        data-option={option.id}
                        data-chosen={settings.chosen[setting.id] === option.id ? "true" : undefined}
                      >
                        {option.label}
                      </span>
                    ))}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        )}
        <p className="bt-lede">{gameSettingsNext(story)}</p>
      </div>
    </article>
  );
};

/** "Not playable yet" (R3-UI-24): a dialog over the landing background; Back returns to Game settings. */
const NotPlayablePanel = ({ state }: { state: StoryboardState }) => {
  const focus =
    chosenStory(state.stories, state.gameSettings ?? null) ?? focusedStory(state.stories);
  return (
    <article className="bt-page bt-parchment bt-ink-in">
      <div>
        <p className="bt-kicker">The door</p>
        <h2>{SCREEN_TITLE["not-playable"]}</h2>
        <p className="bt-narration">{focus ? focus.title : "This story"} is not ready to play.</p>
        <p className="bt-lede">{SCREEN_NEXT["not-playable"]}</p>
      </div>
    </article>
  );
};

/**
 * Claim Hunters (R3-UI-21): the pack's hunters with their portraits and the device holding each.
 * Portraits show here on the board only, never on a device (R3-UI-51).
 */
const PartyJoinPanel = ({ state }: { state: StoryboardState }) => {
  const claimed = claimedCount(state.hunters);
  const total = state.hunters.length;
  return (
    <article className="bt-page bt-parchment bt-ink-in bt-claim">
      <div>
        <p className="bt-kicker">The party</p>
        <h2>{SCREEN_TITLE["party-join"]}</h2>
        <p className="bt-claimed">
          {total === 0 ? "Hunters unavailable." : `${claimed} of ${total} hunters claimed`}
        </p>
      </div>
      {total > 0 ? <HunterCarts hunters={state.hunters} packId={state.packId} portraits /> : null}
    </article>
  );
};

/**
 * One physical setup step (R-WIZ-6): its own dialog, Done and Back on the devices. The
 * illustration shows only once its file has landed.
 */
const SetupPanel = ({ state }: { state: StoryboardState }) => {
  const current = state.setupStep;
  if (!current) {
    return (
      <article className="bt-page bt-parchment">
        <p className="bt-narration">Setup step unavailable.</p>
      </article>
    );
  }
  const { step, illustration } = current;
  return (
    <article className="bt-page bt-parchment bt-ink-in bt-setup" data-setup-step={step.id}>
      <div>
        <p className="bt-kicker">{currentStory(state.stories)?.title ?? "The story"}</p>
        <h2>{setupStepTitle(step)}</h2>
        <p className="bt-narration">{step.label}</p>
      </div>
      {illustration ? (
        <img
          className="bt-setup-illustration"
          src={packStillImageUrl(illustration, state.packId)}
          alt=""
          data-setup-illustration={illustration}
        />
      ) : null}
      <p className="bt-lede">{SCREEN_NEXT.setup}</p>
    </article>
  );
};

const BeginPanel = ({ state }: { state: StoryboardState }) => (
  <article className="bt-page bt-parchment bt-ink-in">
    <div>
      <p className="bt-kicker">{currentStory(state.stories)?.title ?? "The story"}</p>
      <h2>The table is set</h2>
      <p className="bt-narration">
        {state.prompt ? "The table is set. Any iPad can begin." : "Waiting for the table."}
      </p>
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
  const still = state.moment.still;
  return (
    <article className="bt-page bt-parchment bt-ink-in">
      <MomentMeta moment={state.moment} />
      <div>
        <p className="bt-kicker">{scene.kicker}</p>
        <h2>{scene.title}</h2>
        <p className="bt-narration" data-moment-caption="">
          {text}
        </p>
      </div>
      {still ? (
        <CameraStill
          momentId={state.moment.id}
          packId={state.packId}
          assetId={still}
          spokenText={state.moment.text ?? ""}
        />
      ) : null}
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
