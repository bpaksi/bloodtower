"use client";

import {
  type ControlAction,
  type ControlLock,
  type DeviceState,
  type TowerSnapshot,
  VOLUME_ANSWERS,
  VOLUME_NOTE_MAX,
} from "bloodtower-protocols";
import { useState } from "react";
import { displayCaption } from "../../lib/caption.ts";
import {
  chosenStory,
  focusedStory,
  gameSettingsNext,
  neighborStory,
  playersText,
  SCREEN_NEXT,
  SCREEN_TITLE,
  setupStepTitle,
  towerReady,
  towerRequiredReason,
} from "../../lib/screens";
import { towerStatusLines } from "../../lib/towerStatus";
import { VOLUME_ANSWER_LABEL, VOLUME_QUESTION, volumeIsPlaying } from "../../lib/volumeTest.ts";
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
  onControl?: (
    promptId: string,
    action: ControlAction,
    option?: string,
    setting?: string,
    note?: string,
  ) => void;
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
  const chosen = chosenStory(state.stories, state.gameSettings ?? null);
  // A story that needs the tower has no "Play without tower" (R3-UI-23).
  const towerRequired = chosen?.tower === "required";
  const towerReason =
    state.screen === "tower-connect" && !controls.continue
      ? towerRequiredReason(chosen, tower)
      : null;
  const waitReason = partyReason ?? towerReason;
  const primaryContinue =
    controls.continue &&
    (state.screen === "pick-story" ||
      state.screen === "game-settings" ||
      state.screen === "tower-volume-test" ||
      state.screen === "party-join" ||
      state.screen === "setup" ||
      (state.screen === "play" && !controls.resume) ||
      (state.screen === "tower-connect" && (ready || towerRequired)));
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
          {waitReason
            ? `Waiting: ${waitReason}`
            : state.screen === "game-settings"
              ? gameSettingsNext(chosen)
              : SCREEN_NEXT[state.screen]}
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
          skip={controls.continue && !ready && !towerRequired}
        />
      ) : null}
      {state.screen === "tower-volume-test" ? (
        <VolumeTestDevice
          test={state.volumeTest ?? null}
          playEnabled={controls.volumePlay}
          answerEnabled={controls.volumeAnswer}
          onPlay={() => {
            if (controls.volumePlay && state.volumePlayPromptId) {
              onControl?.(state.volumePlayPromptId, "volume-play");
            }
          }}
          onAnswer={(option, note) => {
            if (controls.volumeAnswer && state.volumeAnswerPromptId) {
              onControl?.(state.volumeAnswerPromptId, "volume-answer", option, undefined, note);
            }
          }}
        />
      ) : null}
      {state.screen === "pick-story" ? (
        <PickStoryDevice stories={state.stories} live={live} onFocusStory={onFocusStory} />
      ) : null}
      {state.screen === "game-settings" ? (
        <GameSettingsDevice
          stories={state.stories}
          settings={state.gameSettings ?? null}
          enabled={controls.set}
          onSet={(setting, option) => {
            if (controls.set && state.setPromptId) {
              onControl?.(state.setPromptId, "set", option, setting);
            }
          }}
        />
      ) : null}
      {state.screen === "party-join" ? (
        <PartyJoinDevice roster={roster} held={state.heldHunters} live={live} onHold={onHold} />
      ) : null}
      {state.screen === "setup" ? <SetupDevice step={state.setupStep ?? null} /> : null}
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
            state.screen === "not-playable" ||
            (state.pick !== null && state.pick !== undefined) ||
            (state.screen === "tower-connect" && !ready && !towerRequired) ||
            (state.screen === "play" && controls.resume)
          }
          disabled={!controls.continue}
          onClick={() => press(state.prompt?.id ?? null, "continue", controls.continue)}
        >
          {state.prompt?.id.startsWith("continue-") ? state.prompt.label : "Continue"}
        </button>
        <button
          type="button"
          className="bt-secondary"
          data-action="back"
          hidden={!BACK_SCREENS.has(state.screen)}
          disabled={!controls.back}
          onClick={() => press(controls.backPromptId, "back", controls.back)}
        >
          Back
        </button>
        {waitReason && !controls.continue ? (
          <p className="text-lg text-[var(--bt-muted)]">Disabled: {waitReason}.</p>
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

/** The start-up screens with Back (R3-UI-37). */
const BACK_SCREENS: ReadonlySet<DeviceState["screen"]> = new Set([
  "not-playable",
  "game-settings",
  "tower-connect",
  "tower-volume-test",
  "party-join",
  "setup",
  "begin",
]);

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

/**
 * The tower volume test (Proving Ground section 6a). Text and buttons only. With a tower: Play
 * levels, then the question with its answers and a write-in. With no tower there is nothing to
 * press but Continue. The write-in text goes only with its own press and is never shown here
 * again or on another device.
 */
const VolumeTestDevice = ({
  test,
  playEnabled,
  answerEnabled,
  onPlay,
  onAnswer,
}: {
  test: DeviceState["volumeTest"] | null;
  playEnabled: boolean;
  answerEnabled: boolean;
  onPlay: () => void;
  onAnswer: (option: string, note?: string) => void;
}) => {
  const [note, setNote] = useState("");
  if (!test) return null;
  if (test.mode === "room") {
    return (
      <article className="bt-card space-y-2" data-volume-mode="room">
        <p className="text-xl">No tower is connected. Check that the board is playing sound.</p>
      </article>
    );
  }
  const playing = volumeIsPlaying(test);
  return (
    <section className="flex flex-col gap-4" data-volume-phase={test.phase}>
      {playing ? (
        <p className="text-xl" role="status">
          {test.phase === "levels"
            ? `Level ${test.level ?? 0} is playing.`
            : "The tower is playing."}
        </p>
      ) : null}
      {test.failed ? (
        <p className="text-xl" role="status">
          The tower did not play that sound. Nothing was sent again.
        </p>
      ) : null}
      {test.phase === "idle" || test.phase === "asking" ? (
        <button
          type="button"
          className={test.phase === "idle" ? "bt-primary" : "bt-secondary"}
          data-action="volume-play"
          disabled={!playEnabled}
          onClick={onPlay}
        >
          {test.runs === 0 ? "Play levels" : "Play again"}
        </button>
      ) : null}
      {test.phase === "asking" ? (
        <fieldset className="flex flex-col gap-3" data-volume-question="">
          <legend className="bt-kicker">{VOLUME_QUESTION}</legend>
          {VOLUME_ANSWERS.filter((answer) => answer !== "write-in").map((answer) => (
            <button
              key={answer}
              type="button"
              className="bt-primary"
              data-action="volume-answer"
              data-answer={answer}
              disabled={!answerEnabled}
              onClick={() => onAnswer(answer)}
            >
              {VOLUME_ANSWER_LABEL[answer]}
            </button>
          ))}
          <label className="flex flex-col gap-2">
            <span className="text-lg">Or write what you heard</span>
            <input
              type="text"
              className="bt-input"
              data-volume-note=""
              maxLength={VOLUME_NOTE_MAX}
              value={note}
              disabled={!answerEnabled}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="bt-secondary"
            data-action="volume-answer"
            data-answer="write-in"
            disabled={!answerEnabled || note.trim() === ""}
            onClick={() => onAnswer("write-in", note.trim())}
          >
            Send what I wrote
          </button>
        </fieldset>
      ) : null}
      {test.phase === "answered" && test.answer ? (
        <p className="text-xl" role="status">
          Answered: {VOLUME_ANSWER_LABEL[test.answer]}.
        </p>
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
  const tagline = focus?.tagline ?? focus?.blurb ?? null;
  return (
    <section className="flex flex-col gap-3">
      <article className="bt-card space-y-2" data-story={focus?.id}>
        <p className="bt-kicker">Story</p>
        <h2 className="text-3xl">{focus ? focus.title : "Stories unavailable."}</h2>
        {tagline ? <p className="text-xl">{tagline}</p> : null}
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
            Previous
          </button>
          <button
            type="button"
            className="bt-secondary"
            data-action="story-next"
            disabled={!live}
            onClick={() => onFocusStory?.(next.id)}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
};

/**
 * Game settings (R3-UI-22): one group of large buttons per setting, one button per option.
 * Text and buttons only: no cover on the device (R3-UI-51). Each tap is a `set` press.
 */
const GameSettingsDevice = ({
  stories,
  settings,
  enabled,
  onSet,
}: {
  stories: DeviceState["stories"];
  settings: NonNullable<DeviceState["gameSettings"]> | null;
  enabled: boolean;
  onSet: (setting: string, option: string) => void;
}) => {
  const story = chosenStory(stories, settings);
  return (
    <section className="flex flex-col gap-4" data-game-settings={settings?.story ?? ""}>
      <h2 className="text-3xl">{story ? story.title : "Story unavailable."}</h2>
      {!settings || settings.settings.length === 0 ? (
        <p className="text-xl">This story has no settings.</p>
      ) : null}
      {settings?.settings.map((setting) => (
        <fieldset key={setting.id} className="flex flex-col gap-2" data-setting={setting.id}>
          <legend className="bt-kicker">{setting.label}</legend>
          <div className="flex flex-wrap gap-3">
            {setting.options.map((option) => {
              const chosen = settings.chosen[setting.id] === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={chosen ? "bt-primary" : "bt-secondary"}
                  data-action="set"
                  data-option={option.id}
                  aria-pressed={chosen}
                  disabled={!enabled}
                  onClick={() => onSet(setting.id, option.id)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </section>
  );
};

/**
 * Claim Hunters (R3-UI-21): hunter names from the pack, text buttons only. Portraits show on the
 * board, never on a device (R3-UI-51).
 */
const PartyJoinDevice = ({
  roster,
  held,
  live,
  onHold,
}: {
  roster: readonly { id: string; name: string; portrait?: string }[];
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
              className={mineHunter ? "bt-primary" : "bt-secondary"}
              disabled={!live}
              data-action={mineHunter ? "release" : "take"}
              data-hunter={hunter.id}
              aria-pressed={mineHunter}
              onClick={() => onHold?.(hunter.id, mineHunter ? "release" : "take")}
            >
              {mineHunter ? `${hunter.name}: Mine` : `Claim ${hunter.name}`}
            </button>
          );
        })}
      </div>
    </section>
  );
};

/** One setup step (R-WIZ-6): the step text, then Done and Back below. No illustration here. */
const SetupDevice = ({ step }: { step: DeviceState["setupStep"] }) => (
  <article className="bt-card space-y-2" data-setup-step={step?.id ?? ""}>
    {step ? (
      <>
        <p className="bt-kicker">{setupStepTitle(step)}</p>
        <p className="text-2xl">{step.label}</p>
      </>
    ) : (
      <p className="text-2xl">Setup step unavailable.</p>
    )}
  </article>
);

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
