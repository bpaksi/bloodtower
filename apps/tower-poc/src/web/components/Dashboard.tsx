"use client";

import type { Device } from "@dark-tower/tower";
import { useState } from "react";
import { CapabilityControl } from "@/components/controls/CapabilityControl";
import { PageHeader } from "@/components/PageHeader";
import { RestorePrompt } from "@/components/RestorePrompt";
import { Button } from "@/components/ui/button";
import { CapabilitySummary } from "@/components/verify/CapabilitySummary";
import { VerifyPanel } from "@/components/verify/VerifyPanel";
import { CALIBRATION_LABELS, CONNECTION_LABELS } from "@/lib/labels";
import { PAGES } from "@/lib/pages";
import { sendToService, useService } from "@/lib/store";
import { type TowerAction, towerActions } from "@/lib/towerActions";

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

export function Dashboard() {
  const online = useService((view) => view.socket === "online");
  const connection = useService((view) => view.connection);
  const lastError = useService((view) => view.lastError);
  const [lastAction, setLastAction] = useState<{ id?: string; action: TowerAction }>();
  const can = towerActions(online ? connection : undefined);

  const act = (action: TowerAction) => setLastAction({ id: sendToService(action), action });
  const refusal =
    lastAction?.id !== undefined && lastError?.correlationId === lastAction.id
      ? lastError.message
      : undefined;

  const actions: { action: TowerAction; label: string; enabled: boolean }[] = [
    can.reconnect
      ? { action: "reconnect", label: "Reconnect", enabled: true }
      : { action: "connect", label: "Connect", enabled: can.connect },
    { action: "disconnect", label: "Disconnect", enabled: can.disconnect },
    { action: "calibrate", label: "Calibrate", enabled: can.calibrate },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader page={PAGES.dashboard} verify />
      <VerifyPanel location="dashboard" />

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
        {online && connection?.calibration === "calibrating" && (
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

      <CapabilitySummary />

      <CapabilityControl
        capabilityId="sound.play"
        title="Test sound"
        description={`Plays a sound through the whole path: this page, the service, the command executor and the tower. Sound ${TEST_SOUND} unless you choose another.`}
        defaults={{ soundIndex: String(TEST_SOUND) }}
        sendLabel="Play test sound"
        pendingLabel="Playing…"
      />
    </div>
  );
}
