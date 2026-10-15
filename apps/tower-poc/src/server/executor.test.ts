import {
  type CommandLifecyclePayload,
  findCapability,
  inventory,
  isCommandable,
  RANDOM_ROTATE_DRUMS,
  SOUND_COUNT,
  type ValidatedCommand,
} from "tower-poc-protocols";
import { LIGHT_EFFECTS } from "ultimatedarktower";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockTower } from "./adapters/mockTower.ts";
import {
  CONFIRM_WINDOW_MS,
  createCommandExecutor,
  LIBRARY_COMMAND_TIMEOUT_MS,
  LIGHT_EFFECT_NUMBERS,
  LOCAL_IDS,
  MAX_WAITING,
  MIN_COMMAND_GAP_MS,
  PLANNED_IDS,
} from "./executor.ts";
import { createTowerSession } from "./session.ts";
import { createStateStore } from "./stateStore.ts";
import { createTowerRecords } from "./towerRecords.ts";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);

/** Moves the clock on until `done` settles. */
const finish = async (done: Promise<unknown>, maxMs = 120_000) => {
  let settled = false;
  void done.finally(() => {
    settled = true;
  });
  for (let waited = 0; !settled; waited += 10) {
    if (waited > maxMs) throw new Error(`still running after ${maxMs} ms`);
    await advance(10);
  }
  await done;
};

/** An executor on a session on one mock tower, with every lifecycle stage recorded. */
const setup = async (state: "disconnected" | "connected" | "calibrated" = "calibrated") => {
  const mock = createMockTower();
  const session = createTowerSession({ createAdapter: () => mock.adapter });
  const seen: CommandLifecyclePayload[] = [];
  const store = createStateStore({ now: Date.now });
  const records = createTowerRecords(store);
  const executor = createCommandExecutor({
    session,
    records,
    onLifecycle: (stage) => seen.push(stage),
  });
  if (state !== "disconnected") await finish(session.connect());
  if (state === "calibrated") await finish(session.calibrate());
  session.events.clear();

  let next = 0;
  /** Submits a command from client `c-1` and returns its id. */
  const submit = (capabilityId: string, params: unknown, clientId = "c-1") => {
    next += 1;
    const commandId = `m-${next}`;
    return { commandId, done: executor.submit({ commandId, clientId, capabilityId, params }) };
  };
  const stages = (commandId: string) =>
    seen.filter((stage) => stage.commandId === commandId).map((stage) => stage.stage);
  const last = (commandId: string) => seen.filter((stage) => stage.commandId === commandId).at(-1);
  /** Every packet written to the tower since setup, as hex. */
  const writes = () =>
    session.events.events().flatMap((event) => (event.kind === "tx" ? [event.hex] : []));
  return { mock, session, executor, seen, submit, stages, last, writes, store };
};

/** The light sequence byte is the last of a 20-byte state packet. */
const sequenceByte = (hex: string) => hex.slice(-2);

describe("command executor: what it accepts", () => {
  it("runs a command without the tower's checks exactly when it is the service's own", () => {
    // The refusal is skipped for `serviceOnly`, and the plan's path decides what runs: the two
    // must agree, or a tower command could skip the checks.
    for (const id of PLANNED_IDS) {
      expect(findCapability(id)?.serviceOnly === true, id).toBe(LOCAL_IDS.includes(id));
    }
  });

  it("has a plan for exactly the commandable capabilities", () => {
    const commandable = inventory.filter(isCommandable).map((entry) => entry.id);
    expect([...PLANNED_IDS].sort()).toEqual([...commandable].sort());
  });

  it("takes only what validateCommand produced: a message's raw params do not compile", async () => {
    const { executor, last } = await setup("disconnected");
    const request = { commandId: "m-raw", clientId: "c-1", capabilityId: "sound.play" };
    // @ts-expect-error A plain object is not a ValidatedCommand.
    await executor.run(request, { capabilityId: "sound.play", params: { soundIndex: 1 } });
    // At run time it still meets the executor's own checks.
    expect(last("m-raw")?.stage).toBe("rejected");
  });

  it("numbers light effects as the library does", () => {
    expect(LIGHT_EFFECT_NUMBERS).toEqual(LIGHT_EFFECTS);
  });

  it("rejects a command that fails validation, naming the field, and calls nothing", async () => {
    const { submit, stages, last, writes } = await setup();
    const { commandId, done } = submit("sound.play", { soundIndex: 999 });
    await done;
    expect(stages(commandId)).toEqual(["rejected"]);
    expect(last(commandId)).toMatchObject({
      capabilityId: "sound.play",
      clientId: "c-1",
      reason: "The parameters are not valid.",
      issues: [{ path: ["soundIndex"] }],
    });

    const unknown = submit("tower.raw", { hex: "00" });
    await unknown.done;
    expect(last(unknown.commandId)).toMatchObject({
      stage: "rejected",
      reason: "No capability has this id.",
    });
    expect(writes()).toEqual([]);
  });

  it("rejects a capability that is not a command, and calls nothing", async () => {
    const { submit, last, writes } = await setup();
    const { commandId, done } = submit("connection.connected", {});
    await done;
    expect(last(commandId)).toMatchObject({
      stage: "rejected",
      reason: "This capability cannot be sent as a command.",
    });
    expect(writes()).toEqual([]);
  });

  it("rejects every command while the tower is not connected", async () => {
    const { submit, last } = await setup("disconnected");
    const { commandId, done } = submit("sound.play", { soundIndex: 1 });
    await done;
    expect(last(commandId)).toMatchObject({
      stage: "rejected",
      reason: "The tower is not connected.",
    });
  });

  it("rejects a command that arrives during calibration before the library is called (D22)", async () => {
    const { session, submit, stages, last, writes } = await setup("connected");
    const calibrating = session.calibrate();
    const tower = session.tower();
    if (!tower) throw new Error("expected a tower");
    const playSound = vi.spyOn(tower, "playSound");
    const { commandId, done } = submit("sound.play", { soundIndex: 1 });
    await done;
    expect(stages(commandId)).toEqual(["rejected"]);
    expect(last(commandId)?.reason).toMatch(/calibrating/);
    expect(playSound).not.toHaveBeenCalled();
    // Only the calibration packet went out.
    expect(writes()).toEqual(["04"]);
    await finish(calibrating);
  });

  it("checks again when a command starts: one queued before calibration began is rejected (D22)", async () => {
    const { session, submit, stages, last, writes } = await setup();
    const tower = session.tower();
    if (!tower) throw new Error("expected a tower");
    const playSound = vi.spyOn(tower, "playSound");
    // Both pass the arrival check. Neither has started when calibration begins: the session is
    // calibrating at once, before the lane gets to them. The service refuses this calibrate while
    // commands are in the lane; the executor does not rely on that.
    const first = submit("sound.play", { soundIndex: 1 });
    const second = submit("sound.play", { soundIndex: 2 });
    expect(stages(first.commandId)).toEqual(["queued"]);
    const calibrating = session.calibrate();
    await finish(Promise.all([first.done, second.done]));
    for (const { commandId } of [first, second]) {
      expect(stages(commandId)).toEqual(["queued", "rejected"]);
      expect(last(commandId)?.reason).toMatch(/calibrating/);
    }
    expect(playSound).not.toHaveBeenCalled();
    expect(writes()).toEqual(["04"]);
    await finish(calibrating);
  });

  it("rejects a mechanics command on an uncalibrated tower (D9)", async () => {
    const { submit, last, writes } = await setup("connected");
    const { commandId, done } = submit("mechanics.rotate-drum", { drumIndex: 0, position: 1 });
    await done;
    expect(last(commandId)).toMatchObject({
      stage: "rejected",
      reason: expect.stringMatching(/D9/),
    });
    expect(writes()).toEqual([]);
  });

  it("refuses more than the waiting limit", async () => {
    const { submit, last } = await setup();
    // Sent in one go, so none has started when the last arrives.
    const sent = Array.from({ length: MAX_WAITING + 1 }, () =>
      submit("sound.play", { soundIndex: 1 }),
    );
    expect(last(sent[MAX_WAITING - 1]?.commandId ?? "")?.stage).toBe("queued");
    expect(last(sent[MAX_WAITING]?.commandId ?? "")).toMatchObject({
      stage: "rejected",
      reason: expect.stringMatching(/already waiting/),
    });
    await finish(Promise.all(sent.map((command) => command.done)), 600_000);
  });
});

describe("command executor: what reaches the library", () => {
  it("passes the schema's parsed output, never the client's object", async () => {
    const { session, submit } = await setup();
    const tower = session.tower();
    if (!tower) throw new Error("expected a tower");
    const lights = vi.spyOn(tower, "lights");
    const params = { doorway: [{ position: "north", level: "top", style: "on" }] };
    await finish(submit("lighting.set", params).done);
    expect(lights).toHaveBeenCalledTimes(1);
    const received = lights.mock.calls[0]?.[0];
    expect(received).toEqual(params);
    expect(received).not.toBe(params);
    expect(received?.doorway).not.toBe(params.doorway);
  });

  it("turns names into the library's numbers", async () => {
    const { session, submit } = await setup();
    const tower = session.tower();
    if (!tower) throw new Error("expected a tower");
    const allLightsOn = vi.spyOn(tower, "allLightsOn");
    const setLED = vi.spyOn(tower, "setLED");
    const randomRotate = vi.spyOn(tower, "randomRotateLevels");
    await finish(submit("lighting.all-on", { effect: "breathe" }).done);
    await finish(
      submit("lighting.set-led", { layerIndex: 3, lightIndex: 2, effect: "flicker" }).done,
    );
    await finish(submit("mechanics.random-rotate", { drums: "middle" }).done);
    expect(allLightsOn).toHaveBeenCalledWith(2);
    expect(setLED).toHaveBeenCalledWith(3, 2, 5, undefined);
    expect(randomRotate).toHaveBeenCalledWith(2);
  });
});

describe("command executor: lighting on the mock (M3 step 3.2)", () => {
  // Every lighting control on the Lights page, in the order a person might press them. Each one
  // writes to the tower; how it ends is what the mock answers, as the tower did in the M1 spike.
  const LIGHTING: [id: string, params: unknown][] = [
    ["lighting.all-on", { effect: "breathe" }],
    [
      "lighting.set",
      {
        doorway: [{ position: "north", level: "top", style: "on" }],
        ledge: [{ position: "southwest", style: "flicker" }],
        base: [{ position: { side: "east", level: "bottom" }, style: "breatheFast" }],
      },
    ],
    ["lighting.set-led", { layerIndex: 0, lightIndex: 1, effect: "breathe50percent", loop: true }],
    ["lighting.sequence", { sequence: "twinkle", soundIndex: 1 }],
    ["lighting.all-off", {}],
  ];

  for (const state of ["connected", "calibrated"] as const) {
    it(`sends each lighting command to a ${state} tower, and the tower answers`, async () => {
      const { submit, stages, writes } = await setup(state);
      for (const [id, params] of LIGHTING) {
        const before = writes().length;
        const { commandId, done } = submit(id, params);
        await finish(done);
        expect(stages(commandId), id).toEqual([
          "queued",
          "started",
          "write-completed",
          "confirmed",
        ]);
        expect(writes().length, id).toBeGreaterThan(before);
      }
    });
  }

  it("plays a rotation sequence only on a calibrated tower, and ends it unanswered (D23)", async () => {
    const uncalibrated = await setup("connected");
    const refused = uncalibrated.submit("lighting.sequence", { sequence: "rotationDrumTop" });
    await finish(refused.done);
    expect(uncalibrated.stages(refused.commandId)).toEqual(["rejected"]);
    expect(uncalibrated.writes()).toEqual([]);

    const { submit, stages, writes } = await setup("calibrated");
    const { commandId, done } = submit("lighting.sequence", { sequence: "rotationDrumTop" });
    await finish(done);
    expect(stages(commandId)).toEqual(["queued", "started", "write-completed", "indeterminate"]);
    expect(writes()).toHaveLength(1);
  });
});

describe("command executor: sound on the mock (M3 step 3.3)", () => {
  // Both sound controls on the Sounds page, at the ends of the catalog and with every volume.
  const SOUNDS: [id: string, params: unknown][] = [
    ["sound.play", { soundIndex: 1 }],
    ["sound.play", { soundIndex: SOUND_COUNT }],
    ["sound.play-stateful", { soundIndex: 12 }],
    ...[0, 1, 2, 3].map((volume): [string, unknown] => [
      "sound.play-stateful",
      { soundIndex: 12, volume },
    ]),
  ];

  for (const state of ["connected", "calibrated"] as const) {
    it(`sends each sound command to a ${state} tower, and the tower answers`, async () => {
      const { submit, stages, writes } = await setup(state);
      for (const [id, params] of SOUNDS) {
        const before = writes().length;
        const { commandId, done } = submit(id, params);
        await finish(done);
        expect(stages(commandId), `${id} ${JSON.stringify(params)}`).toEqual([
          "queued",
          "started",
          "write-completed",
          "confirmed",
        ]);
        expect(writes().length, id).toBeGreaterThan(before);
      }
    });
  }

  it("refuses a sound outside the catalog, writing nothing", async () => {
    const { submit, stages, writes } = await setup("connected");
    for (const soundIndex of [0, SOUND_COUNT + 1]) {
      const { commandId, done } = submit("sound.play", { soundIndex });
      await finish(done);
      expect(stages(commandId)).toEqual(["rejected"]);
    }
    expect(writes()).toEqual([]);
  });
});

describe("command executor: mechanics on the mock (M3 step 3.4)", () => {
  // Every rotation control on the Mechanics page. After calibration every drum faces north, so
  // each of these moves at least one drum, and the tower answers when the rotation ends.
  const ROTATIONS: [id: string, params: unknown][] = [
    ["mechanics.rotate-with-state", { top: "east", middle: "south", bottom: "west" }],
    [
      "mechanics.rotate-with-state",
      { top: "north", middle: "north", bottom: "north", soundIndex: 3 },
    ],
    ["mechanics.rotate-drum", { drumIndex: 2, position: 1 }],
    ["mechanics.rotate-drum", { drumIndex: 0, position: 3, playSound: true }],
  ];

  it("rotates on a calibrated tower, and the tower answers", async () => {
    const { submit, stages, writes } = await setup("calibrated");
    for (const [id, params] of ROTATIONS) {
      const before = writes().length;
      const { commandId, done } = submit(id, params);
      await finish(done);
      expect(stages(commandId), `${id} ${JSON.stringify(params)}`).toEqual([
        "queued",
        "started",
        "write-completed",
        "confirmed",
      ]);
      expect(writes().length, id).toBeGreaterThan(before);
    }
  });

  it("rotates each set of drums at random, with the side the library picks", async () => {
    // 0.3 picks east, the second of the four sides; every drum faces north after calibration.
    const random = vi.spyOn(Math, "random").mockReturnValue(0.3);
    try {
      for (const drums of Object.keys(RANDOM_ROTATE_DRUMS)) {
        const { submit, stages } = await setup("calibrated");
        const { commandId, done } = submit("mechanics.random-rotate", { drums });
        await finish(done);
        expect(stages(commandId), drums).toEqual([
          "queued",
          "started",
          "write-completed",
          "confirmed",
        ]);
      }
    } finally {
      random.mockRestore();
    }
  });

  it("sends nothing for a rotation to where the drums already are, and says so", async () => {
    const { submit, stages, last, writes } = await setup("calibrated");
    const { commandId, done } = submit("mechanics.rotate-drum", { drumIndex: 1, position: 0 });
    await finish(done);
    expect(stages(commandId)).toEqual(["queued", "started", "indeterminate"]);
    expect(last(commandId)).toMatchObject({
      written: false,
      reason: expect.stringMatching(/already in that state/),
    });
    expect(writes()).toEqual([]);
  });

  it("refuses every rotation before calibration, writing nothing (D9)", async () => {
    const { submit, stages, writes } = await setup("connected");
    for (const [id, params] of [
      ...ROTATIONS,
      ["mechanics.random-rotate", { drums: "all" }] as [string, unknown],
    ]) {
      const { commandId, done } = submit(id, params);
      await finish(done);
      expect(stages(commandId), id).toEqual(["rejected"]);
    }
    expect(writes()).toEqual([]);
  });
});

describe("command executor: lifecycle", () => {
  it("confirms a sound the tower echoes, attributed to its sender", async () => {
    const { submit, seen, writes } = await setup();
    const { commandId, done } = submit("sound.play", { soundIndex: 1 }, "c-9");
    await finish(done);
    const mine = seen.filter((stage) => stage.commandId === commandId);
    expect(mine.map((stage) => stage.stage)).toEqual([
      "queued",
      "started",
      "write-completed",
      "confirmed",
    ]);
    expect(new Set(mine.map((stage) => stage.clientId))).toEqual(new Set(["c-9"]));
    expect(writes()).toHaveLength(1);
  });

  it("confirms all lights on when the tower answers, and calls it indeterminate when it does not (GAP-HW-010)", async () => {
    const { submit, stages, last } = await setup();
    const first = submit("lighting.all-on", {});
    await finish(first.done);
    expect(stages(first.commandId)).toEqual(["queued", "started", "write-completed", "confirmed"]);

    // The lights are already on, so the tower stays silent.
    const second = submit("lighting.all-on", {});
    await finish(second.done);
    expect(stages(second.commandId)).toEqual([
      "queued",
      "started",
      "write-completed",
      "indeterminate",
    ]);
    expect(last(second.commandId)?.reason).toMatch(/no state back within 1 s/);
    // It was written, so it must not read as "Not sent".
    expect(last(second.commandId)).not.toHaveProperty("written");
  });

  it("maps the library's 30-second rejection of a written command to indeterminate (GAP-HW-010)", async () => {
    const { submit, stages, last, writes } = await setup();
    const lights = { doorway: [{ position: "east", level: "middle", style: "breathe" }] };
    await finish(submit("lighting.set", lights).done);
    const startedAt = Date.now();
    // The same lights again change nothing, so the tower does not answer.
    const again = submit("lighting.set", lights);
    await finish(again.done);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(LIBRARY_COMMAND_TIMEOUT_MS);
    expect(stages(again.commandId)).toEqual([
      "queued",
      "started",
      "write-completed",
      "indeterminate",
    ]);
    expect(last(again.commandId)?.reason).toMatch(/30 s/);
    expect(writes()).toHaveLength(2);
    expect(last(again.commandId)).not.toHaveProperty("written");
  });

  it("ends as timed-out when the library never settles, and sends nothing again", async () => {
    const { session, submit, stages, writes } = await setup();
    const tower = session.tower();
    if (!tower) throw new Error("expected a tower");
    const playSound = vi.spyOn(tower, "playSound").mockReturnValue(new Promise(() => {}));
    const { commandId, done } = submit("sound.play", { soundIndex: 1 });
    await finish(done);
    expect(stages(commandId)).toEqual(["queued", "started", "timed-out"]);
    await advance(120_000);
    expect(playSound).toHaveBeenCalledTimes(1);
    expect(writes()).toEqual([]);
  });

  it("ends a direct write the library never settles as timed-out after 5 s, and sends nothing again", async () => {
    const { session, submit, stages, last, writes } = await setup();
    const tower = session.tower();
    if (!tower) throw new Error("expected a tower");
    const allLightsOn = vi.spyOn(tower, "allLightsOn").mockReturnValue(new Promise(() => {}));
    const startedAt = Date.now();
    const { commandId, done } = submit("lighting.all-on", {});
    await finish(done);
    expect(Date.now() - startedAt).toBeLessThan(6_000);
    expect(stages(commandId)).toEqual(["queued", "started", "timed-out"]);
    expect(last(commandId)?.reason).toMatch(/within 5 s/);
    await advance(120_000);
    expect(allLightsOn).toHaveBeenCalledTimes(1);
    expect(writes()).toEqual([]);
  });

  it("attributes every stage to the client that sent the command, when clients interleave", async () => {
    const { submit, seen } = await setup();
    const fromA = submit("sound.play", { soundIndex: 1 }, "c-a");
    const fromB = submit("sound.play", { soundIndex: 999 }, "c-b");
    const fromC = submit("lighting.all-off", {}, "c-c");
    const againA = submit("sound.play", { soundIndex: 2 }, "c-a");
    await finish(Promise.all([fromA.done, fromB.done, fromC.done, againA.done]));
    const senders = (commandId: string) =>
      new Set(seen.filter((stage) => stage.commandId === commandId).map((stage) => stage.clientId));
    expect(senders(fromA.commandId)).toEqual(new Set(["c-a"]));
    expect(senders(fromB.commandId)).toEqual(new Set(["c-b"]));
    expect(senders(fromC.commandId)).toEqual(new Set(["c-c"]));
    expect(senders(againA.commandId)).toEqual(new Set(["c-a"]));
    // Every stage of every command, the rejection included, names its sender.
    expect(seen.every((stage) => stage.clientId.length > 0)).toBe(true);
  });

  it("calls a command the library sent nothing for indeterminate", async () => {
    const { submit, stages, last, writes } = await setup();
    // Calibration leaves every drum north, so the library skips this rotation.
    const { commandId, done } = submit("mechanics.rotate-drum", { drumIndex: 0, position: 0 });
    await finish(done);
    expect(stages(commandId)).toEqual(["queued", "started", "indeterminate"]);
    expect(last(commandId)?.reason).toMatch(/sent nothing/);
    expect(writes()).toEqual([]);
  });

  it("confirms a command of the service's own without writing to the tower (spec D24)", async () => {
    const { session, submit, stages, last, writes, store } = await setup();
    const seal = { side: "north", level: "top" } as const;
    const { commandId, done } = submit("seals.mark-broken", { seal });
    await finish(done);
    expect(stages(commandId)).toEqual(["queued", "started", "confirmed"]);
    expect(last(commandId)?.reason).toMatch(/nothing is sent to the tower/);
    expect(store.record("seals.broken")).toEqual([seal]);
    // The library's own record is neither written nor read.
    expect(session.tower()?.isSealBroken(seal)).toBe(false);
    expect(writes()).toEqual([]);
  });

  it("fails a running command when the connection ends, and rejects the ones still waiting", async () => {
    const { mock, submit, stages, last } = await setup();
    const lights = { ledge: [{ position: "northeast", style: "on" }] };
    await finish(submit("lighting.set", lights).done);
    // No answer is coming for this one, so it is still running when the link goes.
    const running = submit("lighting.set", lights);
    const waiting = submit("sound.play", { soundIndex: 1 });
    await advance(1_000);
    mock.dropConnection();
    await finish(Promise.all([running.done, waiting.done]));
    expect(stages(running.commandId)).toEqual(["queued", "started", "failed"]);
    expect(last(running.commandId)?.reason).toMatch(/connection ended/);
    expect(stages(waiting.commandId)).toEqual(["queued", "rejected"]);
    expect(last(waiting.commandId)?.reason).toBe("The tower is not connected.");
  });
});

describe("command executor: one lane", () => {
  it("runs commands one at a time in arrival order, spaced at least 250 ms apart", async () => {
    const { session, submit, seen } = await setup();
    const sentAt: number[] = [];
    const original = session.events.emit;
    session.events.emit = (event) => {
      if (event.kind === "tx") sentAt.push(Date.now());
      original(event);
    };
    // All lights on skips the library's queue, so only the lane keeps it behind the sound.
    const sound = submit("sound.play", { soundIndex: 1 });
    const lights = submit("lighting.all-on", {});
    const another = submit("sound.play", { soundIndex: 2 });
    await finish(Promise.all([sound.done, lights.done, another.done]));

    const order = seen
      .filter((stage) => stage.stage === "started" || stage.stage === "confirmed")
      .map((stage) => `${stage.commandId} ${stage.stage}`);
    expect(order).toEqual([
      `${sound.commandId} started`,
      `${sound.commandId} confirmed`,
      `${lights.commandId} started`,
      `${lights.commandId} confirmed`,
      `${another.commandId} started`,
      `${another.commandId} confirmed`,
    ]);
    expect(sentAt).toHaveLength(3);
    const gaps = sentAt.slice(1).map((at, index) => at - (sentAt[index] ?? at));
    for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(MIN_COMMAND_GAP_MS);
  });
});

describe("command executor: busy", () => {
  it("is busy from the first queued command until the spacing after the last write has passed", async () => {
    const { executor, submit, stages } = await setup();
    expect(executor.busy()).toBe(false);
    const first = submit("sound.play", { soundIndex: 1 });
    const second = submit("sound.play", { soundIndex: 2 });
    expect(executor.busy()).toBe(true);
    // Run until the second command is confirmed: its lifecycle has ended, the spacing has not.
    for (let waited = 0; stages(second.commandId).at(-1) !== "confirmed"; waited += 10) {
      if (waited > 10_000) throw new Error("the second command did not finish");
      await advance(10);
    }
    expect(executor.busy()).toBe(true);
    await finish(Promise.all([first.done, second.done]));
    expect(executor.busy()).toBe(false);
  });

  it("is not busy for a command rejected on arrival", async () => {
    const { executor, submit } = await setup("connected");
    const { done } = submit("mechanics.rotate-drum", { drumIndex: 0, position: 1 });
    expect(executor.busy()).toBe(false);
    await done;
    expect(executor.busy()).toBe(false);
  });
});

describe("command executor: known limits", () => {
  // From the step 5 review, pinned at Bob's decision (M2 step 9): the library's queue takes any
  // state the tower reports as the answer to the command it is waiting on. A report that is not
  // that answer, such as a direct write's answer arriving more than 1.25 s late, would confirm the
  // next queued command early (GAP-LIB-010). M1 echoes came in 25 to 64 ms. If this test starts
  // failing, the library has learned to tell answers apart, and the gap can be resolved.
  it("confirms a queued command the tower did not answer when some other report arrives", async () => {
    const { mock, submit, stages, writes } = await setup();
    const lights = { doorway: [{ position: "west", level: "bottom", style: "on" }] };
    await finish(submit("lighting.set", lights).done);
    // The same lights again change nothing, so the tower does not answer this one.
    const unanswered = submit("lighting.set", lights);
    await advance(2_000);
    expect(stages(unanswered.commandId)).toEqual(["queued", "started"]);
    // Stands in for a late answer to an earlier write: a report the command did not cause.
    mock.dropSkull();
    await finish(unanswered.done);
    expect(stages(unanswered.commandId)).toEqual([
      "queued",
      "started",
      "write-completed",
      "confirmed",
    ]);
    expect(writes()).toHaveLength(2);
  });
});

describe("command executor: silent light sequences (D23)", () => {
  // These tests build the command by hand, so they can also send one with a sound, which
  // `validateCommand` accepts and the executor must refuse.
  const silent = (sequence: string, soundIndex?: number) =>
    ({
      capabilityId: "lighting.sequence",
      params: soundIndex === undefined ? { sequence } : { sequence, soundIndex },
    }) as unknown as ValidatedCommand;

  it("sends one without waiting for an answer, and ends it as indeterminate", async () => {
    const { executor, stages, last, writes } = await setup();
    const startedAt = Date.now();
    const done = executor.run(
      { commandId: "s-1", clientId: "c-1", capabilityId: "lighting.sequence" },
      silent("rotationAllDrums"),
    );
    await finish(done);
    expect(Date.now() - startedAt).toBeLessThan(CONFIRM_WINDOW_MS);
    expect(stages("s-1")).toEqual(["queued", "started", "write-completed", "indeterminate"]);
    expect(last("s-1")?.reason).toMatch(/does not answer/);
    const [packet] = writes();
    expect(writes()).toHaveLength(1);
    // rotationAllDrums is sequence 15; the drums are the calibrated ones the tower reported.
    expect(sequenceByte(packet ?? "")).toBe("0f");
    expect(packet?.slice(2, 6)).toBe("1042");
  });

  it("clears the sequence before the next command, so that command does not replay it", async () => {
    const { executor, submit, stages, writes } = await setup();
    await finish(
      executor.run(
        { commandId: "s-1", clientId: "c-1", capabilityId: "lighting.sequence" },
        silent("rotationDrumTop"),
      ),
    );
    const sound = submit("sound.play", { soundIndex: 1 });
    await finish(sound.done);
    expect(stages(sound.commandId)).toEqual(["queued", "started", "write-completed", "confirmed"]);
    // The sequence, the clearing state, then the sound, which carries no sequence.
    expect(writes().map(sequenceByte)).toEqual(["10", "00", "00"]);
  });

  it("clears after a silent send that failed, since the library recorded the sequence first", async () => {
    const { mock, executor, submit, stages, writes } = await setup();
    const write = vi.spyOn(mock.adapter, "writeCharacteristic");
    write.mockRejectedValueOnce(new Error("GATT write failed"));
    await finish(
      executor.run(
        { commandId: "s-1", clientId: "c-1", capabilityId: "lighting.sequence" },
        silent("rotationAllDrums"),
      ),
    );
    expect(stages("s-1")).toEqual(["queued", "started", "failed"]);
    const sound = submit("sound.play", { soundIndex: 1 });
    await finish(sound.done);
    expect(stages(sound.commandId).at(-1)).toBe("confirmed");
    // The failed sequence, the clearing state, then the sound with no sequence in it.
    expect(writes().map(sequenceByte)).toEqual(["0f", "00", "00"]);
  });

  it("fails the command when the clearing write fails, and sends no sequence after it", async () => {
    const { mock, session, executor, submit, stages, last, writes } = await setup();
    await finish(
      executor.run(
        { commandId: "s-1", clientId: "c-1", capabilityId: "lighting.sequence" },
        silent("rotationDrumTop"),
      ),
    );
    const write = vi.spyOn(mock.adapter, "writeCharacteristic");
    write.mockRejectedValueOnce(new Error("GATT write failed"));
    const first = submit("sound.play", { soundIndex: 1 });
    await finish(first.done);
    expect(stages(first.commandId)).toEqual(["queued", "started", "failed"]);
    expect(last(first.commandId)?.reason).toMatch(/Could not clear/);
    const second = submit("sound.play", { soundIndex: 2 });
    await finish(second.done);
    expect(stages(second.commandId).at(-1)).toBe("confirmed");
    // The sequence, the clear that failed, then the sound. `sendTowerState` recorded the cleared
    // state before its write failed, so the library holds no sequence and none is sent again.
    expect(writes().map(sequenceByte)).toEqual(["10", "00", "00"]);
    expect(session.tower()?.getCurrentTowerState().led_sequence).toBe(0);
  });

  it("does not clear when the tower has reported its state since", async () => {
    const { mock, executor, submit, writes } = await setup();
    await finish(
      executor.run(
        { commandId: "s-1", clientId: "c-1", capabilityId: "lighting.sequence" },
        silent("rotationDrumMiddle"),
      ),
    );
    // A skull drop is a state report, and the library resets the sequence on it.
    mock.dropSkull();
    await finish(submit("sound.play", { soundIndex: 1 }).done);
    expect(writes().map(sequenceByte)).toEqual(["11", "00"]);
  });

  it("rejects one with a sound, which the direct write would drop", async () => {
    const { executor, last, writes } = await setup();
    await executor.run(
      { commandId: "s-1", clientId: "c-1", capabilityId: "lighting.sequence" },
      silent("rotationAllDrums", 3),
    );
    expect(last("s-1")).toMatchObject({
      stage: "rejected",
      reason: expect.stringMatching(/sound/),
    });
    expect(writes()).toEqual([]);
  });

  it("accepts rotationDrumMiddle, sends it without waiting, and flags nothing in the lifecycle", async () => {
    const { submit, stages, last, writes } = await setup();
    const started = Date.now();
    const { commandId, done } = submit("lighting.sequence", { sequence: "rotationDrumMiddle" });
    await finish(done);
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(stages(commandId)).toEqual(["queued", "started", "write-completed", "indeterminate"]);
    expect(last(commandId)?.reason).toMatch(/does not answer/);
    expect(writes().map(sequenceByte)).toEqual(["11"]);
  });

  it("rejects one on an uncalibrated tower, where none was tried", async () => {
    const { executor, last, writes } = await setup("connected");
    await executor.run(
      { commandId: "s-1", clientId: "c-1", capabilityId: "lighting.sequence" },
      silent("rotationDrumBottom"),
    );
    expect(last("s-1")).toMatchObject({ stage: "rejected", reason: expect.stringMatching(/D23/) });
    expect(writes()).toEqual([]);
  });
});

describe("command executor: flash one light", () => {
  it("toggles one light for the burst and does not sit for the library's 30 s", async () => {
    const { submit, stages, last, writes, seen } = await setup();
    const started = Date.now();
    const { commandId, done } = submit("lighting.flash", {
      layerIndex: 0,
      lightIndex: 0,
      flashesPerSecond: 2,
      durationMs: 5_000,
    });
    await finish(done);
    expect(Date.now() - started).toBeLessThan(10_000);
    expect(last(commandId)?.stage).not.toBe("timed-out");
    expect(stages(commandId)).toContain("write-completed");
    expect(writes().length).toBeGreaterThan(1);
    const life = seen.filter((stage) => stage.commandId === commandId);
    const sent = life.find((stage) => stage.stage === "write-completed");
    const ended = life.find((stage) => stage.stage === last(commandId)?.stage);
    expect(sent && ended && ended.at - sent.at).toBeGreaterThan(4_000);
  });

  it("refuses a rate that is not 2, 4, 6 or 8", async () => {
    const { submit, last, writes } = await setup();
    const { commandId, done } = submit("lighting.flash", {
      layerIndex: 0,
      lightIndex: 0,
      flashesPerSecond: 3,
      durationMs: 5_000,
    });
    await finish(done);
    expect(last(commandId)?.stage).toBe("rejected");
    expect(writes()).toEqual([]);
  });
});

describe("command executor: seals and skulls (M3 step 3.5)", () => {
  const seal = { side: "east", level: "middle" } as const;
  const other = { side: "north", level: "top" } as const;

  for (const state of ["disconnected", "connected", "calibrated"] as const) {
    it(`changes the service's record with the tower ${state}, and writes nothing`, async () => {
      const { submit, stages, writes, store } = await setup(state);
      const run = async (id: string, params: unknown) => {
        const { commandId, done } = submit(id, params);
        await finish(done);
        expect(stages(commandId), id).toEqual(["queued", "started", "confirmed"]);
      };
      await run("seals.mark-broken", { seal });
      await run("seals.mark-broken", { seal: other });
      // Kept once each, in level then side order, whatever order they were marked in.
      expect(store.record("seals.broken")).toEqual([other, seal]);
      await run("seals.mark-broken", { seal });
      expect(store.record("seals.broken")).toEqual([other, seal]);
      await run("seals.mark-restored", { seal: other });
      expect(store.record("seals.broken")).toEqual([seal]);
      await run("seals.reset", {});
      expect(store.record("seals.broken")).toEqual([]);

      store.setRecord("skulls.count", { count: 4, since: 1 });
      const resetAt = Date.now();
      await run("skulls.reset-record", {});
      expect(store.record("skulls.count")).toEqual({ count: 0, since: resetAt });
      expect(writes()).toEqual([]);
    });
  }

  for (const state of ["connected", "calibrated"] as const) {
    it(`breaks a seal on a ${state} tower and records it once the tower confirms`, async () => {
      const { submit, stages, writes, store } = await setup(state);
      const { commandId, done } = submit("seals.break", { seal });
      await finish(done);
      expect(stages(commandId)).toEqual(["queued", "started", "write-completed", "confirmed"]);
      expect(writes().length).toBeGreaterThan(0);
      expect(store.record("seals.broken")).toEqual([seal]);
    });
  }

  it("does not record a seal whose break the tower did not confirm", async () => {
    const { mock, submit, stages, store } = await setup("connected");
    const { commandId, done } = submit("seals.break", { seal });
    await advance(10);
    mock.dropConnection();
    await finish(done);
    expect(stages(commandId).at(-1)).toBe("failed");
    expect(store.record("seals.broken")).toEqual([]);
  });

  it("refuses to break a seal with the tower disconnected, and records nothing", async () => {
    const { submit, last, store } = await setup("disconnected");
    const { commandId, done } = submit("seals.break", { seal });
    await finish(done);
    expect(last(commandId)).toMatchObject({
      stage: "rejected",
      reason: "The tower is not connected.",
    });
    expect(store.record("seals.broken")).toEqual([]);
  });

  it("sends the tower's skull counter reset as a state packet, leaving the app's count", async () => {
    const { mock, submit, stages, writes, store } = await setup("connected");
    mock.dropSkull();
    await advance(100);
    store.setRecord("skulls.count", { count: 3, since: 1 });
    const { commandId, done } = submit("skulls.reset-count", {});
    await finish(done);
    // Not the firmware's resetCounter (03): a state packet with the beam count at 0 (GAP-LIB-012).
    const [packet] = writes();
    expect(writes()).toHaveLength(1);
    expect(packet?.length).toBe(40);
    expect(packet?.slice(0, 2)).toBe("00");
    expect(packet?.slice(32, 34)).toBe("00");
    // The mock ignores the count in a packet, so nothing changed and it does not answer.
    expect(stages(commandId)).toEqual(["queued", "started", "write-completed", "indeterminate"]);
    expect(store.record("skulls.count")).toEqual({ count: 3, since: 1 });
  });
});
