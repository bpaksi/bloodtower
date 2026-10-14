"use client";

import { AppNav } from "@/components/AppNav";
import { MockBanner } from "@/components/MockBanner";
import { batteryLabel, CALIBRATION_LABELS, CONNECTION_LABELS, SOCKET_LABELS } from "@/lib/labels";
import { useService } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ConnectionHeader() {
  const socket = useService((view) => view.socket);
  const connection = useService((view) => view.connection);
  const battery = useService((view) => view.state?.snapshot["battery.level"]);

  // Without a live link to the service the tower's state is unknown, not what it last was.
  const status = [
    { label: "Tower", value: connection ? CONNECTION_LABELS[connection.state] : "Unknown" },
    {
      label: "Calibration",
      value: connection ? CALIBRATION_LABELS[connection.calibration] : "Unknown",
    },
    { label: "Service", value: SOCKET_LABELS[socket], warn: socket !== "online" },
    { label: "Battery", value: batteryLabel(battery) },
  ];

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <MockBanner />
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <p className="font-heading text-base font-semibold">Bloodtower</p>
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-live="polite">
          {status.map((item) => (
            <div key={item.label} className="flex gap-1.5">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className={cn("font-medium", item.warn && "text-destructive")}>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <AppNav />
    </header>
  );
}
