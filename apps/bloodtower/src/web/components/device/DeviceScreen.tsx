"use client";

import type { ControlAction, ControlLock, DeviceState, TowerSnapshot } from "bloodtower-protocols";
import { displayCaption } from "../../lib/caption.ts";
import {
  focusedStory,
  neighborStory,
  playersText,
  SCREEN_NEXT,
  SCREEN_TITLE,
  towerReady,
} from "../../lib/screens";
import { towerStatusLines } from "../../lib/towerStatus";
import { PortraitCard } from "../PortraitCard";
import { deviceControls } from "./controls";

/**
 * The joined iPad: the current flow screen, private lines for hunters it holds,
 * and the only controls. Presses are handed to the caller.
 */
export function DeviceScreen({
  live,
  deviceId,
  state,
  pausePromptId,
  connectLock,
  calibrateLock,
  tower,
  onControl,
  onHold,
  onFocusStory,
}: {
  live: boolean;
  deviceId: string | null;
  state: DeviceState;
  pausePromptId: string | null;
  connectLock: ControlLock | null;
  calibrateLock: ControlLock | null;
  tower: TowerSnapshot;
  onControl?: (promptId: string, action: ControlAction, option?: string) => void;
  onHold?: (hunter: string, action: "take" | "release") => void;
  onFocusStory?: (story: string) => void;
}) {
  const controls = deviceControls({
    live,
    state,
    pausePromptId,
    connectLock,
    calibrateLock,
    tower,
    deviceId,
  });
  const status = towerStatusLines(tower);
  const press = (promptId: string | null, action: ControlAction, enabled: boolean) => {
    if (!enabled || !promptId) return;
    onControl?.(promptId, action);
  };
  const roster = state.roster ?? [];
  const partyReason =
    state.screen === "party-join" && !controls.continue ? "Claim all hunters first" : null;
  const ready = towerReady(tower);
  const primaryContinue =
    controls.continue &&
    (state.screen === "pick-story" ||
      state.screen === "party-join" ||
      (state.screen === "play" && !controls.resume) ||
      (state.screen === "tower-connect" && ready));
  const primaryBegin = state.screen === "begin" && controls.begin;

  return (
    <main
      className="relative mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-6 py-10"
      data-layout="ipad"
      data-screen={state.screen}
    >
      {state.screen === "play" ? (
        <button
          type="button"
          className="bt-ghost bt-menu"
          data-action="pause"
          disabled={!controls.pause}
          onClick={() => press(pausePromptId, "pause", controls.pause)}
        >
          Menu
        </button>
      ) : null}
      <header className="space-y-2">
        <p className="bt-kicker">iPad</p>
        <h1 className="text-4xl">{SCREEN_TITLE[state.screen]}</h1>
        <p className="text-xl text-[var(--bt-muted)]">
          {partyReason ? `Waiting: ${partyReason}` : SCREEN_NEXT[state.screen]}
        </p>
      </header>
      {live ? null : <p>Session host unavailable.</p>}
      <p>
        Tower {status.connection}. Battery {status.battery}. Calibration {status.calibration}.
      </p>

      {state.screen === "splash" ? <SplashDevice /> : null}
      {state.screen === "tower-connect" ? (
        <TowerConnectDevice
          controls={controls}
          press={press}
          promptId={state.prompt?.id ?? null}
          skip={controls.continue && !ready}
        />
      ) : null}
      {state.screen === "pick-story" ? (
        <PickStoryDevice stories={state.stories} live={live} onFocusStory={onFocusStory} />
      ) : null}
      {state.screen === "party-join" ? (
        <PartyJoinDevice roster={roster} held={state.heldHunters} live={live} onHold={onHold} />
      ) : null}
      {state.screen === "begin" ? <BeginDevice /> : null}
      {state.views.length > 0 && (state.screen === "play" || state.screen === "quit") ? (
        <PlayDevice views={state.views} />
      ) : null}
      {state.pick ? (
        <PickDevice
          pick={state.pick}
          enabled={controls.pick}
          onChoose={(option) => {
            if (controls.pick && state.prompt) onControl?.(state.prompt.id, "pick", option);
          }}
        />
      ) : null}
      {state.views.length > 0 && state.screen !== "play" && state.screen !== "quit" ? (
        <section className="flex flex-wrap gap-2">
          {state.views.map((view) => (
            <h2 key={view.hunter} className="bt-card py-2 text-xl">
              {view.name}
            </h2>
          ))}
        </section>
      ) : null}

      {controls.gameplayLock ? <p role="status">{controls.gameplayLock}</p> : null}
      {controls.connectLock ? <p role="status">{controls.connectLock}</p> : null}
      {controls.calibrateLock ? <p role="status">{controls.calibrateLock}</p> : null}

      <section className="flex flex-col gap-3">
        <button
          type="button"
          className={primaryBegin ? "bt-primary" : "bt-ghost"}
          data-action="begin"
          data-primary={primaryBegin ? "true" : undefined}
          hidden={state.screen !== "begin"}
          disabled={!controls.begin}
          onClick={() => press(state.prompt?.id ?? null, "begin", controls.begin)}
        >
          {controls.begin ? "Begin the story" : "Begin"}
        </button>
        <button
          type="button"
          className={primaryContinue ? "bt-primary" : "bt-ghost"}
          data-action="continue"
          data-primary={primaryContinue ? "true" : undefined}
          hidden={
            state.screen === "begin" ||
            state.screen === "splash" ||
            state.screen === "quit" ||
            (state.pick !== null && state.pick !== undefined) ||
            (state.screen === "tower-connect" && !ready) ||
            (state.screen === "play" && controls.resume)
          }
          disabled={!controls.continue}
          onClick={() => press(state.prompt?.id ?? null, "continue", controls.continue)}
        >
          {state.prompt?.id.startsWith("continue-") ? state.prompt.label : "Continue"}
        </button>
        {partyReason && !controls.continue ? (
          <p className="text-lg text-[var(--bt-muted)]">Disabled: {partyReason}.</p>
        ) : null}
        <button
          type="button"
          className={controls.resume ? "bt-primary" : "bt-ghost"}
          data-action="resume"
          hidden={state.screen !== "play"}
          disabled={!controls.resume}
          onClick={() => press(state.prompt?.id ?? null, "resume", controls.resume)}
        >
          Resume
        </button>
        <button
          type="button"
          className="bt-secondary"
          data-action="quit"
          hidden={state.screen !== "play"}
          disabled={!controls.quit}
          onClick={() => press(state.quitPromptId ?? null, "quit", controls.quit)}
        >
          Quit
        </button>
      </section>
    </main>
  );
}

const SplashDevice = () => (
  <article className="bt-card text-2xl">
    <p>Game is loading...</p>
  </article>
);

const TowerConnectDevice = ({
  controls,
  press,
  promptId,
  skip,
}: {
  controls: ReturnType<typeof deviceControls>;
  press: (promptId: string | null, action: ControlAction, enabled: boolean) => void;
  promptId: string | null;
  skip: boolean;
}) => {
  const connectPrimary = controls.towerConnect;
  const calibratePrimary = !connectPrimary && controls.towerCalibrate;
  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        className={connectPrimary ? "bt-primary" : "bt-secondary"}
        data-action="tower-connect"
        data-primary={connectPrimary ? "true" : undefined}
        disabled={!controls.towerConnect}
        onClick={() => press("tower-connect", "tower-connect", controls.towerConnect)}
      >
        Connect tower
      </button>
      <button
        type="button"
        className={calibratePrimary ? "bt-primary" : "bt-secondary"}
        data-action="tower-calibrate"
        data-primary={calibratePrimary ? "true" : undefined}
        disabled={!controls.towerCalibrate}
        onClick={() => press("tower-calibrate", "tower-calibrate", controls.towerCalibrate)}
      >
        Calibrate
      </button>
      {skip ? (
        <button
          type="button"
          className="bt-secondary"
          data-action="play-without-tower"
          disabled={!controls.continue}
          onClick={() => press(promptId, "continue", controls.continue)}
        >
          Play without tower
        </button>
      ) : null}
    </section>
  );
};

const PickStoryDevice = ({
  stories,
  live,
  onFocusStory,
}: {
  stories: DeviceState["stories"];
  live: boolean;
  onFocusStory?: (story: string) => void;
}) => {
  const focus = focusedStory(stories);
  const previous = neighborStory(stories, -1);
  const next = neighborStory(stories, 1);
  const players = focus ? playersText(focus.players) : null;
  return (
    <section className="flex flex-col gap-3">
      <article className="bt-card space-y-2" data-story={focus?.id}>
        <p className="bt-kicker">Story</p>
        <h2 className="text-3xl">{focus ? focus.title : "Stories unavailable."}</h2>
        {focus?.blurb ? <p className="text-xl">{focus.blurb}</p> : null}
        {players ? <p className="text-[var(--bt-muted)]">{players}</p> : null}
        {focus && !focus.loadable ? <p className="text-xl">Can't load</p> : null}
      </article>
      {previous && next ? (
        <div className="flex gap-3">
          <button
            type="button"
            className="bt-secondary"
            data-action="story-previous"
            disabled={!live}
            onClick={() => onFocusStory?.(previous.id)}
          >
            Previous story
          </button>
          <button
            type="button"
            className="bt-secondary"
            data-action="story-next"
            disabled={!live}
            onClick={() => onFocusStory?.(next.id)}
          >
            Next story
          </button>
        </div>
      ) : null}
    </section>
  );
};

const PartyJoinDevice = ({
  roster,
  held,
  live,
  onHold,
}: {
  roster: readonly { id: string; name: string }[];
  held: readonly string[];
  live: boolean;
  onHold?: (hunter: string, action: "take" | "release") => void;
}) => {
  const mine = held.length;
  const takeAll = () => {
    for (const hunter of roster) {
      if (!held.includes(hunter.id)) onHold?.(hunter.id, "take");
    }
  };
  return (
    <section className="flex flex-col gap-3">
      <p>{roster.length === 0 ? "Hunters unavailable." : `${mine} of ${roster.length} mine`}</p>
      {roster.length > 0 ? (
        <button
          type="button"
          className="bt-secondary"
          data-action="take-all"
          disabled={!live || roster.every((hunter) => held.includes(hunter.id))}
          onClick={takeAll}
        >
          Take all
        </button>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        {roster.map((hunter) => {
          const mineHunter = held.includes(hunter.id);
          return (
            <button
              key={hunter.id}
              type="button"
              className="bt-ghost"
              disabled={!live}
              data-action={mineHunter ? "release" : "take"}
              data-hunter={hunter.id}
              onClick={() => onHold?.(hunter.id, mineHunter ? "release" : "take")}
            >
              <PortraitCard
                name={hunter.name}
                label={mineHunter ? `${hunter.name}: Mine` : `Claim ${hunter.name}`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
};

const BeginDevice = () => (
  <article className="bt-card text-xl">
    <p>Any joined iPad can begin. First press wins.</p>
  </article>
);

/** One button per option from the pack. Tapping one is a `pick` press; the server decides it. */
const PickDevice = ({
  pick,
  enabled,
  onChoose,
}: {
  pick: NonNullable<DeviceState["pick"]>;
  enabled: boolean;
  onChoose: (option: string) => void;
}) => (
  <section className="flex flex-col gap-3 text-xl" aria-label="Choice">
    <p className="text-2xl">{pick.prompt}</p>
    {pick.options.map((option) => (
      <button
        key={option.id}
        type="button"
        className="bt-primary"
        data-action="pick"
        data-pick={option.id}
        disabled={!enabled}
        onClick={() => onChoose(option.id)}
      >
        {option.label}
      </button>
    ))}
  </section>
);

const PlayDevice = ({ views }: { views: DeviceState["views"] }) => (
  <section className="flex flex-col gap-3 text-xl">
    {views.map((view) => (
      <article key={view.hunter} className="bt-card">
        <h2 className="text-2xl">{view.name}</h2>
        <p>
          {view.privateMoment
            ? `${view.name}: ${displayCaption(view.privateMoment.text)}`
            : "No private line."}
        </p>
      </article>
    ))}
  </section>
);
