"use client";

import type { DeviceView, GearView, OfferedAction } from "bloodtower-protocols";
import { useEffect, useState } from "react";

import { pageLogContext, reportPageLog } from "../../lib/pageLog.ts";
import {
  AUDIO_START_REFUSED,
  ENABLE_SOUND_LINE,
  playRoomVolume,
  prepareDeviceSound,
  unlockDeviceSound,
  VOLUME_LINE,
} from "../../lib/volumeTest.ts";
import { DeviceErrorBanner, type DeviceErrorBannerModel } from "../errors/DeviceErrorBanner.tsx";
import { ChromeBar } from "./ChromeBar.tsx";
import type { MenuContext } from "./gearMenu.ts";

const openActions = (actions: OfferedAction[]) => actions.filter((action) => action.open);

const SCREEN_TITLE: Record<string, string> = {
  splash: "Blood Tower",
  "pick-story": "Pick a story",
  "game-settings": "Game settings",
  "table-join": "Join",
  "base-board": "Base board",
  "tower-choice": "The tower",
  "tower-wake": "The tower",
  "claim-heroes": "Party Join",
  setup: "Board setup",
  begin: "Begin",
  play: "The move",
  pause: "Paused",
  session: "Session",
  "session-over": "Tonight",
  "not-playable": "Not playable yet",
};

/** Existing step names (view.ts STEP_NAME). Shown as context; the instruction stays `shows`. */
const STEP_CONTEXT: Record<string, string> = {
  splash: "Splash",
  "table-join": "Join",
  "base-board": "Base board",
  "tower-choice": "Tower",
  "tower-wake": "Tower",
  "pick-story": "Pick Story",
  "game-settings": "Game settings",
  "claim-heroes": "Party Join",
  setup: "Setup",
  begin: "Begin",
  play: "Play",
  pause: "Paused",
  session: "Session",
  "session-over": "Session over",
  "not-playable": "Not playable yet",
};

function StoryNav({
  doors,
  live,
  onAct,
}: {
  doors: NonNullable<DeviceView["doors"]>;
  live: boolean;
  onAct: (promptId: string, actionId: string, args?: Record<string, unknown>) => void;
}) {
  if (doors.length < 2) return null;
  const focusIndex = doors.findIndex((door) => door.focus);
  const ring = focusIndex >= 0 ? focusIndex : 0;
  const step = (delta: number) => doors[(ring + delta + doors.length) % doors.length];
  const previous = step(-1);
  const next = step(1);
  if (!previous || !next) return null;
  return (
    <div className="bt-story-nav">
      <button
        type="button"
        className="bt-secondary"
        data-action="story-prev"
        disabled={!live}
        onClick={() => onAct("focus-story", "focus", { storyId: previous.id })}
      >
        Previous
      </button>
      <button
        type="button"
        className="bt-secondary"
        data-action="story-next"
        disabled={!live}
        onClick={() => onAct("focus-story", "focus", { storyId: next.id })}
      >
        Next
      </button>
    </div>
  );
}

const menuContext = (view: DeviceView): MenuContext | undefined => {
  const gear = view.gear;
  if (!gear) return undefined;
  return {
    inGame: gear.inGame,
    beforeBegin: gear.beforeBegin,
    sessionScreen: gear.sessionScreen,
    sessionOver: gear.sessionOver,
    towerConnected: gear.towerConnected,
    partySplit: gear.partySplit,
    blockedItem: gear.panel && gear.owner !== view.deviceId ? gear.panel : null,
  };
};

const ownsPanel = (view: DeviceView): GearView | null => {
  const gear = view.gear;
  if (!gear?.panel || gear.owner !== view.deviceId) return null;
  return gear;
};

function GearDevicePanel({
  gear,
  live,
  onAct,
}: {
  gear: GearView;
  live: boolean;
  onAct: (promptId: string, actionId: string, args?: Record<string, unknown>) => void;
}) {
  const send = (actionId: string, args?: Record<string, unknown>) => onAct("gear", actionId, args);
  const stepBack = Boolean(gear.card || gear.firstHero);
  return (
    <section data-gear-panel={gear.panel ?? ""}>
      <h2>See the Story board</h2>
      {gear.panel === "volume" ? (
        <div className="mt-6 flex flex-col gap-3">
          {([0, 1, 2] as const).map((level) => (
            <button
              key={level}
              type="button"
              className="bt-secondary"
              disabled={!live}
              onClick={() => send("pick", { pick: `Volume ${level}`, volume: level })}
            >
              {`Volume ${level}`}
            </button>
          ))}
          <button
            type="button"
            className="bt-secondary"
            disabled={!live}
            onClick={() => {
              const level =
                gear.picked === "Volume 0"
                  ? 0
                  : gear.picked === "Volume 1"
                    ? 1
                    : gear.picked === "Volume 2"
                      ? 2
                      : undefined;
              send(
                "keep-volume",
                level === undefined ? {} : { pick: gear.picked ?? "", volume: level },
              );
            }}
          >
            Keep
          </button>
          <button
            type="button"
            className="bt-secondary"
            disabled={!live}
            onClick={() => send("try-another")}
          >
            Try another
          </button>
        </div>
      ) : null}
      {gear.panel === "look-up" ? (
        <div className="mt-6 flex flex-col gap-3">
          {gear.cards.map((card) => (
            <button
              key={card.id}
              type="button"
              className="bt-secondary"
              disabled={!live}
              onClick={() => send("pick", { pick: card.title })}
            >
              {card.title}
            </button>
          ))}
        </div>
      ) : null}
      {gear.panel === "change-who-holds-whom" ? (
        <div className="mt-6 flex flex-col gap-3">
          {gear.party.map((hero) => (
            <button
              key={hero.id}
              type="button"
              className="bt-secondary"
              disabled={!live}
              onClick={() => send("pick", { pick: hero.name, heroId: hero.id })}
            >
              {hero.name}
            </button>
          ))}
        </div>
      ) : null}
      {gear.panel === "tower" ? (
        gear.picked === "Reconnect" || gear.picked === "Play without" ? (
          <div className="mt-6 flex flex-col gap-3" data-tower-confirm={gear.picked}>
            <p>Are you sure?</p>
            <button
              type="button"
              className="bt-primary"
              disabled={!live}
              onClick={() => send("done")}
            >
              Yes
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {(["Reconnect", "Play without"] as const).map((pick) => (
              <button
                key={pick}
                type="button"
                className="bt-secondary"
                data-tower-pick={pick}
                disabled={!live}
                onClick={() => send("pick", { pick })}
              >
                {pick}
              </button>
            ))}
          </div>
        )
      ) : null}
      {stepBack || (gear.panel === "tower" && gear.picked) ? (
        <button
          type="button"
          className="bt-secondary mt-6"
          disabled={!live}
          onClick={() => send("step-back")}
        >
          Back
        </button>
      ) : null}
      {gear.panel === "tower" && gear.picked ? null : (
        <button
          type="button"
          className="bt-primary mt-6"
          disabled={!live}
          onClick={() => send("done")}
        >
          Done
        </button>
      )}
    </section>
  );
}

const TOWER_LOST_CAPTION = "The tower has gone quiet. The game waits.";
const QUIT_CONFIRM_LINE = "Leave the game? It will be saved.";

/** The mockup's tower mark, as the board draws it. */
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

/**
 * A tower lost mid-game (DEC-301, mockup "Paused, tower lost"): Reconnect, Go on without, Quit.
 * Go on without and Quit each ask first; the question is this iPad's, nothing is sent until Yes.
 */
function TowerLostPause({
  view,
  live,
  onAct,
}: {
  view: DeviceView;
  live: boolean;
  onAct: (promptId: string, actionId: string, args?: Record<string, unknown>) => void;
}) {
  const [asking, setAsking] = useState<"go-on-without" | "quit-story" | null>(null);
  const find = (actionId: string) =>
    openActions(view.actions).find((action) => action.actionId === actionId);
  const reconnect = find("reconnect");
  const goWithout = find("go-on-without");
  const quit = find("quit-story");
  const press = (action: OfferedAction | undefined, primary: boolean, label?: string) =>
    action ? (
      <button
        type="button"
        className={primary ? "bt-primary" : "bt-secondary"}
        data-prompt-id={action.promptId}
        data-action-id={action.actionId}
        data-action={action.actionId}
        disabled={!live}
        onClick={() => {
          setAsking(null);
          onAct(action.promptId, action.actionId);
        }}
      >
        {label ?? action.label}
      </button>
    ) : null;
  const ask = (action: OfferedAction | undefined, kind: "go-on-without" | "quit-story") =>
    action ? (
      <button
        type="button"
        className="bt-secondary"
        data-pause-ask={kind}
        disabled={!live}
        onClick={() => setAsking(kind)}
      >
        {action.label}
      </button>
    ) : null;
  const back = (
    <button
      type="button"
      className="bt-secondary"
      data-pause-back=""
      onClick={() => setAsking(null)}
    >
      Back
    </button>
  );
  return (
    <div className="mt-2" data-pause-tower-lost={asking ?? "pause"}>
      <TowerMark />
      {asking === "go-on-without" ? (
        <>
          <h2 className="bt-title" data-pause-title="">
            Go on without
          </h2>
          <p className="bt-caption" data-step-instruction="">
            Are you sure?
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {press(goWithout, true)}
            {back}
          </div>
        </>
      ) : asking === "quit-story" ? (
        <>
          <p className="bt-caption" data-step-instruction="">
            {QUIT_CONFIRM_LINE}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {press(quit, true, "Leave")}
            {back}
          </div>
        </>
      ) : (
        <>
          <p className="bt-caption" data-step-instruction="">
            {TOWER_LOST_CAPTION}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {press(reconnect, true)}
            {ask(goWithout, "go-on-without")}
            {ask(quit, "quit-story")}
          </div>
        </>
      )}
    </div>
  );
}

const iconFor = (actionId: string): string => {
  if (actionId === "walk") return "→";
  if (actionId === "enter") return "⌂";
  if (actionId === "leave") return "↩";
  if (actionId === "end-turn") return "■";
  return "";
};

/** The sound step's own buttons: Enable sound, the three volumes, Keep and Try another. */
const isSoundAction = (action: OfferedAction) =>
  action.actionId === "enable-sound" ||
  action.actionId === "volume-play" ||
  action.actionId === "volume-keep" ||
  action.actionId === "volume-again";

/** A refused browser audio call is logged, and the banner shows it to the person who tapped. */
const audioFailure = (error: unknown): DeviceErrorBannerModel => {
  const detail = error instanceof Error ? error.message : String(error);
  const message =
    detail.trim() === ""
      ? "The browser refused to start audio."
      : `The browser refused to start audio. ${detail}`;
  const context = pageLogContext();
  void reportPageLog({
    level: "error",
    code: AUDIO_START_REFUSED,
    message,
    source: "device",
    device: context.device,
    screen: context.screen,
  });
  return { code: AUDIO_START_REFUSED, message };
};

/** The saved game's Continue on Pick story. It sits above the stories, never pinned with Choose. */
const SAVED_CONTINUE_PROMPT = "continue-saved-game";
/** The stats screen's Play again (SCR-019): the iPad shows a game's buttons and its rating there. */
const STATS_PLAY_AGAIN_PROMPT = "stats-play-again";

/**
 * SCR-021 on the iPad, top to bottom: Continue (only while an autosave exists), New game,
 * Tonight's games (each a pressable row, newest first), Done for tonight. A question replaces them.
 */
function SessionButtons({
  view,
  live,
  onAct,
}: {
  view: DeviceView;
  live: boolean;
  onAct: (promptId: string, actionId: string, args?: Record<string, unknown>) => void;
}) {
  const open = openActions(view.actions);
  const find = (actionId: string) => open.find((action) => action.actionId === actionId);
  const button = (action: OfferedAction, primary = false) => (
    <button
      key={`${action.promptId}:${action.actionId}`}
      type="button"
      className={primary ? "bt-primary" : "bt-secondary"}
      data-prompt-id={action.promptId}
      data-action-id={action.actionId}
      data-action={action.actionId}
      disabled={!live}
      onClick={() => onAct(action.promptId, action.actionId)}
    >
      {action.label}
    </button>
  );
  const back = find("back");
  const statsAgain = open.find((action) => action.promptId === STATS_PLAY_AGAIN_PROMPT);
  if (back && statsAgain) {
    const rating = view.settings?.find((setting) => setting.id === "fun-rating");
    return (
      <div className="mt-6 flex flex-col gap-3" data-game-stats="">
        {button(statsAgain, true)}
        {button(back)}
        {rating ? (
          <div className="mt-4 flex flex-col gap-2" data-rating="">
            <p className="bt-label" data-rating-label="">
              {rating.label}
            </p>
            <div className="flex gap-2">
              {rating.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="bt-secondary"
                  data-rating-option={option.id}
                  aria-pressed={option.id === rating.optionId}
                  disabled={!live}
                  onClick={() =>
                    onAct("set-setting", "set", { settingId: rating.id, optionId: option.id })
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }
  if (back) {
    const done = open.find((action) => action.promptId === "session-done-confirm");
    const again = open.find((action) => action.promptId === "session-play-again-confirm");
    const yes = done ?? again ?? find("new-game");
    const kind = done ? "done" : again ? "play-again" : "new-game";
    return (
      <div className="mt-6 flex flex-col gap-3" data-session-confirm={kind}>
        {done ? <h2 className="text-xl font-semibold">Done for tonight</h2> : null}
        {again ? <h2 className="text-xl font-semibold">Play again?</h2> : null}
        {yes ? button(yes, true) : null}
        {button(back)}
      </div>
    );
  }
  const games = open.filter((action) => action.actionId === "open-game");
  const cont = find("continue");
  const fresh = find("new-game");
  const done = find("done-for-tonight");
  return (
    <div className="mt-6 flex flex-col gap-3" data-session-buttons="">
      {cont ? button(cont, true) : null}
      {fresh ? button(fresh) : null}
      <h2 className="bt-session-games-label" data-games-label="">
        Tonight's games
      </h2>
      {games.length === 0 ? <p data-games-empty="">No games yet tonight.</p> : null}
      {games.map((game) => (
        <button
          key={game.promptId}
          type="button"
          className="bt-secondary"
          data-prompt-id={game.promptId}
          data-action-id={game.actionId}
          data-action={game.actionId}
          data-game-row=""
          disabled={!live}
          onClick={() => onAct(game.promptId, game.actionId)}
        >
          {game.label} <span className="bt-quit-mark">quit</span>
        </button>
      ))}
      {done ? button(done) : null}
    </div>
  );
}

const inMenu = (action: OfferedAction) => action.promptId === "menu-quit";

/** Walk, Enter, and End turn. Leave stays outside this region (DEC-220). */
const MOVE_CONTROLS = new Set(["walk", "enter", "end-turn"]);

/** The eight fixed slots, clockwise from the tower-up point (UI-023). Slot ids are data only. */
const COMPASS_SLOTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

/** Slot centre as a share of the square compass (0-100). */
const SLOT_POINT: Record<(typeof COMPASS_SLOTS)[number], { x: number; y: number }> = {
  N: { x: 50, y: 11 },
  NE: { x: 83, y: 22 },
  E: { x: 89, y: 50 },
  SE: { x: 83, y: 78 },
  S: { x: 50, y: 89 },
  SW: { x: 17, y: 78 },
  W: { x: 11, y: 50 },
  NW: { x: 17, y: 22 },
};

/** v2 device UI: text and icon controls. Place stills stay on the Story board. */
export function CoreDeviceScreen({
  live,
  view,
  errorBanner,
  onAct,
  onHold,
}: {
  live: boolean;
  view: DeviceView;
  errorBanner?: DeviceErrorBannerModel | null;
  onAct: (promptId: string, actionId: string, args?: Record<string, unknown>) => void;
  onHold?: (heroId: string, action: "take" | "release") => void;
}) {
  const [audioError, setAudioError] = useState<DeviceErrorBannerModel | null>(null);
  const enableSound = view.actions.find((action) => action.actionId === "enable-sound");
  const volumes = view.actions.filter((action) => action.actionId === "volume-play");
  const keep = view.actions.find((action) => action.actionId === "volume-keep");
  const tryAnother = view.actions.find((action) => action.actionId === "volume-again");
  const soundStep = view.screen === "pick-story" && (enableSound != null || volumes.length > 0);
  const needsUnlock = enableSound != null;
  useEffect(() => {
    if (!needsUnlock) return;
    prepareDeviceSound().catch((error: unknown) => setAudioError(audioFailure(error)));
  }, [needsUnlock]);
  const actions = openActions(view.actions).filter((action) => !isSoundAction(action));
  const onSessionScreen = view.screen === "session";
  // The session screen draws its own Back inside the question; Pick story's Continue has its own place.
  const back = onSessionScreen ? undefined : actions.find((action) => action.actionId === "back");
  const savedContinue = onSessionScreen
    ? undefined
    : actions.find((action) => action.promptId === SAVED_CONTINUE_PROMPT);
  const body = actions.filter(
    (action) =>
      action.actionId !== "back" && !inMenu(action) && action.promptId !== SAVED_CONTINUE_PROMPT,
  );
  const quit =
    actions.find((action) => action.promptId === "menu-quit") ??
    actions.find((action) => action.actionId === "quit-story");
  const isPinned = (action: OfferedAction) =>
    action.actionId === "continue" || action.label.trim().toLowerCase() === "cancel";
  const pinned = body.filter(isPinned);
  const acting = view.table?.groups.find((group) => group.heroId === view.table?.actingHeroId);
  const inside = acting?.inside === true;
  const showMoveMap =
    view.screen === "play" && !inside && body.some((action) => MOVE_CONTROLS.has(action.actionId));
  const inMoveMap = (action: OfferedAction) => showMoveMap && MOVE_CONTROLS.has(action.actionId);
  const mapActions = body.filter(inMoveMap);
  const walks = mapActions.filter((action) => action.actionId === "walk");
  const mapExtras = mapActions.filter((action) => action.actionId !== "walk");
  const scrolling = body.filter((action) => !isPinned(action) && !inMoveMap(action));
  const picking = view.screen === "claim-heroes";
  const pickMatch = picking ? /^(\d+) of (\d+) picked$/.exec(view.shows) : null;
  const seated = pickMatch ? Number(pickMatch[1]) : 0;
  const party = pickMatch ? Number(pickMatch[2]) : 0;
  const partyFull = pickMatch != null && party > 0 && seated >= party;
  const renderAction = (action: OfferedAction) => {
    const icon = action.actionId === "walk" ? "" : iconFor(action.actionId);
    const connectChoice = body.some((row) => row.actionId === "play-without-tower");
    const primary = !connectChoice || action.actionId === "tower-connect";
    return (
      <button
        key={`${action.promptId}:${action.actionId}`}
        type="button"
        className={primary ? "bt-primary" : "bt-secondary"}
        data-prompt-id={action.promptId}
        data-action-id={action.actionId}
        data-action={action.actionId}
        data-primary={connectChoice ? (primary ? "true" : "false") : undefined}
        disabled={!live || (picking && action.actionId === "continue" && !partyFull)}
        onClick={() => onAct(action.promptId, action.actionId)}
      >
        {icon ? (
          <span className="bt-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {action.label}
      </button>
    );
  };
  const showHold = picking || view.screen === "begin";
  const setupPrompt = view.actions.find((action) => action.promptId.startsWith("continue-setup-"));
  const setupStep =
    view.screen === "setup" && setupPrompt
      ? setupPrompt.promptId.slice("continue-setup-".length)
      : undefined;
  const sessionOver = view.screen === "session-over";
  // A game's stats take its name for the title; the rows are on the Story board.
  const onStats =
    onSessionScreen && view.actions.some((action) => action.promptId === STATS_PLAY_AGAIN_PROMPT);
  // The steps are on the Story board; the iPad shows only its one button (SCR-022).
  const stepsOnBoard = view.screen === "base-board";

  if (soundStep) {
    // Pick story starts with sound (Bob 2026-10-31): the prompt and its button, then the levels.
    const banner = errorBanner ?? audioError;
    return (
      <main
        className="bt-device"
        data-screen={view.screen}
        data-sound-step={enableSound ? "enable" : "levels"}
      >
        <div className="bt-scroll">
          {banner ? <DeviceErrorBanner {...banner} /> : null}
          {enableSound ? (
            <>
              <p className="mt-2 text-lg" data-step-instruction="">
                {ENABLE_SOUND_LINE}
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  className="bt-primary"
                  data-prompt-id={enableSound.promptId}
                  data-action-id={enableSound.actionId}
                  data-action={enableSound.actionId}
                  disabled={!live}
                  onClick={() => {
                    setAudioError(null);
                    // The resume starts inside this tap, as the browser requires.
                    unlockDeviceSound().then(
                      () => onAct(enableSound.promptId, enableSound.actionId),
                      (error: unknown) => setAudioError(audioFailure(error)),
                    );
                  }}
                >
                  {enableSound.label}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-lg" data-step-instruction="">
                {VOLUME_LINE}
              </p>
              <div className="mt-6 flex flex-col gap-3">
                {volumes.map((action, level) => (
                  <button
                    key={action.promptId}
                    type="button"
                    className="bt-secondary"
                    data-prompt-id={action.promptId}
                    data-action-id={action.actionId}
                    data-action={action.actionId}
                    disabled={!live}
                    onClick={() => {
                      setAudioError(null);
                      try {
                        playRoomVolume(level as 0 | 1 | 2);
                      } catch (error) {
                        setAudioError(audioFailure(error));
                        return;
                      }
                      onAct(action.promptId, action.actionId);
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                {keep ? (
                  <button
                    type="button"
                    className="bt-primary"
                    data-prompt-id={keep.promptId}
                    data-action-id={keep.actionId}
                    data-action={keep.actionId}
                    disabled={!live || !keep.open}
                    onClick={() => onAct(keep.promptId, keep.actionId)}
                  >
                    {keep.label}
                  </button>
                ) : null}
                {tryAnother ? (
                  <button
                    type="button"
                    className="bt-secondary"
                    data-prompt-id={tryAnother.promptId}
                    data-action-id={tryAnother.actionId}
                    data-action={tryAnother.actionId}
                    disabled={!live}
                    onClick={() => onAct(tryAnother.promptId, tryAnother.actionId)}
                  >
                    {tryAnother.label}
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
        <ChromeBar
          live={live}
          back={back}
          quit={quit}
          onAct={onAct}
          helpScreen={view.gear?.helpScreen}
          menu={menuContext(view)}
        />
      </main>
    );
  }

  const panel = ownsPanel(view);
  const towerLostPause =
    view.screen === "pause" && actions.some((action) => action.actionId === "reconnect");

  return (
    <main
      className="bt-device"
      data-screen={view.screen}
      data-setup-step={setupStep}
      data-paused={view.gear?.paused ? "true" : "false"}
      data-volume={view.gear?.volume ?? undefined}
    >
      <div className="bt-scroll">
        <div className="bt-kicker" data-step-context>
          {STEP_CONTEXT[view.screen] ?? view.screen}
        </div>
        <h1 className="text-2xl font-semibold text-[var(--bt-accent)]">
          {onStats ? view.shows : (SCREEN_TITLE[view.screen] ?? view.screen)}
        </h1>
        {errorBanner ? <DeviceErrorBanner {...errorBanner} /> : null}
        {panel ? (
          <GearDevicePanel gear={panel} live={live} onAct={onAct} />
        ) : towerLostPause ? (
          <TowerLostPause view={view} live={live} onAct={onAct} />
        ) : sessionOver ? (
          <p className="mt-2 text-lg" data-step-instruction="">
            {view.shows}
          </p>
        ) : onSessionScreen ? (
          <>
            <p
              className={onStats ? "sr-only" : "mt-2 whitespace-pre-line text-lg"}
              data-step-instruction=""
            >
              {view.shows}
            </p>
            <SessionButtons view={view} live={live} onAct={onAct} />
          </>
        ) : (
          <>
            <p
              className={stepsOnBoard ? "sr-only" : "mt-2 text-lg"}
              data-step-instruction=""
              data-day={view.table?.day}
              data-moves={view.table?.movesLeft ?? undefined}
              data-roll={view.table?.moveRoll ?? undefined}
              data-modifier={view.table?.modifier}
              data-acting-hero={view.table?.actingHeroId ?? undefined}
              data-space={acting?.spaceId}
              data-space-name={acting?.spaceName}
              data-building={acting?.building ?? ""}
              data-inside={acting?.inside ? "true" : "false"}
              data-pick-status={picking ? view.shows : undefined}
            >
              {view.shows}
            </p>
            {picking ? (
              <p className="mt-2 text-[var(--bt-muted)]" data-pick-help="">
                Who this iPad speaks for at the table
              </p>
            ) : null}
            {savedContinue ? (
              <div className="mt-4 flex flex-col gap-3">
                <button
                  type="button"
                  className="bt-secondary"
                  data-prompt-id={savedContinue.promptId}
                  data-action-id={savedContinue.actionId}
                  data-action={savedContinue.actionId}
                  data-saved-continue=""
                  disabled={!live}
                  onClick={() => onAct(savedContinue.promptId, savedContinue.actionId)}
                >
                  {savedContinue.label}
                </button>
              </div>
            ) : null}
            {view.settings?.map((setting) => (
              <div key={setting.id} className="mt-4 flex flex-col gap-3" data-setting={setting.id}>
                {setting.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="bt-secondary"
                    data-setting={setting.id}
                    data-option={option.id}
                    data-action="set"
                    aria-pressed={option.id === setting.optionId}
                    disabled={!live}
                    onClick={() =>
                      onAct("set-setting", "set", { settingId: setting.id, optionId: option.id })
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ))}
            {view.table ? (
              <ul className="mt-4" data-roster>
                {view.table.groups.map((group) => (
                  <li
                    key={group.heroId}
                    data-hero-place={group.heroId}
                    data-kingdom={group.kingdomLabel}
                    data-space-name={group.spaceName}
                    data-alone={group.alone ? "true" : "false"}
                  >
                    {group.heroName} · {group.kingdomLabel} · {group.spaceName}
                    {group.alone ? " · alone" : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            {view.heroes.map((hero) => (
              <section key={hero.id} className="mt-4" data-hero-panel={hero.id}>
                <h2 className="text-lg font-medium">{hero.name}</h2>
                {picking ? (
                  <p className="text-[var(--bt-muted)]" data-claim-state={hero.claim ?? "open"}>
                    {hero.claim === "yours"
                      ? "this iPad"
                      : hero.claim === "taken"
                        ? "another iPad"
                        : "unclaimed"}
                  </p>
                ) : null}
                {hero.lines.map((line) => (
                  <p key={line.id} className="text-[var(--bt-muted)]" data-private-line={line.id}>
                    {line.text}
                  </p>
                ))}
                {onHold && showHold ? (
                  <button
                    type="button"
                    className={
                      hero.claim === "taken" ? "bt-ghost bt-claim-taken mt-2" : "bt-secondary mt-2"
                    }
                    data-hunter={hero.id}
                    data-action="take"
                    data-claim={hero.claim ?? "open"}
                    aria-pressed={picking ? hero.claim === "yours" : undefined}
                    disabled={
                      !live ||
                      hero.claim === "taken" ||
                      (picking && partyFull && hero.claim !== "yours")
                    }
                    onClick={() => onHold(hero.id, hero.claim === "yours" ? "release" : "take")}
                  >
                    {picking
                      ? `Pick ${hero.name}`
                      : hero.claim === "taken"
                        ? `${hero.name} claimed`
                        : `Hold ${hero.name}`}
                  </button>
                ) : null}
              </section>
            ))}
            {showMoveMap ? (
              <section className="bt-move-map" data-move-map aria-label="Move">
                <p className="bt-tower-up" data-tower-up>
                  <span aria-hidden="true">▲</span> The Tower
                </p>
                <div className="bt-compass">
                  <svg
                    className="bt-compass-svg"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <circle cx="50" cy="50" r="38" />
                    <circle cx="50" cy="50" r="17" />
                    {COMPASS_SLOTS.map((slot) => (
                      <line
                        key={slot}
                        x1="50"
                        y1="50"
                        x2={SLOT_POINT[slot].x}
                        y2={SLOT_POINT[slot].y}
                      />
                    ))}
                  </svg>
                  <div className="bt-compass-you" data-you>
                    <span className="bt-compass-name">{acting?.spaceName}</span>
                    <span className="bt-compass-badge">YOU</span>
                  </div>
                  {COMPASS_SLOTS.map((slot) => {
                    const walk = walks.find((action) => action.slot === slot);
                    return (
                      <div
                        key={slot}
                        className="bt-compass-slot"
                        data-slot={slot}
                        style={{ left: `${SLOT_POINT[slot].x}%`, top: `${SLOT_POINT[slot].y}%` }}
                      >
                        {walk ? renderAction(walk) : null}
                      </div>
                    );
                  })}
                </div>
                {view.table?.movesLeft != null ? (
                  <p className="bt-moves-left" data-moves-left>
                    Moves left: {view.table.movesLeft}
                  </p>
                ) : null}
                {mapExtras.map(renderAction)}
              </section>
            ) : null}
            {view.screen === "pick-story" && view.doors && view.doors.length > 1 ? (
              <StoryNav doors={view.doors} live={live} onAct={onAct} />
            ) : null}
            {scrolling.length > 0 ? (
              <div className="mt-6 flex flex-col gap-3">{scrolling.map(renderAction)}</div>
            ) : null}
            {view.screen === "setup" ? (
              <div className="mt-6 flex flex-col gap-3">
                <p data-begin-lock="">The setup steps are not done.</p>
                <button
                  type="button"
                  className="bt-primary"
                  data-prompt-id="continue-begin"
                  disabled
                >
                  Begin
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
      {panel || sessionOver || onSessionScreen || pinned.length === 0 ? null : (
        <div className="bt-pinned flex flex-col gap-3">{pinned.map(renderAction)}</div>
      )}
      <ChromeBar
        live={live}
        back={back}
        quit={quit}
        onAct={onAct}
        helpScreen={view.gear?.helpScreen}
        menu={menuContext(view)}
      />
    </main>
  );
}
