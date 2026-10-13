import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type Answer,
  CALIBRATION_TIMEOUT_MS,
  COMMAND_TIMEOUT_MS,
  redactDeviceInformation,
  runSpike,
  SPIKE_STEPS,
  type SpikeIo,
  type SpikeStep,
  type SpikeTower,
} from "./spikeSteps.ts";

const catalog = {
  soundIndex: 1,
  otherSoundIndex: 2,
  lightEffectOn: 1,
  rotationSequences: [
    { name: "rotationAllDrums", value: 15 },
    { name: "rotationDrumTop", value: 16 },
  ],
};

/** A tower that records every call and never touches Bluetooth. */
const fakeTower = (
  options: {
    failOn?: string;
    failWith?: string;
    hangOn?: string;
    calibratingOnceConnected?: boolean;
    drums?: Partial<Record<"top" | "middle" | "bottom", "north" | "east" | "south" | "west">>;
  } = {},
) => {
  const calls: string[] = [];
  /** Every call with its arguments, for the tests that pin what is sent. */
  const sent: [string, unknown[]][] = [];
  let connected = false;
  let calibrated = false;
  const call =
    (name: string, effect?: () => void) =>
    async (...args: unknown[]) => {
      calls.push(name);
      sent.push([name, args]);
      if (options.failOn === name) throw new Error(options.failWith ?? `${name} failed`);
      if (options.hangOn === name) await new Promise(() => {});
      effect?.();
    };
  const tower: SpikeTower = {
    retrySendCommandMax: 5,
    get isConnected() {
      return connected;
    },
    get isCalibrated() {
      return calibrated;
    },
    get performingCalibration() {
      return connected && options.calibratingOnceConnected === true;
    },
    onCalibrationComplete: () => {},
    onSkullDrop: () => {},
    onBatteryLevelNotify: () => {},
    connect: call("connect", () => {
      connected = true;
    }),
    disconnect: call("disconnect", () => {
      connected = false;
    }),
    cleanup: call("cleanup"),
    getDeviceInformation: () => ({ modelNumber: "ReturnToDarkTower", serialNumber: "ABC123" }),
    calibrate: call("calibrate", () => {
      calibrated = true;
      tower.onCalibrationComplete();
    }),
    playSound: call("playSound"),
    playSoundStateful: call("playSoundStateful"),
    allLightsOn: call("allLightsOn"),
    allLightsOff: call("allLightsOff"),
    lightOverrides: call("lightOverrides"),
    breakSeal: call("breakSeal"),
    rotateWithState: call("rotateWithState"),
    Rotate: call("Rotate"),
    randomRotateLevels: call("randomRotateLevels"),
    getCurrentDrumPosition: (level) => options.drums?.[level] ?? "north",
  };
  const argsOf = (name: string) =>
    sent.filter(([called]) => called === name).map(([, args]) => args);
  return { tower, calls, argsOf };
};

/** Answers every confirmation from `answers` (by step order), then "skip". Waits take no time. */
const fakeIo = (
  answers: Answer[] | ((prompt: string) => Answer),
  observe: (question: string) => string = () => "noted",
) => {
  const records: Record<string, unknown>[] = [];
  const confirmations: string[] = [];
  let index = 0;
  const io: SpikeIo = {
    confirm: async (prompt) => {
      confirmations.push(prompt);
      return typeof answers === "function" ? answers(prompt) : (answers[index++] ?? "skip");
    },
    observe: async (question) => observe(question),
    say: () => {},
    log: (record) => records.push(record),
    wait: async () => {},
  };
  return { io, records, confirmations };
};

const stepRecords = (records: Record<string, unknown>[]) =>
  records.filter((record) => record.type === "step");

describe("the spike runner", () => {
  it("turns the library's automatic re-send off before anything else (D21)", async () => {
    const { tower } = fakeTower();
    const { io, records } = fakeIo([]);
    await runSpike(tower, io, catalog);
    expect(tower.retrySendCommandMax).toBe(0);
    expect(records[0]).toEqual({ type: "setup", retrySendCommandMax: 0 });
  });

  it("sends nothing when every step is skipped, and still cleans up", async () => {
    const { tower, calls } = fakeTower();
    const { io } = fakeIo(() => "skip");
    const results = await runSpike(tower, io, catalog);
    expect(calls).toEqual(["cleanup"]);
    expect(new Set(Object.values(results))).toEqual(new Set(["skipped"]));
  });

  it("asks before every step that it runs", async () => {
    const { tower } = fakeTower();
    const { io, confirmations } = fakeIo(() => "run");
    const results = await runSpike(tower, io, catalog);
    expect(confirmations).toHaveLength(SPIKE_STEPS.length);
    expect(Object.keys(results)).toEqual(SPIKE_STEPS.map((step) => step.id));
    expect(new Set(Object.values(results))).toEqual(new Set(["passed"]));
  });

  it("runs the pre-calibration checks before calibrating, and the drum moves after", async () => {
    const { tower, calls } = fakeTower();
    const { io } = fakeIo(() => "run");
    await runSpike(tower, io, catalog);
    const calibrate = calls.indexOf("calibrate");
    expect(calls.indexOf("breakSeal")).toBeLessThan(calibrate);
    expect(calls.indexOf("allLightsOn")).toBeLessThan(calibrate);
    expect(calls.indexOf("playSound")).toBeLessThan(calibrate);
    expect(calls.indexOf("rotateWithState")).toBeGreaterThan(calibrate);
    expect(calls.indexOf("Rotate")).toBeGreaterThan(calls.indexOf("rotateWithState"));
    expect(calls.at(-2)).toBe("disconnect");
    expect(calls.at(-1)).toBe("cleanup");
  });

  it("does not move a drum when calibration was skipped", async () => {
    const { tower, calls } = fakeTower();
    const { io, records } = fakeIo((prompt) =>
      prompt.includes("DRUMS WILL SPIN") ? "skip" : "run",
    );
    const results = await runSpike(tower, io, catalog);
    expect(calls).not.toContain("calibrate");
    expect(calls).not.toContain("rotateWithState");
    expect(calls).not.toContain("Rotate");
    expect(calls).not.toContain("randomRotateLevels");
    expect(results["rotate-with-state"]).toBe("skipped");
    expect(results["random-rotate"]).toBe("skipped");
    expect(stepRecords(records).find((record) => record.id === "legacy-rotate")).toMatchObject({
      result: "skipped",
      reason: "the tower is not calibrated",
    });
  });

  it("skips everything after a failed connect without sending a command", async () => {
    const { tower, calls } = fakeTower({ failOn: "connect" });
    const { io } = fakeIo(() => "run");
    const results = await runSpike(tower, io, catalog);
    expect(calls).toEqual(["connect", "cleanup"]);
    expect(results.connect).toBe("failed");
    expect(results.calibrate).toBe("skipped");
  });

  it("does not retry a step that fails, and carries on with the next", async () => {
    const { tower, calls } = fakeTower({ failOn: "breakSeal" });
    const { io, records } = fakeIo(() => "run");
    const results = await runSpike(tower, io, catalog);
    expect(calls.filter((name) => name === "breakSeal")).toHaveLength(1);
    expect(results["pre-calibration-break-seal"]).toBe("failed");
    expect(results.calibrate).toBe("passed");
    expect(
      stepRecords(records).find((record) => record.id === "pre-calibration-break-seal"),
    ).toMatchObject({ error: "breakSeal failed", gap: "GAP-HW-006" });
  });

  it("stops at quit and disconnects", async () => {
    const { tower, calls } = fakeTower();
    const { io, records } = fakeIo(["run", "run", "quit"]);
    const results = await runSpike(tower, io, catalog);
    expect(calls).toEqual(["connect", "disconnect", "cleanup"]);
    expect(Object.keys(results)).toEqual(["connect", "device-info", "pre-calibration-lights"]);
    expect(records).toContainEqual({ type: "quit", at: "pre-calibration-lights" });
  });

  it("disconnects even when a step throws something unexpected", async () => {
    const { tower, calls } = fakeTower();
    const { io } = fakeIo(() => "run");
    const broken: SpikeStep = {
      id: "connect",
      title: "Connect",
      warning: "connect",
      run: async ({ tower: target }) => {
        await target.connect();
      },
      observe: [],
    };
    const exploding: SpikeStep = {
      ...broken,
      id: "explode",
      run: async () => {
        throw new Error("boom");
      },
    };
    const results = await runSpike(tower, io, catalog, [broken, exploding]);
    expect(results.explode).toBe("failed");
    expect(calls).toEqual(["connect", "disconnect", "cleanup"]);
  });

  it("records what the person saw against each step and its gap", async () => {
    const { tower } = fakeTower();
    const { io, records } = fakeIo(() => "run");
    await runSpike(tower, io, catalog);
    const seal = stepRecords(records).find((record) => record.id === "pre-calibration-break-seal");
    expect(seal).toMatchObject({ gap: "GAP-HW-006", result: "passed" });
    expect(Object.values(seal?.observations as Record<string, string>)).toEqual(["noted", "noted"]);
  });

  it("plays each held rotation sequence once", async () => {
    const { tower, calls } = fakeTower();
    const { io, records } = fakeIo(() => "run");
    await runSpike(tower, io, catalog);
    expect(calls.filter((name) => name === "lightOverrides")).toHaveLength(2);
    expect(records.filter((record) => record.type === "sequence")).toEqual([
      { type: "sequence", name: "rotationAllDrums", value: 15 },
      { type: "sequence", name: "rotationDrumTop", value: 16 },
    ]);
  });
});

describe("timeouts and calibration (the review's findings)", () => {
  afterEach(() => vi.useRealTimers());

  it("ends the run and disconnects when a step times out, so nothing is left queued", async () => {
    vi.useFakeTimers();
    const { tower, calls } = fakeTower({ hangOn: "playSound" });
    const { io, records } = fakeIo(() => "run");
    const run = runSpike(tower, io, catalog);
    await vi.advanceTimersByTimeAsync(COMMAND_TIMEOUT_MS - 1);
    expect(calls).not.toContain("disconnect");
    await vi.advanceTimersByTimeAsync(1);
    const results = await run;
    expect(results["pre-calibration-sound"]).toBe("timed-out");
    expect(Object.keys(results).at(-1)).toBe("pre-calibration-sound");
    expect(calls).not.toContain("breakSeal");
    expect(calls).not.toContain("calibrate");
    expect(calls.slice(-2)).toEqual(["disconnect", "cleanup"]);
    expect(records).toContainEqual({ type: "ended-on-timeout", at: "pre-calibration-sound" });
  });

  it("waits longer than the library's own 30 second queue timeout", () => {
    expect(COMMAND_TIMEOUT_MS).toBeGreaterThan(30_000);
  });

  it("gives calibration one limit for the command and the spin together", async () => {
    vi.useFakeTimers();
    const { tower, calls } = fakeTower({ hangOn: "calibrate" });
    const { io } = fakeIo(() => "run");
    const run = runSpike(tower, io, catalog);
    await vi.advanceTimersByTimeAsync(CALIBRATION_TIMEOUT_MS - 1);
    expect(calls).not.toContain("disconnect");
    await vi.advanceTimersByTimeAsync(1);
    const results = await run;
    expect(results.calibrate).toBe("timed-out");
    expect(calls).not.toContain("rotateWithState");
    expect(calls.slice(-2)).toEqual(["disconnect", "cleanup"]);
  });

  it("skips a step while the tower is calibrating, without asking or sending (D22)", async () => {
    const { tower, calls } = fakeTower({ calibratingOnceConnected: true });
    const { io, records, confirmations } = fakeIo(() => "run");
    const results = await runSpike(tower, io, catalog);
    expect(calls).toEqual(["connect", "disconnect", "cleanup"]);
    expect(confirmations).toHaveLength(1);
    expect(results.connect).toBe("passed");
    expect(results.sound).toBe("skipped");
    expect(stepRecords(records).find((record) => record.id === "sound")).toMatchObject({
      reason: "the tower is still calibrating, so the library would drop the command",
    });
  });
});

describe("what the drum steps send", () => {
  it("moves the top drum only, sending the other two back where the tower reports them", async () => {
    const { tower, argsOf } = fakeTower({ drums: { middle: "east", bottom: "west" } });
    const { io, records } = fakeIo(() => "run");
    await runSpike(tower, io, catalog);
    expect(argsOf("rotateWithState")).toEqual([["east", "east", "west"]]);
    expect(argsOf("Rotate")).toEqual([["south", "east", "west"]]);
    expect(records.filter((record) => record.type === "rotate")).toEqual([
      { type: "rotate", command: "rotateWithState", top: "east", middle: "east", bottom: "west" },
      { type: "rotate", command: "Rotate", top: "south", middle: "east", bottom: "west" },
    ]);
  });

  it("picks another side when the top drum is already at the usual target", async () => {
    const atEast = fakeTower({ drums: { top: "east" } });
    await runSpike(atEast.tower, fakeIo(() => "run").io, catalog);
    expect(atEast.argsOf("rotateWithState")).toEqual([["west", "north", "north"]]);

    const atSouth = fakeTower({ drums: { top: "south" } });
    await runSpike(atSouth.tower, fakeIo(() => "run").io, catalog);
    expect(atSouth.argsOf("Rotate")).toEqual([["north", "north", "north"]]);
  });

  it("never sends the legacy rotate to east", async () => {
    for (const top of ["north", "east", "south", "west"] as const) {
      const { tower, argsOf } = fakeTower({ drums: { top } });
      await runSpike(tower, fakeIo(() => "run").io, catalog);
      expect(argsOf("Rotate")[0]?.[0]).not.toBe("east");
      expect(argsOf("Rotate")[0]?.[0]).not.toBe(top);
    }
  });

  it("random-rotates the top drum only: level 1, never the default of all three", async () => {
    const { tower, argsOf } = fakeTower();
    await runSpike(tower, fakeIo(() => "run").io, catalog);
    expect(argsOf("randomRotateLevels")).toEqual([[1]]);
  });

  it("sends the catalog values for sounds, lights, sequences and the seal", async () => {
    const { tower, argsOf } = fakeTower();
    const { io } = fakeIo(
      () => "run",
      (question) => (question.startsWith("Did the sound stop") ? "no" : "noted"),
    );
    await runSpike(tower, io, catalog);
    // Two ordinary plays of the first sound, then the different one as the loop's stop attempt.
    expect(argsOf("playSound")).toEqual([[1], [1], [2]]);
    expect(argsOf("playSoundStateful")).toEqual([[1, true]]);
    expect(argsOf("lightOverrides")).toEqual([[15], [16]]);
    expect(argsOf("breakSeal")).toEqual([[{ side: "north", level: "top" }]]);
    expect(new Set(argsOf("allLightsOn").map(([effect]) => effect))).toEqual(new Set([1]));
    expect(argsOf("connect")).toEqual([[]]);
  });
});

describe("the library's own queue timeout", () => {
  it("ends the run like our own timeout, because the tower may still act", async () => {
    const { tower, calls } = fakeTower({
      failOn: "calibrate",
      failWith: "Command timeout after 30000ms: calibrate",
    });
    const { io, records } = fakeIo(() => "run");
    const results = await runSpike(tower, io, catalog);
    expect(results.calibrate).toBe("timed-out");
    expect(Object.keys(results).at(-1)).toBe("calibrate");
    expect(calls).not.toContain("rotateWithState");
    expect(calls.slice(-2)).toEqual(["disconnect", "cleanup"]);
    expect(records).toContainEqual({ type: "ended-on-timeout", at: "calibrate" });
  });

  it("still carries on after an ordinary failure", async () => {
    const { tower } = fakeTower({ failOn: "breakSeal", failWith: "Cannot send command" });
    const results = await runSpike(tower, fakeIo(() => "run").io, catalog);
    expect(results["pre-calibration-break-seal"]).toBe("failed");
    expect(results.calibrate).toBe("passed");
  });
});

describe("the looped-sound step", () => {
  const playSoundCalls = (calls: string[]) => calls.filter((name) => name === "playSound").length;

  it("stops trying once the person says the sound stopped", async () => {
    const { tower, calls } = fakeTower();
    const { io } = fakeIo(
      () => "run",
      (question) => (question.startsWith("Did the sound stop") ? "yes" : "noted"),
    );
    await runSpike(tower, io, catalog);
    // The two ordinary sound steps, and no "different sound" attempt.
    expect(playSoundCalls(calls)).toBe(2);
  });

  it("tries a different sound when clearing the state did not stop it", async () => {
    const { tower, calls } = fakeTower();
    const { io } = fakeIo(
      () => "run",
      (question) => (question.startsWith("Did the sound stop") ? "no" : "noted"),
    );
    await runSpike(tower, io, catalog);
    expect(playSoundCalls(calls)).toBe(3);
  });

  it("asks once more after the disconnect, only if the step ran", async () => {
    const ranIt = fakeIo(() => "run");
    await runSpike(fakeTower().tower, ranIt.io, catalog);
    const after = ranIt.records.filter((record) => record.type === "after-disconnect");
    expect(after).toMatchObject([{ id: "looped-sound", gap: "GAP-HW-008", answer: "noted" }]);
    const disconnect = ranIt.records.findIndex((record) => record.type === "disconnect");
    expect(ranIt.records.indexOf(after[0] as Record<string, unknown>)).toBeGreaterThan(disconnect);

    const skippedIt = fakeIo((prompt) => (prompt.includes("on loop") ? "skip" : "run"));
    await runSpike(fakeTower().tower, skippedIt.io, catalog);
    expect(skippedIt.records.filter((record) => record.type === "after-disconnect")).toEqual([]);
  });
});

describe("the step list", () => {
  it("has unique ids and starts by connecting", () => {
    const ids = SPIKE_STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("connect");
  });

  it("covers every hold the spike has to answer", () => {
    const gaps = new Set(SPIKE_STEPS.map((step) => step.gap).filter(Boolean));
    expect(gaps).toEqual(
      new Set(["GAP-HW-001", "GAP-HW-006", "GAP-HW-007", "GAP-HW-008", "GAP-HW-009"]),
    );
  });

  it("warns in capitals before every step that moves a drum", () => {
    for (const id of ["calibrate", "rotate-with-state", "legacy-rotate", "random-rotate"]) {
      const step = SPIKE_STEPS.find((candidate) => candidate.id === id);
      expect(step?.warning).toMatch(/DRUMS? WILL (SPIN|TURN)/);
    }
  });
});

describe("redactDeviceInformation", () => {
  it("hides the fields that identify one tower and keeps the rest", () => {
    expect(
      redactDeviceInformation({
        modelNumber: "ReturnToDarkTower",
        serialNumber: "ABC123",
        systemId: "00:11:22",
        firmwareRevision: undefined,
        lastUpdated: new Date("2026-10-13T12:00:00Z"),
      }),
    ).toEqual({
      modelNumber: "ReturnToDarkTower",
      serialNumber: "(present, redacted)",
      systemId: "(present, redacted)",
      firmwareRevision: undefined,
      lastUpdated: "2026-10-13T12:00:00.000Z",
    });
  });

  it("does not claim a missing identifier is present", () => {
    expect(redactDeviceInformation({ serialNumber: undefined })).toEqual({
      serialNumber: undefined,
    });
  });
});
