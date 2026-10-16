"use client";

import type { ControlAction, ControlLock, DeviceState, TowerSnapshot } from "bloodtower-protocols";
import { useEffect, useState } from "react";
import { towerStatusLines } from "../../lib/towerStatus";
import { deviceControls } from "./controls";
import { detectFormFactor, layoutFor, type PlayerLayout } from "./formFactor";

/**
 * The joined device: private lines for hunters it holds, and the only controls.
 * Presses are handed to the caller. This screen does not open a tower socket.
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
  formFactor,
}: {
  live: boolean;
  deviceId: string | null;
  state: DeviceState;
  pausePromptId: string | null;
  connectLock: ControlLock | null;
  calibrateLock: ControlLock | null;
  tower: TowerSnapshot;
  onControl?: (promptId: string, action: ControlAction) => void;
  /** Pass a form factor in tests. Omitted, the screen reads the browser. */
  formFactor?: "ipad" | "phone";
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
  const [detected, setDetected] = useState<"ipad" | "phone">(formFactor ?? "ipad");
  const [preference, setPreference] = useState<PlayerLayout | null>(null);
  useEffect(() => {
    if (!formFactor) setDetected(detectFormFactor(navigator.userAgent));
  }, [formFactor]);
  const layout = layoutFor(formFactor ?? detected, preference);
  const press = (promptId: string | null, action: ControlAction, enabled: boolean) => {
    if (!enabled || !promptId) return;
    onControl?.(promptId, action);
  };
  return (
    <main
      className={`mx-auto flex min-h-dvh flex-col gap-6 px-6 py-10 ${layout === "phone" ? "max-w-sm" : "max-w-xl"}`}
      data-layout={layout}
    >
      <h1 className="text-3xl">Device</h1>
      {detected === "phone" ? (
        <button
          type="button"
          data-action="layout"
          onClick={() => setPreference(layout === "phone" ? "full" : "phone")}
        >
          {layout === "phone" ? "Use the full layout" : "Use the phone layout"}
        </button>
      ) : null}
      {live ? null : <p>Session host unavailable.</p>}
      <p>
        Tower {status.connection}. Battery {status.battery}. Calibration {status.calibration}.
      </p>
      <section className="flex flex-col gap-3 text-xl">
        {state.views.map((view) => (
          <article key={view.hunter}>
            <h2>{view.name}</h2>
            <p>{view.privateMoment ? view.privateMoment.text : "No private line."}</p>
          </article>
        ))}
      </section>
      {controls.gameplayLock ? <p role="status">{controls.gameplayLock}</p> : null}
      <section className="flex flex-col gap-3">
        <button
          type="button"
          data-action="begin"
          disabled={!controls.begin}
          onClick={() => press(state.prompt?.id ?? null, "begin", controls.begin)}
        >
          Begin
        </button>
        <button
          type="button"
          data-action="continue"
          disabled={!controls.continue}
          onClick={() => press(state.prompt?.id ?? null, "continue", controls.continue)}
        >
          {state.prompt?.id.startsWith("continue-") ? state.prompt.label : "Continue"}
        </button>
        <button
          type="button"
          data-action="pause"
          disabled={!controls.pause}
          onClick={() => press(pausePromptId, "pause", controls.pause)}
        >
          Pause
        </button>
        <button
          type="button"
          data-action="resume"
          disabled={!controls.resume}
          onClick={() => press(state.prompt?.id ?? null, "resume", controls.resume)}
        >
          Resume
        </button>
        {controls.connectLock ? <p role="status">{controls.connectLock}</p> : null}
        <button
          type="button"
          data-action="tower-connect"
          disabled={!controls.towerConnect}
          onClick={() => press("tower-connect", "tower-connect", controls.towerConnect)}
        >
          Connect the tower
        </button>
        {controls.calibrateLock ? <p role="status">{controls.calibrateLock}</p> : null}
        <button
          type="button"
          data-action="tower-calibrate"
          disabled={!controls.towerCalibrate}
          onClick={() => press("tower-calibrate", "tower-calibrate", controls.towerCalibrate)}
        >
          Calibrate
        </button>
      </section>
    </main>
  );
}
