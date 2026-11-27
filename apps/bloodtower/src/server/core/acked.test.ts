import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger, type HostLogger } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { DEMO_PROMPT_ID } from "./demoLine.ts";
import { type CoreSession, createCoreSession } from "./session.ts";

const dirs: string[] = [];
const closers: Array<() => void> = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const bootSession = async (options?: {
  onChange?: () => void;
  onDeviceAck?: (deviceId: string) => void;
  onDeviceError?: (deviceId: string, code: string, message: string) => void;
}) => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-acked-"));
  dirs.push(dir);
  const opened = openDatabase(join(dir, "session.sqlite"));
  closers.push(() => opened.close());
  const store = createEventStore(opened.db);
  createSessionStore(opened.db).saveRoster({
    sessionId: "session-1",
    packId: "test",
    packVersion: "0.1.0",
    startedWall: "2026-10-30T00:00:00.000Z",
    joinCode: "000000",
    devices: [],
    holdings: [],
  });
  const errors: Array<{ code: string; message: string }> = [];
  const realLog = createHostLogger({ dataDir: dir, mirror: false });
  const log: HostLogger = {
    ...realLog,
    error: (code, message, fields) => {
      errors.push({ code, message });
      realLog.error(code, message, fields);
    },
  };
  const ackedCallbacks: string[] = [];
  const deviceErrors: Array<{ deviceId: string; code: string; message: string }> = [];
  const session: CoreSession = createCoreSession({
    sessionId: "session-1",
    seed: "acked-seed",
    allowTestSeed: true,
    stories: [TEST_STORY],
    playContent: PROVING_GROUNDS_PLAY,
    packVersion: "0.1.0",
    store,
    tower: bloodtowerTowerFromMock(createMockTower({ log })),
    clock: stepClock(),
    log,
    demoLine: null,
    onChange: () => options?.onChange?.(),
    onDeviceAck: (deviceId) => {
      ackedCallbacks.push(deviceId);
      options?.onDeviceAck?.(deviceId);
    },
    onDeviceError: (deviceId, code, message) => {
      deviceErrors.push({ deviceId, code, message });
      options?.onDeviceError?.(deviceId, code, message);
    },
    graceMs: 10,
  });
  await session.whenIdle();
  return { session, errors, ackedCallbacks, deviceErrors };
};

describe("CU17 CoreSession acked tracking", () => {
  it("starts at 0 on join, counts per-device enqueued presses, and leaves other devices at 0", async () => {
    const { session } = await bootSession();
    const first = session.join({ joinCode: "000000", formFactor: "ipad" });
    const second = session.join({ joinCode: "000000", formFactor: "ipad" });
    await session.whenIdle();
    if (!first.ok || !second.ok) throw new Error("join refused");

    expect(session.ackedFor(first.deviceId)).toBe(0);
    expect(session.ackedFor(second.deviceId)).toBe(0);

    session.act(first.deviceId, "base-board-done", "board-set-up", {});
    await session.whenIdle();
    expect(session.ackedFor(first.deviceId)).toBe(1);
    expect(session.ackedFor(second.deviceId)).toBe(0);

    session.act(first.deviceId, "play-without-tower", "play-without-tower", {});
    await session.whenIdle();
    expect(session.ackedFor(first.deviceId)).toBe(2);
    expect(session.ackedFor(second.deviceId)).toBe(0);
  });

  it("acks refused and no-op presses (bad args, unknown gear, demo off, event refusal) and notifies onDeviceAck", async () => {
    const { session, errors, ackedCallbacks, deviceErrors } = await bootSession();
    const pad1 = session.join({ joinCode: "000000", formFactor: "ipad" });
    const pad2 = session.join({ joinCode: "000000", formFactor: "ipad" });
    await session.whenIdle();
    if (!pad1.ok || !pad2.ok) throw new Error("join refused");

    // (a) Bad args: hero-hold without heroId, focus-story without storyId, set-setting without optionId.
    session.act(pad1.deviceId, "hero-hold", "take", {});
    expect(session.ackedFor(pad1.deviceId)).toBe(1);
    expect(ackedCallbacks).toEqual([pad1.deviceId]);

    session.act(pad1.deviceId, "focus-story", "focus", {});
    expect(session.ackedFor(pad1.deviceId)).toBe(2);

    session.act(pad1.deviceId, "set-setting", "set", { settingId: "hints" });
    expect(session.ackedFor(pad1.deviceId)).toBe(3);

    // (c) Unknown gear action logs gear-act and still acks.
    session.act(pad1.deviceId, "gear", "bogus", {});
    expect(session.ackedFor(pad1.deviceId)).toBe(4);
    expect(errors.some((entry) => entry.code === "gear-act")).toBe(true);

    // Demo line when off still acks after its queued handler returns.
    session.act(pad1.deviceId, DEMO_PROMPT_ID, "play", {});
    await session.whenIdle();
    expect(session.ackedFor(pad1.deviceId)).toBe(5);
    expect(ackedCallbacks.filter((id) => id === pad1.deviceId).length).toBeGreaterThanOrEqual(5);

    // Walk pad1 into an open event while pad2 holds no heroes, then test (b) event refusal on pad2.
    const act1 = async (promptId: string, actionId: string, args: Record<string, unknown> = {}) => {
      session.act(pad1.deviceId, promptId, actionId, args);
      await session.whenIdle();
    };
    await act1("base-board-done", "board-set-up");
    await act1("play-without-tower", "play-without-tower");
    await act1("continue-pick-story-test", "continue");
    await act1("set-setting", "set", { settingId: "hints", optionId: "off" });
    await act1("continue-game-settings", "continue");
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      await act1("hero-hold", "take", { heroId });
    }
    await act1("continue-claim-heroes", "continue");
    for (const step of session.state().setupSteps) {
      if (step.id === "starting-purse") await act1(`spin-setup-${step.id}`, "spin");
      await act1(`continue-setup-${step.id}`, "continue");
    }
    await act1("continue-begin", "continue");
    for (const moment of OPENING_MOMENTS) await act1(openingPromptId(moment), "continue");
    const roll = session
      .projectDevice(pad1.deviceId)
      .actions.find((action) => action.open && action.promptId.endsWith("-roll-done"));
    if (!roll) throw new Error("No move roll.");
    await act1(roll.promptId, roll.actionId);
    const play = session.state().play;
    if (!play) throw new Error("No play state.");
    const skulls = play.content.board.spaces
      .filter((space) => space.building)
      .map((space) => `${space.id}=1`)
      .join(",");
    await session.applyTestSeed(`~test-skulls:${skulls}~test-event:hazard-storm`);
    const end = session
      .projectDevice(pad1.deviceId)
      .actions.find((action) => action.open && action.actionId === "end-turn");
    if (!end) throw new Error("No end-turn.");
    await act1(end.promptId, end.actionId);

    const eventChoice = session
      .projectDevice(pad1.deviceId)
      .actions.find((action) => action.open && action.actionId === "choose");
    if (!eventChoice) throw new Error("No event choice offered.");

    expect(session.ackedFor(pad2.deviceId)).toBe(0);
    session.act(pad2.deviceId, eventChoice.promptId, eventChoice.actionId, {});
    expect(session.ackedFor(pad2.deviceId)).toBe(1);
    expect(ackedCallbacks.at(-1)).toBe(pad2.deviceId);
    expect(errors.some((entry) => entry.code === "event-press-refused")).toBe(true);
    expect(
      deviceErrors.some(
        (entry) => entry.deviceId === pad2.deviceId && entry.code === "invalid-state",
      ),
    ).toBe(true);
  });
});
