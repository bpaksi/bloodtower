"use client";

import {
  type CommandTimes,
  commandTimes,
  FLASH_DURATION_MS,
  FLASH_LIGHT,
  FLASH_RATES_HZ,
  lightSequencePlan,
  type OverlapTrialId,
  overlapPlan,
  type PlannedOverlap,
  type SequenceObservation,
  timingResultSchema,
} from "@dark-tower/tower";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { CALIBRATION_LABELS, CONNECTION_LABELS } from "@/lib/labels";
import { PAGES } from "@/lib/pages";
import { sendToService, useService } from "@/lib/store";
import { sendCommand, sleep, waitForCommand } from "@/lib/timingClient";
import {
  measuredGapMs,
  readSkull,
  type SkullReading,
  serviceHttpOrigin,
  showTime,
  skullDropAt,
} from "@/lib/timingView";
import { type TowerAction, towerActions } from "@/lib/towerActions";

const PLAN = lightSequencePlan();
const OVERLAPS = overlapPlan() ?? [];

type OverlapChoice = "cut-off" | "together" | "waited";

interface OverlapRow extends PlannedOverlap {
  first: PlannedOverlap["first"];
  second: PlannedOverlap["second"];
  firstTimes: CommandTimes | null;
  secondTimes: CommandTimes | null;
  result: OverlapChoice | null;
  error?: string;
}

interface RateRun {
  flashesPerSecond: 2 | 4 | 6 | 8;
  durationMs: typeof FLASH_DURATION_MS;
  sentAt: number | null;
  finishedAt: number | null;
  outcome: CommandTimes["outcome"];
}

const CHOICES: { id: OverlapChoice; label: string }[] = [
  { id: "cut-off", label: "The first cut off" },
  { id: "together", label: "Both played together" },
  { id: "waited", label: "The second waited" },
];

const overlapTitle: Record<OverlapTrialId, string> = {
  "sound-then-sound": "Long sound, then a short sound one second later",
  "sound-then-light": "Long sound, then a light sequence one second later",
  "light-then-light": "Two light sequences, one right after the other",
};

const emptyOverlap = (trial: PlannedOverlap): OverlapRow => ({
  ...trial,
  firstTimes: null,
  secondTimes: null,
  result: null,
});

type CommandRun = { times: CommandTimes; error?: undefined } | { times?: undefined; error: string };

const runOne = async (capabilityId: string, params: unknown): Promise<CommandRun> => {
  const id = sendCommand(capabilityId, params);
  if (!id) return { error: "The service is not reachable. Nothing was sent." };
  const stages = await waitForCommand(id);
  if (stages === "interrupted") {
    return { error: "The link to the service dropped. Nothing was sent again." };
  }
  return { times: commandTimes(stages) };
};

export function TimingTest() {
  const online = useService((view) => view.socket === "online");
  const connection = useService((view) => view.connection);
  const connected = connection?.state === "connected";
  const lastError = useService((view) => view.lastError);
  const snapshot = useService((view) => view.state?.snapshot);
  const [lastAction, setLastAction] = useState<{ id?: string; action: TowerAction }>();
  const can = towerActions(online ? connection : undefined);
  const [startedAt] = useState(() => new Date().toISOString());
  const [notes, setNotes] = useState("");
  const [locked, setLocked] = useState(false);
  const lock = useRef(false);

  const [sequences, setSequences] = useState<SequenceObservation[]>([]);
  const [seqLabel, setSeqLabel] = useState<string>();
  const [seqError, setSeqError] = useState<string>();
  const [waitingDone, setWaitingDone] = useState<boolean | null>(null);
  const doneRequest = useRef<((at: number | null) => void) | null>(null);

  const [overlaps, setOverlaps] = useState<OverlapRow[]>(() => OVERLAPS.map(emptyOverlap));
  const [skullPhase, setSkullPhase] = useState<"idle" | "watching" | "done">("idle");
  const [skullBaseline, setSkullBaseline] = useState<SkullReading>();
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [towerMadeSound, setTowerMadeSound] = useState<boolean | null>(null);

  const [flashPhase, setFlashPhase] = useState<"ready" | "running" | "mark" | "skipped">("ready");
  const [flashLabel, setFlashLabel] = useState<string>();
  const [flashError, setFlashError] = useState<string>();
  const [rates, setRates] = useState<RateRun[]>([]);
  const [fastestCleanHz, setFastestCleanHz] = useState<RateRun["flashesPerSecond"] | "none" | null>(
    null,
  );

  const [saveMessage, setSaveMessage] = useState<string>();

  const skullNow = readSkull(snapshot);

  useEffect(() => {
    if (skullPhase !== "watching") return;
    const at = skullDropAt(skullBaseline, skullNow);
    if (at !== null) setDropAt(at);
  }, [skullPhase, skullBaseline, skullNow]);

  const acquire = () => {
    if (lock.current) return false;
    lock.current = true;
    setLocked(true);
    return true;
  };
  const release = () => {
    lock.current = false;
    setLocked(false);
  };

  const canStart = online && connected && !locked;
  const linkRefusal =
    lastAction?.id !== undefined && lastError?.correlationId === lastAction.id
      ? lastError.message
      : undefined;
  const act = (action: TowerAction) => setLastAction({ id: sendToService(action), action });

  const answerDone = (sawTheEnd: boolean) => {
    const resolve = doneRequest.current;
    doneRequest.current = null;
    setWaitingDone(null);
    resolve?.(sawTheEnd ? Date.now() : null);
  };

  const playSequences = async () => {
    if (!acquire()) return;
    setSeqError(undefined);
    setSequences([]);
    try {
      for (const step of PLAN) {
        setSeqLabel(step.name);
        const outcome = await runOne(step.capabilityId, step.params);
        const times = "times" in outcome ? outcome.times : null;
        if ("error" in outcome) setSeqError(outcome.error);
        const sent = times?.outcome === "confirmed" || times?.outcome === "indeterminate";
        setWaitingDone(sent);
        const doneAt = await new Promise<number | null>((resolve) => {
          doneRequest.current = resolve;
        });
        setSequences((rows) => [
          ...rows,
          {
            name: step.name,
            flagged: step.flagged,
            sentWithoutWaiting: step.sentWithoutWaiting,
            sentAt: times?.sentAt ?? null,
            acknowledgedAt: times?.acknowledgedAt ?? null,
            doneAt,
            outcome:
              times?.outcome === "confirmed" ||
              times?.outcome === "indeterminate" ||
              times?.outcome === "failed" ||
              times?.outcome === "timed-out" ||
              times?.outcome === "rejected"
                ? times.outcome
                : null,
          },
        ]);
        if (outcome.error?.startsWith("The link")) break;
      }
      setSeqLabel(undefined);
    } finally {
      release();
    }
  };

  const playOverlap = async (index: number) => {
    const trial = overlaps[index];
    if (!trial || !acquire()) return;
    setOverlaps((rows) =>
      rows.map((row, i) => (i === index ? { ...emptyOverlap(trial), error: undefined } : row)),
    );
    try {
      const began = Date.now();
      const first = await runOne(trial.first.capabilityId, trial.first.params);
      if (!first.times) {
        setOverlaps((rows) =>
          rows.map((row, i) => (i === index ? { ...row, error: first.error } : row)),
        );
        return;
      }
      const remain = trial.gapMs - (Date.now() - began);
      if (remain > 0) await sleep(remain);
      const second = await runOne(trial.second.capabilityId, trial.second.params);
      const next: OverlapRow = {
        ...emptyOverlap(trial),
        firstTimes: first.times,
        secondTimes: second.times ?? null,
        error: second.error,
      };
      setOverlaps((rows) => rows.map((row, i) => (i === index ? next : row)));
    } finally {
      release();
    }
  };

  const startSkull = () => {
    if (!acquire()) return;
    setSkullBaseline(readSkull(useService.getState().state?.snapshot));
    setDropAt(null);
    setTowerMadeSound(null);
    setSkullPhase("watching");
    release();
  };

  const playFlash = async () => {
    if (!acquire()) return;
    setFlashPhase("running");
    setRates([]);
    setFastestCleanHz(null);
    setFlashError(undefined);
    const done: RateRun[] = [];
    try {
      for (const flashesPerSecond of FLASH_RATES_HZ) {
        setFlashLabel(`${flashesPerSecond} flashes a second`);
        const outcome = await runOne("lighting.flash", {
          ...FLASH_LIGHT,
          flashesPerSecond,
          durationMs: FLASH_DURATION_MS,
        });
        const times = "times" in outcome ? outcome.times : null;
        done.push({
          flashesPerSecond,
          durationMs: FLASH_DURATION_MS,
          sentAt: times?.sentAt ?? null,
          finishedAt: times?.finishedAt ?? null,
          outcome: times?.outcome ?? null,
        });
        setRates([...done]);
        const endedClean = times?.outcome === "confirmed" || times?.outcome === "indeterminate";
        if (!endedClean) {
          setFlashError(
            outcome.error ?? "This rate did not finish, so the faster rates were not sent.",
          );
          break;
        }
      }
      setFlashPhase("mark");
    } finally {
      setFlashLabel(undefined);
      release();
    }
  };

  const save = async () => {
    const body = {
      version: 1 as const,
      startedAt,
      notes,
      lightSequences: sequences,
      overlap: overlaps.map((row) => ({
        id: row.id,
        gapMs: measuredGapMs(row.gapMs, row.firstTimes?.sentAt, row.secondTimes?.sentAt),
        first: {
          capabilityId: row.first.capabilityId,
          sentAt: row.firstTimes?.sentAt ?? null,
          acknowledgedAt: row.firstTimes?.acknowledgedAt ?? null,
          outcome: endOrNull(row.firstTimes?.outcome),
        },
        second: row.secondTimes
          ? {
              capabilityId: row.second.capabilityId,
              sentAt: row.secondTimes.sentAt,
              acknowledgedAt: row.secondTimes.acknowledgedAt,
              outcome: endOrNull(row.secondTimes.outcome),
            }
          : null,
        result: row.result,
      })),
      skull: { dropAt, towerMadeSound },
      flash: {
        warningShown: true,
        skipped: flashPhase === "skipped",
        rates,
        fastestCleanHz: fastestCleanHz === "none" ? null : fastestCleanHz,
      },
    };
    const parsed = timingResultSchema.safeParse(body);
    if (!parsed.success) {
      setSaveMessage("This result is not valid, so it was not saved.");
      return;
    }
    const origin = serviceHttpOrigin(
      window.location.protocol,
      window.location.host,
      process.env.NEXT_PUBLIC_WS_URL,
    );
    try {
      const response = await fetch(`${origin}/api/timing-results`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json()) as { file?: string; message?: string };
      setSaveMessage(
        response.ok && payload.file
          ? `Saved docs/timing-results/${payload.file}`
          : (payload.message ?? "The result was not saved."),
      );
    } catch {
      setSaveMessage("The service did not answer. The result was not saved.");
    }
  };

  const current = seqLabel ? PLAN.find((step) => step.name === seqLabel) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader page={PAGES.timing} />
      <p className="text-sm text-muted-foreground">
        Connect, then calibrate, with the buttons below. Rotation sequences need a calibrated tower,
        and nothing else on this page runs until you press its button. Each command is sent once.
      </p>
      <section className="rounded-lg border p-4 sm:p-6" aria-labelledby="link-heading">
        <h2 id="link-heading" className="text-sm font-medium">
          Tower
        </h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Connection</dt>
          <dd>{connection && online ? CONNECTION_LABELS[connection.state] : "Unknown"}</dd>
          <dt className="text-muted-foreground">Calibration</dt>
          <dd>{connection && online ? CALIBRATION_LABELS[connection.calibration] : "Unknown"}</dd>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            className="h-11 px-4"
            disabled={can.reconnect ? false : !can.connect}
            onClick={() => act(can.reconnect ? "reconnect" : "connect")}
          >
            {can.reconnect ? "Reconnect" : "Connect"}
          </Button>
          <Button
            type="button"
            className="h-11 px-4"
            variant="outline"
            disabled={!can.disconnect}
            onClick={() => act("disconnect")}
          >
            Disconnect
          </Button>
          <Button
            type="button"
            className="h-11 px-4"
            disabled={!can.calibrate}
            onClick={() => act("calibrate")}
          >
            Calibrate
          </Button>
        </div>
        {connection && online && connection.calibration === "calibrating" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Calibration turns every drum and takes about 20 seconds. Commands are refused until it
            ends. Nothing starts it but this button.
          </p>
        )}
        {lastAction && lastAction.id === undefined && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            Not sent: the service is not reachable.
          </p>
        )}
        {linkRefusal && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {linkRefusal}
          </p>
        )}
      </section>

      <section className="rounded-lg border p-4 sm:p-6" aria-labelledby="seq-heading">
        <h2 id="seq-heading" className="text-sm font-medium">
          1. Light sequences
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each of the 21 built-in sequences, one at a time. The four rotation sequences are sent
          without waiting for a reply. Press Done when the lights stop. A rotation sequence leaves
          its lights on, so Done there is when you judge it finished, and the next sequence turns
          those lights off.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!canStart || sequences.some((row) => row.sentAt !== null)}
            onClick={() => void playSequences()}
          >
            Play the sequences
          </Button>
          {waitingDone !== null && (
            <Button type="button" onClick={() => answerDone(waitingDone)}>
              {waitingDone ? "Done" : "Continue"}
            </Button>
          )}
        </div>
        {current && (
          <div className="mt-4 text-sm">
            <p>
              {sequences.length + 1} of {PLAN.length}: {current.name}
            </p>
            {current.flagged && (
              <p className="mt-1 font-medium">
                Flagged: rotationDrumMiddle has not been played on the tower through this service.
                It is included here and marked in the results.
              </p>
            )}
            {current.sentWithoutWaiting && (
              <p className="mt-1">
                Sent without waiting for a reply. These lights stay on until the next sequence. Done
                is when you judge this one finished. The next sequence turns the lights off.
              </p>
            )}
          </div>
        )}
        {seqError && <p className="mt-2 text-sm text-destructive">{seqError}</p>}
        {sequences.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1 text-sm">
            {sequences.map((row) => (
              <li key={row.name}>
                {row.name}
                {row.flagged ? " (flagged)" : ""}: sent {showTime(row.sentAt)}, acknowledged{" "}
                {showTime(row.acknowledgedAt)}, done {showTime(row.doneAt)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border p-4 sm:p-6" aria-labelledby="overlap-heading">
        <h2 id="overlap-heading" className="text-sm font-medium">
          2. Sound overlap
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tower Idle 1 is the long sound. Tower Connected is the short one. After each pair, pick
          what you heard or saw.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {overlaps.map((row, index) => (
            <div key={row.id} className="rounded-md border p-3">
              <h3 className="text-sm font-medium">{overlapTitle[row.id]}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canStart}
                  onClick={() => void playOverlap(index)}
                >
                  Play
                </Button>
                {CHOICES.map((choice) => (
                  <Button
                    key={choice.id}
                    type="button"
                    variant={row.result === choice.id ? "default" : "outline"}
                    disabled={row.firstTimes === null}
                    onClick={() =>
                      setOverlaps((rows) =>
                        rows.map((item, i) =>
                          i === index ? { ...item, result: choice.id } : item,
                        ),
                      )
                    }
                  >
                    {choice.label}
                  </Button>
                ))}
              </div>
              {row.error && <p className="mt-2 text-sm text-destructive">{row.error}</p>}
              {row.firstTimes && (
                <p className="mt-2 text-sm text-muted-foreground">
                  First sent {showTime(row.firstTimes.sentAt)}, acknowledged{" "}
                  {showTime(row.firstTimes.acknowledgedAt)}
                  {row.secondTimes
                    ? `; second sent ${showTime(row.secondTimes.sentAt)}, acknowledged ${showTime(row.secondTimes.acknowledgedAt)}`
                    : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border p-4 sm:p-6" aria-labelledby="skull-heading">
        <h2 id="skull-heading" className="text-sm font-medium">
          3. Skull drop
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          With every other sound off, drop one skull. Mark whether the tower made its own sound.
        </p>
        <p className="mt-2 text-sm">
          Skulls recorded: {skullNow ? skullNow.count : "Unavailable"}
          {dropAt !== null ? `. Drop seen ${showTime(dropAt)}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled={!canStart} onClick={startSkull}>
            The tower is quiet
          </Button>
          <Button
            type="button"
            variant={towerMadeSound === true ? "default" : "outline"}
            disabled={skullPhase === "idle"}
            onClick={() => {
              setTowerMadeSound(true);
              setSkullPhase("done");
            }}
          >
            The tower made a sound
          </Button>
          <Button
            type="button"
            variant={towerMadeSound === false ? "default" : "outline"}
            disabled={skullPhase === "idle"}
            onClick={() => {
              setTowerMadeSound(false);
              setSkullPhase("done");
            }}
          >
            The tower stayed quiet
          </Button>
        </div>
      </section>

      <section className="rounded-lg border p-4 sm:p-6" aria-labelledby="flash-heading">
        <h2 id="flash-heading" className="text-sm font-medium">
          4. Flash rate
        </h2>
        <div role="alert" className="mt-3 rounded-md border border-destructive p-3 text-sm">
          <p className="font-medium">Photosensitivity warning</p>
          <p className="mt-1">
            This test flashes one light at 2, 4, 6 and then 8 times a second, for 5 seconds at each
            rate. Flashing lights can cause discomfort or seizures for some people. Start it only if
            that is safe for everyone who can see the tower.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!canStart || flashPhase !== "ready"}
            onClick={() => void playFlash()}
          >
            Start flash test
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={locked || flashPhase !== "ready"}
            onClick={() => setFlashPhase("skipped")}
          >
            Skip flash test
          </Button>
        </div>
        {flashPhase === "skipped" && <p className="mt-2 text-sm">Skipped. No light was flashed.</p>}
        {flashLabel && <p className="mt-2 text-sm">Now: {flashLabel}</p>}
        {flashError && <p className="mt-2 text-sm text-destructive">{flashError}</p>}
        {flashPhase === "mark" && (
          <div className="mt-4">
            <p className="text-sm font-medium">Fastest rate that still showed clean flashes</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {FLASH_RATES_HZ.map((rate) => (
                <Button
                  key={rate}
                  type="button"
                  variant={fastestCleanHz === rate ? "default" : "outline"}
                  onClick={() => setFastestCleanHz(rate)}
                >
                  {rate} a second
                </Button>
              ))}
              <Button
                type="button"
                variant={fastestCleanHz === "none" ? "default" : "outline"}
                onClick={() => setFastestCleanHz("none")}
              >
                None of them
              </Button>
            </div>
          </div>
        )}
        {rates.length > 0 && (
          <ul className="mt-3 text-sm">
            {rates.map((rate) => (
              <li key={rate.flashesPerSecond}>
                {rate.flashesPerSecond}/s: sent {showTime(rate.sentAt)}, finished{" "}
                {showTime(rate.finishedAt)}, {rate.outcome ?? "Unavailable"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border p-4 sm:p-6" aria-labelledby="notes-heading">
        <h2 id="notes-heading" className="text-sm font-medium">
          Notes
        </h2>
        <label htmlFor="timing-notes" className="mt-2 block text-sm text-muted-foreground">
          Anything you saw or heard that the buttons do not cover.
        </label>
        <textarea
          id="timing-notes"
          className="mt-2 min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={notes}
          maxLength={4000}
          onChange={(event) => setNotes(event.target.value)}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => void save()}>
            Save results
          </Button>
          {saveMessage && <p className="text-sm">{saveMessage}</p>}
        </div>
      </section>
    </div>
  );
}

const endOrNull = (outcome: CommandTimes["outcome"] | undefined) =>
  outcome === "confirmed" ||
  outcome === "indeterminate" ||
  outcome === "failed" ||
  outcome === "timed-out" ||
  outcome === "rejected"
    ? outcome
    : null;
