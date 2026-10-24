"use client";

import type { DeviceView, OfferedAction } from "bloodtower-protocols";
import { DeviceErrorBanner, type DeviceErrorBannerModel } from "../errors/DeviceErrorBanner.tsx";

const openActions = (actions: OfferedAction[]) => actions.filter((action) => action.open);

/** v2 device UI: private lines and offered actions become presses via `act`. */
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
  return (
    <main className="bt-device px-6 py-8" data-screen={view.screen}>
      <h1 className="text-2xl font-semibold text-[var(--bt-accent)] capitalize">
        {view.screen.replace(/-/g, " ")}
      </h1>
      <p className="mt-2 text-lg">{view.shows}</p>
      {errorBanner ? <DeviceErrorBanner {...errorBanner} /> : null}
      {view.heroes.map((hero) => (
        <section key={hero.id} className="mt-4" data-hero-panel={hero.id}>
          <h2 className="text-lg font-medium">{hero.name}</h2>
          {hero.lines.map((line) => (
            <p key={line.id} className="text-[var(--bt-muted)]" data-private-line={line.id}>
              {line.text}
            </p>
          ))}
          {onHold ? (
            <button
              type="button"
              className="bt-btn mt-2"
              data-hunter={hero.id}
              data-action="take"
              disabled={!live}
              onClick={() => onHold(hero.id, "take")}
            >
              Hold {hero.name}
            </button>
          ) : null}
        </section>
      ))}
      <div className="mt-6 flex flex-col gap-3">
        {actions.map((action) => (
          <button
            key={`${action.promptId}:${action.actionId}`}
            type="button"
            className="bt-btn"
            data-prompt-id={action.promptId}
            data-action-id={action.actionId}
            data-action={action.actionId}
            disabled={!live}
            onClick={() => onAct(action.promptId, action.actionId)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </main>
  );
}
