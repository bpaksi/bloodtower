"use client";

import type { DeviceView, OfferedAction } from "bloodtower-protocols";
import { DeviceErrorBanner, type DeviceErrorBannerModel } from "../errors/DeviceErrorBanner.tsx";
import { GoodbyeTeardown } from "../GoodbyeTeardown.tsx";
import { ChromeBar } from "./ChromeBar.tsx";

const openActions = (actions: OfferedAction[]) => actions.filter((action) => action.open);

const SCREEN_TITLE: Record<string, string> = {
  splash: "Blood Tower",
  "pick-story": "Pick a story",
  "pick-game": "Pick a game",
  "game-settings": "Game settings",
  "tower-connect": "Connect the tower",
  "claim-heroes": "Claim heroes",
  setup: "Board setup",
  begin: "Begin",
  play: "The move",
  pause: "Paused",
  session: "Session",
  goodbye: "Goodbye",
  "not-playable": "Not playable yet",
};

/** Existing step names (view.ts STEP_NAME). Shown as context; the instruction stays `shows`. */
const STEP_CONTEXT: Record<string, string> = {
  splash: "Splash",
  "tower-connect": "Tower Connect",
  "pick-story": "Pick Story",
  "game-settings": "Game settings",
  "claim-heroes": "Party Join",
  setup: "Setup",
  begin: "Begin",
  "pick-game": "Pick a game",
  play: "Play",
  pause: "Paused",
  session: "Session",
  goodbye: "Goodbye",
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

const iconFor = (actionId: string): string => {
  if (actionId === "walk") return "→";
  if (actionId === "enter") return "⌂";
  if (actionId === "leave") return "↩";
  if (actionId === "end-turn") return "■";
  return "";
};

const inMenu = (action: OfferedAction) =>
  action.promptId === "menu-quit" || action.promptId === "menu-connect";

/** Walk, Enter, and End turn. Leave stays outside this region (DEC-220). */
const MOVE_CONTROLS = new Set(["walk", "enter", "end-turn"]);

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
  const actions = openActions(view.actions);
  const back = actions.find((action) => action.actionId === "back");
  const body = actions.filter((action) => action.actionId !== "back" && !inMenu(action));
  const quit = actions.find((action) => action.promptId === "menu-quit");
  const connect = actions.find((action) => action.promptId === "menu-connect");
  const isPinned = (action: OfferedAction) =>
    action.actionId === "continue" || action.label.trim().toLowerCase() === "cancel";
  const pinned = body.filter(isPinned);
  const acting = view.table?.groups.find((group) => group.heroId === view.table?.actingHeroId);
  const inside = acting?.inside === true;
  const showMoveMap =
    view.screen === "play" && !inside && body.some((action) => MOVE_CONTROLS.has(action.actionId));
  const inMoveMap = (action: OfferedAction) => showMoveMap && MOVE_CONTROLS.has(action.actionId);
  const mapActions = body.filter(inMoveMap);
  const scrolling = body.filter((action) => !isPinned(action) && !inMoveMap(action));
  const renderAction = (action: OfferedAction) => {
    const icon = iconFor(action.actionId);
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
        disabled={!live}
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
  const showHold = view.screen === "claim-heroes" || view.screen === "begin";
  const setupPrompt = view.actions.find((action) => action.promptId.startsWith("continue-setup-"));
  const setupStep =
    view.screen === "setup" && setupPrompt
      ? setupPrompt.promptId.slice("continue-setup-".length)
      : undefined;
  const farewell = view.screen === "goodbye";

  return (
    <main className="bt-device" data-screen={view.screen} data-setup-step={setupStep}>
      <div className="bt-scroll">
        <div className="bt-kicker" data-step-context>
          {STEP_CONTEXT[view.screen] ?? view.screen}
        </div>
        <h1 className="text-2xl font-semibold text-[var(--bt-accent)]">
          {SCREEN_TITLE[view.screen] ?? view.screen}
        </h1>
        {errorBanner ? <DeviceErrorBanner {...errorBanner} /> : null}
        {farewell ? (
          <GoodbyeTeardown shows={view.shows} />
        ) : (
          <>
            <p
              className="mt-2 text-lg"
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
            >
              {view.shows}
            </p>
            {view.table ? (
              <ul className="mt-4" data-roster>
                {view.table.groups.map((group) => (
                  <li key={group.heroId} data-hero-place={group.heroId}>
                    {group.heroName} · {group.kingdomLabel} · {group.spaceName}
                    {group.alone ? " · alone" : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            {view.heroes.map((hero) => (
              <section key={hero.id} className="mt-4" data-hero-panel={hero.id}>
                <h2 className="text-lg font-medium">{hero.name}</h2>
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
                    disabled={!live || hero.claim === "taken"}
                    onClick={() => onHold(hero.id, "take")}
                  >
                    {hero.claim === "taken" ? `${hero.name} claimed` : `Hold ${hero.name}`}
                  </button>
                ) : null}
              </section>
            ))}
            {showMoveMap ? (
              <section className="bt-move-map" data-move-map aria-label="Move">
                {mapActions.map(renderAction)}
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
      {farewell || pinned.length === 0 ? null : (
        <div className="bt-pinned flex flex-col gap-3">{pinned.map(renderAction)}</div>
      )}
      <ChromeBar live={live} back={back} connect={connect} quit={quit} onAct={onAct} />
    </main>
  );
}
