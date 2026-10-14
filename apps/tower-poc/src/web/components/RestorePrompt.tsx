"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { batteryLabel } from "@/lib/labels";
import { sendToService, useService } from "@/lib/store";

const LABELS: Record<string, string> = { "battery.level": "Battery" };

/**
 * D11: state saved by the service's last run, offered back. Restoring only labels the values as
 * stale and application-maintained; nothing is sent to the tower. Any client may answer, and the
 * prompt closes everywhere when one does.
 */
export function RestorePrompt() {
  const pending = useService((view) => view.state?.pendingRestore);
  const [unsent, setUnsent] = useState(false);
  if (!pending) return null;

  const answer = (accept: boolean) => setUnsent(!sendToService("restoreState", { accept }));

  return (
    <section
      aria-labelledby="restore-heading"
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 sm:p-6 dark:border-amber-800 dark:bg-amber-950"
    >
      <h2 id="restore-heading" className="text-sm font-medium">
        Restore the state saved on {new Date(pending.savedAt).toLocaleString()}?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Restored values are shown as stale until the tower reports again. Nothing is sent to the
        tower.
      </p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        {Object.entries(pending.snapshot).map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-muted-foreground">{LABELS[key] ?? key}</dt>
            <dd>
              {key === "battery.level"
                ? batteryLabel(value)
                : "value" in value
                  ? JSON.stringify(value.value)
                  : "Unavailable"}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="h-11 px-4" onClick={() => answer(true)}>
          Restore
        </Button>
        <Button className="h-11 px-4" variant="outline" onClick={() => answer(false)}>
          Discard
        </Button>
      </div>
      {unsent && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Not sent: the service is not reachable.
        </p>
      )}
    </section>
  );
}
