"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { CALIBRATION_LABELS } from "@/lib/labels";
import { sendToService, useService } from "@/lib/store";
import { towerActions } from "@/lib/towerActions";

/**
 * Calibration on the Mechanics page (M3 step 3.4), the same action as the Dashboard's. It is
 * never started by anything but this press (D9). The service refuses it while any command is
 * waiting or running, and that refusal is shown here.
 */
export function CalibrateControl() {
  const headingId = useId();
  const online = useService((view) => view.socket === "online");
  const connection = useService((view) => view.connection);
  const lastError = useService((view) => view.lastError);
  const [sent, setSent] = useState<{ id: string | undefined }>();
  const enabled = towerActions(online ? connection : undefined).calibrate;
  const calibration = online && connection ? CALIBRATION_LABELS[connection.calibration] : "Unknown";
  const refusal =
    sent?.id !== undefined && lastError?.correlationId === sent.id ? lastError.message : undefined;

  return (
    <section aria-labelledby={headingId} className="rounded-lg border p-4 sm:p-6">
      <h2 id={headingId} className="text-sm font-medium">
        Calibration
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Turns every drum to find where it is, in about 20 seconds. The rotations below need it.
        Nothing calibrates by itself, also not after a reconnect.
      </p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Calibration</dt>
        <dd>{calibration}</dd>
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          className="h-11 px-4"
          disabled={!enabled}
          onClick={() => setSent({ id: sendToService("calibrate") })}
        >
          Calibrate
        </Button>
        {online && connection?.calibration === "calibrating" && (
          <p className="text-sm text-muted-foreground">
            Calibrating. Commands are refused until it ends.
          </p>
        )}
        {online && connection?.state !== "connected" && (
          <p className="text-sm text-muted-foreground">Connect the tower first.</p>
        )}
      </div>
      {sent && sent.id === undefined && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Not sent: the service is not reachable.
        </p>
      )}
      {refusal && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {refusal}
        </p>
      )}
    </section>
  );
}
