"use client";

import type { DeviceView, OfferedAction } from "bloodtower-protocols";
import { useState } from "react";
import { DeviceErrorBanner, type DeviceErrorBannerModel } from "../errors/DeviceErrorBanner.tsx";

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
};

const iconFor = (actionId: string): string => {
  if (actionId === "walk") return "→";
  if (actionId === "enter") return "⌂";
  if (actionId === "leave") return "↩";
  if (actionId === "end-turn") return "■";
  return "";
};

const inMenu = (action: OfferedAction) =>
  action.promptId === "menu-quit" || action.promptId === "menu-connect";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const actions = openActions(view.actions);
  const back = actions.find((action) => action.actionId === "back");
  const body = actions.filter((action) => action.actionId !== "back" && !inMenu(action));
  const quit = actions.find((action) => action.promptId === "menu-quit");
  const connect = actions.find((action) => action.promptId === "menu-connect");
  const showHold = view.screen === "claim-heroes" || view.screen === "begin";
  const acting = view.table?.groups.find((group) => group.heroId === view.table?.actingHeroId);

  return (
    <main className="bt-device px-6 py-8" data-screen={view.screen}>
      <header className="bt-topbar" data-topbar>
        {back ? (
          <button
            type="button"
            className="bt-ghost"
            data-prompt-id={back.promptId}
            data-action-id={back.actionId}
            data-action="back"
            disabled={!live}
            onClick={() => onAct(back.promptId, back.actionId)}
          >
            Back
          </button>
        ) : (
          <button type="button" className="bt-ghost" data-action="back" disabled>
            Back
          </button>
        )}
        <button type="button" className="bt-ghost" data-action="replay" disabled>
          Replay
        </button>
        <button
          type="button"
          className="bt-ghost"
          data-action="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          Menu
        </button>
      </header>
      <div className="bt-menu" data-menu hidden={!menuOpen}>
        <section>
          <h2>Look up</h2>
          <div>Nothing to look up.</div>
        </section>
        <section>
          <h2>Table</h2>
          {connect ? (
            <button
              type="button"
              className="bt-secondary"
              data-prompt-id={connect.promptId}
              data-action-id={connect.actionId}
              data-action={connect.actionId}
              disabled={!live}
              onClick={() => onAct(connect.promptId, connect.actionId)}
            >
              {connect.label}
            </button>
          ) : (
            <div>The table stays as it is.</div>
          )}
        </section>
        <section>
          <h2>Leave</h2>
          {quit ? (
            <button
              type="button"
              className="bt-secondary"
              data-prompt-id={quit.promptId}
              data-action-id={quit.actionId}
              data-action={quit.actionId}
              disabled={!live}
              onClick={() => onAct(quit.promptId, quit.actionId)}
            >
              Quit story
            </button>
          ) : (
            <div>Quit story is not offered.</div>
          )}
        </section>
      </div>
      <h1 className="text-2xl font-semibold text-[var(--bt-accent)]">
        {SCREEN_TITLE[view.screen] ?? view.screen}
      </h1>
      <p
        className="mt-2 text-lg"
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
      {errorBanner ? <DeviceErrorBanner {...errorBanner} /> : null}
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
      <div className="mt-6 flex flex-col gap-3">
        {body.map((action) => {
          const icon = iconFor(action.actionId);
          return (
            <button
              key={`${action.promptId}:${action.actionId}`}
              type="button"
              className="bt-primary"
              data-prompt-id={action.promptId}
              data-action-id={action.actionId}
              data-action={action.actionId}
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
        })}
      </div>
    </main>
  );
}
