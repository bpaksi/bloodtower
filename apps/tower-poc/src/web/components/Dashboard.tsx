"use client";

import { useState } from "react";
import type { ConnectionPayload, Device } from "tower-poc-protocols";
import { RestorePrompt } from "@/components/RestorePrompt";
import { Button } from "@/components/ui/button";
import { CALIBRATION_LABELS, CONNECTION_LABELS, STAGE_LABELS } from "@/lib/labels";
import { PAGES } from "@/lib/pages";
import { latestCommand } from "@/lib/service";
import { sendToService, useService } from "@/lib/store";
import { useCommand } from "@/lib/useCommand";

type Action = "connect" | "reconnect" | "disconnect" | "calibrate";

/** The sound the dashboard plays to prove the path end to end: catalog entry 1. */
const TEST_SOUND = 1;

const DEVICE_FIELDS: { key: keyof Device; label: string }[] = [
  { key: "manufacturerName", label: "Manufacturer" },
  { key: "modelNumber", label: "Model" },
  { key: "serialNumber", label: "Serial number" },
  { key: "hardwareRevision", label: "Hardware" },
  { key: "firmwareRevision", label: "Firmware" },
  { key: "softwareRevision", label: "Software" },
];

/**
 * Which of the four lifecycle actions the tower's state allows, as the service decides (it
 * refuses the others anyway). Reconnect is offered instead of Connect after the tower dropped the
 * link by itself (D10): nothing reconnects without a person pressing it.
 */
const allowed = (connection: ConnectionPayload | undefined) => {
  const state = connection?.state;
  const canOpen =
    state === "disconnected" || state === "error" || state === "bluetooth-unavailable";
  const dropped = connection?.error?.code === "unexpected-disconnect";
  const connected = state === "connected";
  return {
    connect: canOpen && !dropped,
    reconnect: canOpen && dropped,
    disconnect: connected || state === "connecting",
    calibrate: connected && connection?.calibration !== "calibrating",
    // D22: no command while the tower calibrates.
    command: connected && connection?.calibration !== "calibrating",
  };
};

export function Dashboard() {
  const online = useService((view) => view.socket === "online");
  const connection = useService((view) => view.connection);
  const lastError = useService((view) => view.lastError);
  const [lastAction, setLastAction] = useState<{ id?: string; action: Action }>();
  const sound = useCommand("sound.play");
  // The last test sound from any device, so every screen shows the same lifecycle (D7).
  const lastSound = useService((view) => latestCommand(view.commands, "sound.play"));
  const ownClientId = useService((view) => view.welcome?.clientId);
  const sender =
    lastSound?.[0] === undefined
      ? undefined
      : lastSound[0].clientId === ownClientId
        ? "this device"
        : "another device";
  const can = allowed(online ? connection : undefined);

  const act = (action: Action) => setLastAction({ id: sendToService(action), action });
  const refusal =
    lastAction?.id !== undefined && lastError?.correlationId === lastAction.id
      ? lastError.message
      : undefined;

  const actions: { action: Action; label: string; enabled: boolean }[] = [
    can.reconnect
      ? { action: "reconnect", label: "Reconnect", enabled: true }
      : { action: "connect", label: "Connect", enabled: can.connect },
    { action: "disconnect", label: "Disconnect", enabled: can.disconnect },
    { action: "calibrate", label: "Calibrate", enabled: can.calibrate },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {PAGES.dashboard.title}
        </h1>
        <p className="text-muted-foreground">{PAGES.dashboard.summary}</p>
      </div>

      <RestorePrompt />

      <section aria-labelledby="tower-heading" className="rounded-lg border p-4 sm:p-6">
        <h2 id="tower-heading" className="text-sm font-medium">
          Tower
        </h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Connection</dt>
          <dd>{connection && online ? CONNECTION_LABELS[connection.state] : "Unknown"}</dd>
          <dt className="text-muted-foreground">Calibration</dt>
          <dd>{connection && online ? CALIBRATION_LABELS[connection.calibration] : "Unknown"}</dd>
        </dl>
        {online && connection?.error && (
          <div role="alert" className="mt-3 rounded-md bg-destructive/10 p-3 text-sm">
            <p className="font-medium text-destructive">{connection.error.message}</p>
            {connection.error.actionable && <p className="mt-1">{connection.error.actionable}</p>}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map(({ action, label, enabled }) => (
            <Button
              key={action}
              className="h-11 px-4"
              variant={action === "disconnect" ? "outline" : "default"}
              disabled={!enabled}
              onClick={() => act(action)}
            >
              {label}
            </Button>
          ))}
        </div>
        {lastAction && lastAction.id === undefined && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            Not sent: the service is not reachable.
          </p>
        )}
        {refusal && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {refusal}
          </p>
        )}
        {connection?.calibration === "calibrating" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Calibration turns every drum and takes about 20 seconds. Commands are refused until it
            ends.
          </p>
        )}
      </section>

      {online && connection?.device && (
        <section aria-labelledby="device-heading" className="rounded-lg border p-4 sm:p-6">
          <h2 id="device-heading" className="text-sm font-medium">
            Device
          </h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
            {DEVICE_FIELDS.map(({ key, label }) => (
              <div key={key} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-all font-mono">{connection.device?.[key] ?? "Unavailable"}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section aria-labelledby="test-heading" className="rounded-lg border p-4 sm:p-6">
        <h2 id="test-heading" className="text-sm font-medium">
          Test sound
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Plays sound {TEST_SOUND} through the whole path: this page, the service, the command
          executor and the tower.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            className="h-11 px-4"
            disabled={!can.command || sound.pending}
            onClick={() => sound.send({ soundIndex: TEST_SOUND })}
          >
            {sound.pending ? "Playing…" : "Play test sound"}
          </Button>
          {lastSound && (
            <ol
              aria-label={`Test sound lifecycle, from ${sender}`}
              className="flex flex-wrap gap-x-2 text-sm"
            >
              <li className="text-muted-foreground">From {sender}:</li>
              {lastSound.map((stage) => (
                <li
                  key={stage.stage}
                  className="after:ml-2 after:content-['→'] last:after:content-none"
                >
                  {STAGE_LABELS[stage.stage]}
                  {stage.reason ? `: ${stage.reason}` : ""}
                </li>
              ))}
            </ol>
          )}
        </div>
        {sound.unsent && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            Not sent: the service is not reachable.
          </p>
        )}
      </section>
    </div>
  );
}
