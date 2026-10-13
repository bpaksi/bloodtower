import { describe, expect, it } from "vitest";
import {
  type Answer,
  redactDeviceInformation,
  runSpike,
  SPIKE_STEPS,
  type SpikeIo,
  type SpikeStep,
  type SpikeTower,
} from "./spikeSteps.ts";

const catalog = {
  soundIndex: 1,
  lightEffectOn: 1,
  rotationSequences: [
    { name: "rotationAllDrums", value: 15 },
    { name: "rotationDrumTop", value: 16 },
  ],
};

/** A tower that records every call and never touches Bluetooth. */
const fakeTower = (options: { failOn?: string; hangOn?: string } = {}) => {
  const calls: string[] = [];
  let connected = false;
  let calibrated = false;
  const call = (name: string, effect?: () => void) => async () => {
    calls.push(name);
    if (options.failOn === name) throw new Error(`${name} failed`);
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
  };
  return { tower, calls };
};

/** Answers every confirmation from `answers` (by step order), then "skip". Waits take no time. */
const fakeIo = (answers: Answer[] | ((prompt: string) => Answer)) => {
  const records: Record<string, unknown>[] = [];
  const confirmations: string[] = [];
  let index = 0;
  const io: SpikeIo = {
    confirm: async (prompt) => {
      confirmations.push(prompt);
      return typeof answers === "function" ? answers(prompt) : (answers[index++] ?? "skip");
    },
    observe: async () => "noted",
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
    expect(results["rotate-with-state"]).toBe("skipped");
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
    for (const id of ["calibrate", "rotate-with-state", "legacy-rotate"]) {
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
