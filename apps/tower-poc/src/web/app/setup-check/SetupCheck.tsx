"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  asSeen,
  BLANK,
  EMPTY_RUN,
  facingLine,
  GLYPH_LABELS,
  GLYPH_NAMES,
  KINGDOMS,
  loadRun,
  NORTH_SIDE_PARAMS,
  parseCount,
  recordGlyphs,
  type SetupRun,
  SIDES,
  saveRun,
  sideKey,
  sideLabel,
  summarizeSkulls,
  TOP_DRUM_EAST_PARAMS,
  VISIT_LABELS,
  visitTowerState,
  withFacing,
  withGlyph,
  withRotateResult,
  withSkull,
} from "@/lib/setupCheck";
import { sendToService, useService } from "@/lib/store";
import { towerActions } from "@/lib/towerActions";
import { useCommand } from "@/lib/useCommand";

const FIELD =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 sm:text-sm";

const failedStage = (stage: string | undefined) =>
  stage === "failed" || stage === "rejected" || stage === "timed-out";

/**
 * Tower prototype for glyphs, facing, a single drum turn, and skull counts.
 * Every tower action is a press. Answers are kept in this browser; the tower's state is not.
 */
export function SetupCheck() {
  const online = useService((view) => view.socket === "online");
  const connection = useService((view) => view.connection);
  const lastError = useService((view) => view.lastError);
  const [run, setRun] = useState<SetupRun>(EMPTY_RUN);
  const [ready, setReady] = useState(false);
  const [pressedCalibrate, setPressedCalibrate] = useState(false);
  const [calibrateId, setCalibrateId] = useState<string>();
  const [calibrateUnsent, setCalibrateUnsent] = useState(false);
  const [dropped, setDropped] = useState("");
  const [stayed, setStayed] = useState("");
  const light = useCommand("lighting.set");
  const rotate = useCommand("mechanics.rotate-drum");

  useEffect(() => {
    const loaded = loadRun(window.localStorage);
    if (loaded.error) console.error("setup-check: saved answers could not be read", loaded.error);
    setRun(loaded.run);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const error = saveRun(window.localStorage, run);
    if (error) console.error("setup-check: could not keep the answers", error);
  }, [ready, run]);

  const can = towerActions(online ? connection : undefined);
  const visit = visitTowerState(pressedCalibrate, online ? connection?.calibration : undefined);
  const readyToCommand = visit === "calibrated";
  const records = recordGlyphs(run.glyphs);
  const skulls = summarizeSkulls(run.skulls);
  const calibrateRefusal =
    calibrateId !== undefined && lastError?.correlationId === calibrateId ? lastError : undefined;
  const calibrateError =
    calibrateRefusal ??
    (connection?.error?.code === "calibration-failed" ? connection.error : undefined);

  useEffect(() => {
    if (!calibrateError) return;
    console.error(`setup-check: ${calibrateError.code}: ${calibrateError.message}`);
  }, [calibrateError]);

  useEffect(() => {
    const stage = light.stages?.at(-1);
    if (!failedStage(stage?.stage)) return;
    console.error(`setup-check: lighting.set ${stage?.stage}: ${stage?.reason ?? ""}`);
  }, [light.stages]);

  useEffect(() => {
    const stage = rotate.stages?.at(-1);
    if (!failedStage(stage?.stage)) return;
    console.error(`setup-check: mechanics.rotate-drum ${stage?.stage}: ${stage?.reason ?? ""}`);
  }, [rotate.stages]);

  const update = (change: (current: SetupRun) => SetupRun) => setRun(change);

  if (!ready) return <p className="text-sm text-muted-foreground">Loading saved answers…</p>;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Nothing here runs by itself. Connect, then press Calibrate. Each light and each turn is its
        own press. Answers stay in this browser, so a reload keeps them. After a reload the tower
        state is unknown until you press Calibrate again.
      </p>

      <section aria-label="Tower state" className="rounded-lg border p-4 sm:p-6">
        <h2 className="text-sm font-medium">Tower state</h2>
        <p className="mt-2 text-sm">
          <span className="text-muted-foreground">This visit: </span>
          {VISIT_LABELS[visit]}
        </p>
        <p className="mt-1 text-sm">Calibrate: {visit === "calibrated" ? "done" : "undone"}</p>
      </section>

      <section aria-label="Calibrate" className="rounded-lg border p-4 sm:p-6">
        <h2 className="text-sm font-medium">Calibrate</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Turns the drums to find home. The lights and the turn below wait for it. Nothing
          calibrates by itself.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            className="h-11 px-4"
            disabled={!can.connect}
            onClick={() => sendToService("connect")}
          >
            Connect
          </Button>
          <Button
            type="button"
            className="h-11 px-4"
            variant="outline"
            disabled={!can.disconnect}
            onClick={() => sendToService("disconnect")}
          >
            Disconnect
          </Button>
          <Button
            type="button"
            className="h-11 px-4"
            disabled={!can.calibrate}
            onClick={() => {
              const id = sendToService("calibrate");
              setCalibrateUnsent(id === undefined);
              setCalibrateId(id);
              if (id !== undefined) setPressedCalibrate(true);
            }}
          >
            Calibrate
          </Button>
        </div>
        {can.reconnect && (
          <div className="mt-3">
            <Button type="button" className="h-11 px-4" onClick={() => sendToService("reconnect")}>
              Reconnect
            </Button>
          </div>
        )}
        {calibrateUnsent && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            Not sent: the service is not reachable.
          </p>
        )}
        {calibrateError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {calibrateError.code}: {calibrateError.message}
          </p>
        )}
      </section>

      <section aria-label="Glyphs" className="rounded-lg border p-4 sm:p-6">
        <h2 className="text-sm font-medium">Glyphs on each drum side</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          After calibrate, say what you see in each window. Blank is not an answer: it stays
          unknown, and it does not count as matching an empty face. Choose No glyph for an empty
          face.
        </p>
        <ul className="mt-4 flex flex-col gap-4">
          {records.map((record) => {
            const id = sideKey(record.drum, record.side);
            const label = sideLabel(record.drum, record.side);
            return (
              <li key={id} className="grid gap-2 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
                <label
                  htmlFor={`glyph-${record.drum}-${record.side}`}
                  className="text-sm font-medium"
                >
                  {label}
                </label>
                <select
                  id={`glyph-${record.drum}-${record.side}`}
                  className={FIELD}
                  value={record.seen}
                  onChange={(event) =>
                    update((current) =>
                      withGlyph(current, record.drum, record.side, asSeen(event.target.value)),
                    )
                  }
                >
                  <option value={BLANK}>Blank</option>
                  {GLYPH_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {GLYPH_LABELS[name]}
                    </option>
                  ))}
                  <option value="none">No glyph</option>
                </select>
                <p className="text-sm text-muted-foreground">
                  Expected {record.expected === "none" ? "no glyph" : GLYPH_LABELS[record.expected]}
                  .{" "}
                  {record.match === true
                    ? "match"
                    : record.match === false
                      ? "no match"
                      : "unknown"}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Facing" className="rounded-lg border p-4 sm:p-6">
        <h2 className="text-sm font-medium">Which kingdom the north side faces</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One press lights the north side. Then tap the kingdom that side faces. Lighting does not
          choose the kingdom.
        </p>
        <div className="mt-4">
          <Button
            type="button"
            className="h-11 px-4"
            disabled={!readyToCommand || light.pending}
            onClick={() => {
              const id = light.send(NORTH_SIDE_PARAMS);
              if (id) update((current) => ({ ...current, northLit: true }));
            }}
          >
            Light north side
          </Button>
        </div>
        {run.northLit && (
          <div className="mt-4 flex flex-col gap-3">
            <fieldset className="flex flex-wrap gap-2 border-0 p-0">
              <legend className="sr-only">Kingdom</legend>
              {KINGDOMS.map((kingdom) => (
                <Button
                  key={kingdom}
                  type="button"
                  className="h-11 px-4"
                  variant={run.facingKingdom === kingdom ? "default" : "outline"}
                  onClick={() => update((current) => withFacing(current, kingdom))}
                >
                  {kingdom}
                </Button>
              ))}
            </fieldset>
            {run.facingKingdom && <p className="text-sm">{facingLine(run.facingKingdom)}</p>}
          </div>
        )}
      </section>

      <section aria-label="Rotate" className="rounded-lg border p-4 sm:p-6">
        <h2 className="text-sm font-medium">Turn the top drum</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One press turns the top drum to east. Then say where it landed. The answer does not turn
          it again.
        </p>
        <div className="mt-4">
          <Button
            type="button"
            className="h-11 px-4"
            disabled={!readyToCommand || rotate.pending}
            onClick={() => {
              const id = rotate.send(TOP_DRUM_EAST_PARAMS);
              if (id) update((current) => ({ ...current, rotateSent: true }));
            }}
          >
            Turn top drum to east
          </Button>
        </div>
        {run.rotateSent && (
          <div className="mt-4 flex flex-col gap-3">
            <fieldset className="flex flex-wrap gap-2 border-0 p-0">
              <legend className="sr-only">Where the top drum landed</legend>
              {SIDES.map((side) => (
                <Button
                  key={side}
                  type="button"
                  className="h-11 px-4"
                  variant={run.rotateResult === side ? "default" : "outline"}
                  onClick={() => update((current) => withRotateResult(current, side))}
                >
                  {side}
                </Button>
              ))}
            </fieldset>
            {run.rotateResult && <p className="text-sm">Rotate result: {run.rotateResult}</p>}
          </div>
        )}
      </section>

      <section aria-label="Skulls" className="rounded-lg border p-4 sm:p-6">
        <h2 className="text-sm font-medium">Skulls that stay inside</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          After a box-up, record how many went in and how many stayed inside. Leave both empty to
          record a try you could not count. A missing count is not zero.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Dropped
            <input
              className={FIELD}
              inputMode="numeric"
              value={dropped}
              onChange={(event) => setDropped(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Stayed inside
            <input
              className={FIELD}
              inputMode="numeric"
              value={stayed}
              onChange={(event) => setStayed(event.target.value)}
            />
          </label>
        </div>
        <div className="mt-3">
          <Button
            type="button"
            className="h-11 px-4"
            onClick={() => {
              const droppedCount = parseCount(dropped);
              const stayedCount = parseCount(stayed);
              update((current) =>
                withSkull(current, {
                  id: `skull-${current.skulls.length + 1}`,
                  ...(droppedCount !== undefined ? { dropped: droppedCount } : {}),
                  ...(stayedCount !== undefined ? { stayed: stayedCount } : {}),
                }),
              );
              setDropped("");
              setStayed("");
            }}
          >
            Record try
          </Button>
        </div>
        <section aria-label="Skull summary" className="mt-4 text-sm">
          <p>Tries: {skulls.tries}</p>
          <p>Total dropped: {skulls.totalDropped}</p>
          <p>Total stayed inside: {skulls.totalStayed}</p>
          <p>Share: {skulls.share === undefined ? "Unavailable" : String(skulls.share)}</p>
          {skulls.incomplete && <p>Incomplete: tries &lt; 10</p>}
        </section>
        {skulls.uncounted.length > 0 && (
          <ul aria-label="Tries with no count" className="mt-2 list-disc pl-5 text-sm">
            {skulls.uncounted.map((try_) => (
              <li key={try_.id}>No count</li>
            ))}
          </ul>
        )}
        <ul aria-label="Skull tries" className="mt-3 flex flex-col gap-1 text-sm">
          {run.skulls.map((try_, index) => (
            <li key={try_.id}>
              {try_.dropped === undefined || try_.stayed === undefined
                ? `Try ${index + 1}: no count`
                : `Try ${index + 1}: dropped ${try_.dropped}, stayed ${try_.stayed}`}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
