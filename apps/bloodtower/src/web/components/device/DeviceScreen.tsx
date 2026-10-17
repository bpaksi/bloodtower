"use client";

import type { ControlAction, ControlLock, DeviceState, TowerSnapshot } from "bloodtower-protocols";
import { SCREEN_NEXT, SCREEN_TITLE, TABLE_STORY } from "../../lib/screens";
import { towerStatusLines } from "../../lib/towerStatus";
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
}: {
  live: boolean;
  deviceId: string | null;
  state: DeviceState;
  pausePromptId: string | null;
  connectLock: ControlLock | null;
  calibrateLock: ControlLock | null;
  tower: TowerSnapshot;
  onControl?: (promptId: string, action: ControlAction) => void;
  onHold?: (hunter: string, action: "take" | "release") => void;
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
  const primaryContinue =
    controls.continue &&
    (state.screen === "pick-story" ||
      state.screen === "party-join" ||
      (state.screen === "play" && !controls.resume) ||
      (state.screen === "tower-connect" && !controls.towerConnect && !controls.towerCalibrate));
  const primaryBegin = state.screen === "begin" && controls.begin;

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-6 py-10"
      data-layout="ipad"
      data-screen={state.screen}
    >
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
        <TowerConnectDevice controls={controls} press={press} promptId={state.prompt?.id ?? null} />
      ) : null}
      {state.screen === "pick-story" ? <PickStoryDevice /> : null}
      {state.screen === "party-join" ? (
        <PartyJoinDevice roster={roster} held={state.heldHunters} live={live} onHold={onHold} />
      ) : null}
      {state.screen === "begin" ? <BeginDevice /> : null}
      {state.views.length > 0 ? <PlayDevice views={state.views} /> : null}

      {controls.gameplayLock ? <p role="status">{controls.gameplayLock}</p> : null}
      {controls.connectLock ? <p role="status">{controls.connectLock}</p> : null}
      {controls.calibrateLock ? <p role="status">{controls.calibrateLock}</p> : null}

      <section className="flex flex-col gap-3">
        {state.screen === "tower-connect" ? null : (
          <>
            <button
              type="button"
              className="bt-secondary"
              data-action="tower-connect"
              disabled={!controls.towerConnect}
              onClick={() => press("tower-connect", "tower-connect", controls.towerConnect)}
            >
              Connect tower
            </button>
            <button
              type="button"
              className="bt-secondary"
              data-action="tower-calibrate"
              disabled={!controls.towerCalibrate}
              onClick={() => press("tower-calibrate", "tower-calibrate", controls.towerCalibrate)}
            >
              Calibrate
            </button>
          </>
        )}
        <button
          type="button"
          className={primaryBegin ? "bt-primary" : "bt-ghost"}
          data-action="begin"
          data-primary={primaryBegin ? "true" : undefined}
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
          disabled={!controls.continue}
          onClick={() => press(state.prompt?.id ?? null, "continue", controls.continue)}
        >
          {state.prompt?.id.startsWith("continue-") ? state.prompt.label : "Continue"}
        </button>
        {partyReason && !controls.continue ? (
          <p className="text-lg text-[var(--bt-muted)]">Disabled: {partyReason}.</p>
        ) : null}
        {state.screen === "play" ? (
          <>
            <button
              type="button"
              className="bt-ghost"
              data-action="pause"
              disabled={!controls.pause}
              onClick={() => press(pausePromptId, "pause", controls.pause)}
            >
              Menu
            </button>
            <button
              type="button"
              className="bt-primary"
              data-action="resume"
              disabled={!controls.resume}
              onClick={() => press(state.prompt?.id ?? null, "resume", controls.resume)}
            >
              Resume
            </button>
            <button
              type="button"
              className="bt-secondary"
              data-action="quit"
              disabled={!controls.quit}
              onClick={() => press(state.quitPromptId ?? null, "quit", controls.quit)}
            >
              Quit
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="bt-ghost"
              data-action="pause"
              disabled={!controls.pause}
              onClick={() => press(pausePromptId, "pause", controls.pause)}
            >
              Menu
            </button>
            <button
              type="button"
              className="bt-ghost"
              data-action="resume"
              disabled={!controls.resume}
              onClick={() => press(state.prompt?.id ?? null, "resume", controls.resume)}
            >
              Resume
            </button>
            <button
              type="button"
              className="bt-ghost"
              data-action="quit"
              disabled={!controls.quit}
              onClick={() => press(state.quitPromptId ?? null, "quit", controls.quit)}
            >
              Quit
            </button>
          </>
        )}
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
}: {
  controls: ReturnType<typeof deviceControls>;
  press: (promptId: string | null, action: ControlAction, enabled: boolean) => void;
  promptId: string | null;
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
      <button
        type="button"
        className={!connectPrimary && !calibratePrimary ? "bt-primary" : "bt-secondary"}
        data-action="play-without-tower"
        disabled={!controls.continue}
        onClick={() => press(promptId, "continue", controls.continue)}
      >
        Play without tower
      </button>
    </section>
  );
};

const PickStoryDevice = () => (
  <article className="bt-card space-y-2">
    <p className="bt-kicker">Story</p>
    <h2 className="text-3xl">{TABLE_STORY.title}</h2>
    <p className="text-xl">{TABLE_STORY.blurb}</p>
    <p className="text-[var(--bt-muted)]">{TABLE_STORY.players}</p>
  </article>
);

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
            {mineHunter ? `${hunter.name}: Mine` : `Claim ${hunter.name}`}
          </button>
        );
      })}
    </section>
  );
};

const BeginDevice = () => (
  <article className="bt-card text-xl">
    <p>Any joined iPad can begin. First press wins.</p>
  </article>
);

const PlayDevice = ({ views }: { views: DeviceState["views"] }) => (
  <section className="flex flex-col gap-3 text-xl">
    {views.map((view) => (
      <article key={view.hunter} className="bt-card">
        <h2 className="text-2xl">{view.name}</h2>
        <p>
          {view.privateMoment ? `${view.name}: ${view.privateMoment.text}` : "No private line."}
        </p>
      </article>
    ))}
  </section>
);
