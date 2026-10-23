// An opt-in JSONL file of what the service saw: adapter events, connection changes and command
// lifecycles, one per line, each with the time it was seen. A stand-in for the hardware smoke (M2
// step 11) until the diagnostics bus exists (M4 step 4.1); `DIAG_LOG=<path>` turns it on.
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { AdapterEvent, AdapterEventList } from "./adapters/instrumented.ts";
import type { CommandLifecyclePayload, ConnectionPayload } from "./protocols/index.ts";

export type DiagRecord =
  | { source: "transport"; event: AdapterEvent }
  | { source: "connection"; status: ConnectionPayload }
  | { source: "command"; lifecycle: CommandLifecyclePayload };

export interface DiagLog {
  write: (record: DiagRecord) => void;
}

/**
 * Appends to `path`, creating its folder. Each record is written at once, so a crash keeps it. A
 * write that fails is lost, with one warning, and never throws.
 */
export const openDiagLog = (path: string, now: () => number = Date.now): DiagLog => {
  mkdirSync(dirname(path), { recursive: true });
  let warned = false;
  return {
    // Runs inside the adapter tap and the executor, so a failed write must never reach the tower
    // path: it is reported once and the record is lost.
    write: (record) => {
      try {
        const line = JSON.stringify({ at: new Date(now()).toISOString(), ...record });
        appendFileSync(path, `${line}\n`);
      } catch (error) {
        if (warned) return;
        warned = true;
        console.warn(`Diagnostics log: could not write to ${path}, records are being lost.`, error);
      }
    },
  };
};

/** An event list that also writes each event to `log`. */
export const teeEventList = (list: AdapterEventList, log: DiagLog): AdapterEventList => ({
  ...list,
  emit: (event) => {
    list.emit(event);
    log.write({ source: "transport", event });
  },
});
