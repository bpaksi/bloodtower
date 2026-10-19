import type { StoryboardState, StoryCard } from "bloodtower-protocols";
import { holdingText, joinWarning, pauseText } from "../../lib/boardView";
import { displayCaption } from "../../lib/caption.ts";
import { packStillImageUrl } from "../../lib/packAsset.ts";
import { portraitSrc } from "../../lib/portrait.ts";
import { JoinQr } from "../../lib/qr";
import {
  BOARD_MODE,
  carouselPeeks,
  chosenLabel,
  chosenStory,
  claimedCount,
  currentStory,
  FORTUNE_LINE,
  focusedStory,
  gameSettingsNext,
  joinedDeviceIds,
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
import { boardLayer } from "./boardLayer.ts";
import { CameraStill } from "./CameraStill";
import { DialogFrame } from "./DialogFrame";
import { KeeperScene } from "./KeeperScene";
import { KEEPER_MOMENT_ID } from "./keeperLines";
import { VisualLayer } from "./VisualLayer";

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
  // Play chrome only while the story runs; every pre-play screen is the centred start-up shell.
  // Quit is "the table is closed" (spec D20), not a pause, so it keeps the closing summary and
  // join block and gets neither mode.
  const mode = BOARD_MODE[state.screen];
  const playMode = mode === "play";
  const startup = mode === "startup";
  // Layer 2 (R3-UI-10): a still, clip or the Keeper fills the screen; the board stays under it.
  const layer = boardLayer(state);
  return (
    <main
      className="bt-board"
      data-screen={state.screen}
      data-board-mode={mode ?? undefined}
      data-board-layer={layer}
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
        {startup ? null : state.summary && !playMode ? (
          <SummaryPanel summary={state.summary} tower={state.tower} />
        ) : (
          <HunterList hunters={state.hunters} packId={state.packId} />
        )}
        <section className="bt-story">
          {startup ? (
            // Layer 3 (R3-UI-10): one centred dialog. Keyed by screen so each new step inks in.
            <DialogFrame key={state.screen} className="bt-ink-in">
              <StartupPanel state={state} />
            </DialogFrame>
          ) : null}
          {state.screen === "play" ? <PlayPanel state={state} /> : null}
          {state.screen === "quit" ? <QuitPanel /> : null}
          {playMode && !keeperMoment ? <PartyItems /> : null}
          <NextPrompt label={nextPrompt(state)} />
        </section>
        {playMode ? (
          <ActingPanel />
        ) : startup ? (
          // Q3 (a): the running summary and the join QR in one column right of the dialog. The
          // hunter roll folds into Claim Hunters' dialog (R3-UI-11); the QR shows from Splash on.
          <div className="bt-startup-side">
            {state.summary ? <SummaryPanel summary={state.summary} tower={state.tower} /> : null}
            <TablePanel join={state.join} large={state.screen === "party-join"} />
          </div>
        ) : (
          <TablePanel join={state.join} large={false} />
        )}
      </div>
      <VisualLayer>
        {layer === "visual" && state.moment ? (
          <VisualMoment
            moment={state.moment}
            packId={state.packId}
            keeperLine={state.keeperLine ?? 0}
            onKeeperLineEnded={onKeeperLineEnded}
          />
        ) : null}
      </VisualLayer>
    </main>
  );
}

/** The start-up dialog's content for the current pre-play screen. */
const StartupPanel = ({ state }: { state: StoryboardState }) => {
  if (state.screen === "splash") return <SplashPanel state={state} />;
  if (state.screen === "tower-connect") return <TowerConnectPanel state={state} />;
  if (state.screen === "tower-volume-test") return <VolumeTestPanel state={state} />;
  if (state.screen === "pick-story") return <PickStoryPanel state={state} />;
  if (state.screen === "game-settings") return <GameSettingsPanel state={state} />;
  if (state.screen === "not-playable") return <NotPlayablePanel state={state} />;
  if (state.screen === "party-join") return <PartyJoinPanel state={state} />;
  if (state.screen === "setup") return <SetupPanel state={state} />;
  if (state.screen === "begin") return <BeginPanel state={state} />;
  return null;
};

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

/** The join QR and address in an ink panel: the right column before play, and on Quit. */
const TablePanel = ({ join, large }: { join: StoryboardState["join"]; large: boolean }) => (
  <aside className="bt-pub bt-panel">
    <span className="bt-lbl">Table</span>
    <JoinBlock join={join} large={large} />
  </aside>
);

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

/**
 * Right column in play: the acting hunter's public view (game-look.md section 4). The join QR is
 * not shown here (the header keeps the join code). `storyboardState` carries no acting hunter,
 * corruption or carried items yet, so all three read "unavailable", never a guess or zero.
 */
const ActingPanel = () => (
  <aside className="bt-pub bt-panel bt-acting">
    <span className="bt-lbl">Now acting</span>
    <p className="bt-acting-name bt-num" data-unavailable="">
      unavailable
    </p>
    <dl className="bt-acting-stats">
      <div>
        <dd className="bt-num" data-unavailable="">
          unavailable
        </dd>
        <dt className="bt-lbl">corruption</dt>
      </div>
      <div>
        <dd className="bt-num" data-unavailable="">
          unavailable
        </dd>
        <dt className="bt-lbl">carried</dt>
      </div>
    </dl>
  </aside>
);

const HunterList = ({
  hunters,
  packId,
}: {
  hunters: StoryboardState["hunters"];
  packId?: StoryboardState["packId"];
}) => (
  <aside className="bt-hunters">
    <h2 className="bt-roll-title">Hunters</h2>
    {hunters.length === 0 ? (
      <p className="bt-roll-empty">Hunters unavailable.</p>
    ) : (
      <HunterCarts hunters={hunters} packId={packId} roll />
    )}
  </aside>
);

/**
 * One cartouche per hunter. With `portraits` (Claim Hunters) each shows the pack portrait. In the
 * play `roll`, a hunter shows the portrait medallion whenever the pack id and the hunter's
 * portrait exist (an initial medallion otherwise) and a corruption column that reads
 * unavailable: `storyboardState` has no corruption, and no acting hunter either, so no cartouche
 * is marked as acting (`.bt-cart-act` in board.css waits for real data).
 */
const HunterCarts = ({
  hunters,
  packId,
  portraits = false,
  roll = false,
}: {
  hunters: StoryboardState["hunters"];
  packId?: StoryboardState["packId"];
  portraits?: boolean;
  roll?: boolean;
}) => {
  return (
    <ul className="bt-roll">
      {hunters.map((hunter) => {
        const away = hunter.holders.length === 0 || hunter.disconnected;
        const classes = ["bt-cart"];
        if (portraits) classes.push("bt-cart-portrait");
        if (roll) classes.push("bt-cart-roll");
        const portrait = portraitSrc(packId, hunter.portrait);
        if (away) classes.push("bt-cart-away");
        const accessibleLabel = `${hunter.name} — ${holdingText(hunter)}`;
        return (
          <li key={hunter.id} className={classes.join(" ")} data-hunter={hunter.id}>
            {portraits || portrait ? (
              <PortraitCard
                compact
                frameOnly
                name={hunter.name}
                src={portrait}
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
            {roll ? (
              <span
                className="bt-cart-cor bt-num"
                data-unavailable=""
                role="img"
                aria-label="corruption unavailable"
              >
                —
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

/**
 * "Tonight's game" (R3-UI-25): beside every start-up dialog, each choice as it is made. An item
 * with nothing chosen reads "not chosen yet"; Back clears the item it undoes. Display only: the
 * rows come from `summaryItems`. The lines of an item run on in one value and always show in
 * full; an item's detail lines (the setup steps' labels) show only on the TV.
 */
export const SummaryPanel = ({
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
            <dd>
              {item.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
              {item.detail.map((line) => (
                <span key={line} className="bt-summary-detail">
                  {line}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
};

/**
 * Party items zone (game-look.md section 4): labels only. `storyboardState` carries no party
 * items yet, so each value reads "unavailable", never a count or a zero.
 */
const PartyItems = () => (
  <div className="bt-items bt-panel" data-party-items="">
    <span className="bt-lbl">Party items</span>
    {(["count", "item", "carrier"] as const).map((part) => (
      <p key={part} data-party-item={part}>
        <span className="bt-lbl">{part}</span>
        <b className="bt-items-val" data-unavailable="">
          unavailable
        </b>
      </p>
    ))}
  </div>
);

/** Next-step prompt (V2-3): the blood band under the story. */
const NextPrompt = ({ label }: { label: string }) => (
  <div
    className="bt-next"
    data-next-band=""
    data-len={label.length <= 24 ? "short" : label.length <= 48 ? "mid" : "long"}
  >
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
  <article className="bt-page" data-fortune="">
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
    <article className="bt-page">
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
      className="bt-page"
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
 * Pick Game carousel (R3-UI-24), inside the start-up dialog: the focused story large and centred,
 * a smaller neighbour peeking at each side. Covers are 16:9 plates. The board has no buttons; the
 * devices move the highlight, and devices never show the covers (R3-UI-51).
 */
const PickStoryPanel = ({ state }: { state: StoryboardState }) => {
  const focus = focusedStory(state.stories);
  const { previous, next } = carouselPeeks(state.stories);
  const players = focus ? playersText(focus.players) : null;
  const tagline = focus?.tagline ?? focus?.blurb ?? null;
  const cover = focus ? coverSrc(focus.cover) : undefined;
  return (
    <div className="bt-carousel">
      {previous ? <CarouselPeek card={previous} side="previous" /> : null}
      <article className="bt-carousel-focus" data-story={focus?.id}>
        {cover ? (
          <div className="bt-carousel-plate">
            <img className="bt-carousel-cover" src={cover} alt="" />
          </div>
        ) : null}
        <h2>{focus ? focus.title : "Stories unavailable."}</h2>
        {tagline ? <p className="bt-carousel-tagline">{tagline}</p> : null}
        {players ? <p className="bt-carousel-players">{players}</p> : null}
        {focus && !focus.loadable ? <p className="bt-carousel-players">Can't load</p> : null}
      </article>
      {next ? <CarouselPeek card={next} side="next" /> : null}
    </div>
  );
};

const CarouselPeek = ({ card, side }: { card: StoryCard; side: "previous" | "next" }) => {
  const cover = coverSrc(card.cover);
  return (
    <article className="bt-carousel-peek" data-carousel-side={side} data-story-peek={card.id}>
      {cover ? (
        <div className="bt-carousel-plate">
          <img className="bt-carousel-cover" src={cover} alt="" />
        </div>
      ) : null}
      <p>{card.title}</p>
      {card.loadable ? null : <p>Can't load</p>}
    </article>
  );
};

/**
 * Game settings (R3-UI-22): a dialog listing each of the chosen pack's settings, its options and
 * the current value. The devices change them; the board has no buttons.
 */
const GameSettingsPanel = ({ state }: { state: StoryboardState }) => {
  const settings = state.gameSettings ?? null;
  const story = chosenStory(state.stories, settings);
  return (
    <article className="bt-page" data-game-settings={settings?.story ?? ""}>
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
    <article className="bt-page">
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
    <article className="bt-page bt-claim">
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
      <article className="bt-page">
        <p className="bt-narration">Setup step unavailable.</p>
      </article>
    );
  }
  const { step, illustration } = current;
  return (
    <article className="bt-page bt-setup" data-setup-step={step.id}>
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
  <article className="bt-page">
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

const PlayPanel = ({ state }: { state: StoryboardState }) => {
  if (!state.moment) {
    return (
      <article className="bt-page bt-parchment">
        <p className="bt-narration">Moment unavailable.</p>
      </article>
    );
  }
  // A visual moment shows in the visual layer (VisualMoment). The page under it keeps the scene's
  // heading for the zoom; the Keeper's page stays bare, as the header already names him.
  if (boardLayer(state) === "visual") {
    if (state.moment.id === KEEPER_MOMENT_ID) {
      return (
        <article
          className="bt-page bt-parchment bt-ink-in bt-page-keeper"
          data-keeper-stage=""
          data-under-visual=""
        />
      );
    }
    const scene = sceneCopy(state.moment);
    return (
      <article className="bt-page bt-parchment bt-ink-in" data-under-visual="">
        <MomentMeta moment={state.moment} />
        <div className="bt-page-text">
          <p className="bt-kicker">{scene.kicker}</p>
          <h2>{scene.title}</h2>
          <p className="bt-orn" aria-hidden="true">
            ❦ ❦ ❦
          </p>
        </div>
      </article>
    );
  }
  const scene = sceneCopy(state.moment);
  const text = state.moment.text == null ? "Text unavailable." : displayCaption(state.moment.text);
  return (
    <article className="bt-page bt-parchment bt-ink-in">
      <MomentMeta moment={state.moment} />
      <div className="bt-page-text">
        <p className="bt-kicker">{scene.kicker}</p>
        <h2>{scene.title}</h2>
        <p className="bt-orn" aria-hidden="true">
          ❦ ❦ ❦
        </p>
        <p className="bt-narration" data-moment-caption="">
          {text}
        </p>
      </div>
    </article>
  );
};

/**
 * The visual layer's content for a visual moment (R3-UI-31): the Keeper scene, or the still in
 * its plate with the camera track (#78), letterboxed whole in the layer (Q4 (a)), and the moment's
 * text as a caption at the bottom (game-look.md section 4, cut scenes). A clip with no still has
 * nothing the board can draw yet, so it reads unavailable.
 */
const VisualMoment = ({
  moment,
  packId,
  keeperLine,
  onKeeperLineEnded,
}: {
  moment: NonNullable<StoryboardState["moment"]>;
  packId: StoryboardState["packId"];
  keeperLine: number;
  onKeeperLineEnded?: (momentId: string, line: number) => void;
}) => {
  if (moment.id === KEEPER_MOMENT_ID) {
    return (
      <KeeperScene
        keeperLine={keeperLine}
        onLineEnded={(line) => onKeeperLineEnded?.(KEEPER_MOMENT_ID, line)}
      />
    );
  }
  return (
    <>
      {moment.still ? (
        <div className="bt-plate" data-plate="">
          <CameraStill
            momentId={moment.id}
            packId={packId}
            assetId={moment.still}
            spokenText={moment.text ?? ""}
          />
        </div>
      ) : (
        <p className="bt-visual-missing" data-unavailable="">
          Visual unavailable.
        </p>
      )}
      {moment.text == null ? null : (
        <p className="bt-visual-caption" data-moment-caption="">
          {displayCaption(moment.text)}
        </p>
      )}
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
