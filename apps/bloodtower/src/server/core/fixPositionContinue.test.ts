import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { createEventStore, type EventStore } from "../events/store.ts";
import { createHostLogger } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower, type MockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { type CoreSession, createCoreSession } from "./session.ts";

// CU/05 EV-24: a Fix my position pick is saved, so Continue brings the group back where it was put.
const HEROES = ["hero-a", "hero-b", "hero-c", "hero-d"];
const dirs: string[] = [];
const closers: Array<() => void> = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("Fix my position survives Continue", () => {
  it("a correction is in the log and the restored group stands where it was put", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bloodtower-cu05-"));
    dirs.push(dir);
    const opened = openDatabase(join(dir, "session.sqlite"));
    closers.push(() => opened.close());
    const store = createEventStore(opened.db);
    const log = createHostLogger({ dataDir: dir, mirror: false });
    const clock = stepClock();
    createSessionStore(opened.db).saveRoster({
      sessionId: "session-1",
      packId: "test",
      packVersion: "0.1.0",
      startedWall: "2026-10-30T00:00:00.000Z",
      joinCode: "000000",
      devices: [],
      holdings: [],
    });
    let count = 0;
    const boot = async () => {
      count += 1;
      const tower = createMockTower({ log });
      const session = createCoreSession({
        sessionId: `session-${count}`,
        seed: "seed",
        stories: [TEST_STORY],
        playContent: PROVING_GROUNDS_PLAY,
        packVersion: "0.1.0",
        store,
        tower: bloodtowerTowerFromMock(tower),
        clock,
        log,
        onChange: () => {},
        graceMs: 10,
      });
      await session.whenIdle();
      const joined = session.join({ joinCode: "000000", formFactor: "ipad" });
      await session.whenIdle();
      if (!joined.ok) throw new Error("join refused");
      const act = async (p: string, a: string, args: Record<string, unknown> = {}) => {
        session.act(joined.deviceId, p, a, args);
        await session.whenIdle();
      };
      return { session, act };
    };

    const first = await boot();
    const { act, session } = first;
    await act("base-board-done", "board-set-up");
    await act("play-without-tower", "play-without-tower");
    await act("continue-pick-story-test", "continue");
    await act("set-setting", "set", { settingId: "hints", optionId: "off" });
    await act("continue-game-settings", "continue");
    for (const heroId of HEROES) await act("hero-hold", "take", { heroId });
    await act("continue-claim-heroes", "continue");
    for (const step of session.state().setupSteps) {
      if (step.id === "starting-purse") await act(`spin-setup-${step.id}`, "spin");
      await act(`continue-setup-${step.id}`, "continue");
    }
    await act("continue-begin", "continue");
    for (const moment of OPENING_MOMENTS) await act(openingPromptId(moment), "continue");

    const play = session.state().play;
    if (!play) throw new Error("No play state.");
    const group = play.groups[0];
    if (!group) throw new Error("No group.");
    const hero = group.heroIds[0] ?? "";
    const target = play.content.board.spaces.find((space) => space.id !== group.spaceId);
    if (!target) throw new Error("No second space.");
    await act("gear", "open", { item: "game-board-setup" });
    await act("gear", "pick", { item: "fix-position", heroId: hero, pick: target.id });
    await act("gear", "done");
    expect(session.state().play?.groups[0]?.spaceId).toBe(target.id);

    // The crash: a second host on the same database, Continue.
    const second = await boot();
    const row = store.getAutosave();
    if (!row) throw new Error("No autosave to continue.");
    second.session.rememberAutosave({
      gameId: row.gameId,
      packId: row.packId,
      day: store.lastCheckpoint(row.gameId)?.day ?? 1,
    });
    expect(await second.session.resumeSession()).toBe(true);
    await second.act("continue-saved-game", "continue");
    // Continue seats the saved party on the iPads joined now (CU/16): pick the unheld heroes.
    for (const heroId of HEROES) {
      if (second.session.state().holdings[heroId] == null) {
        await second.act("hero-hold", "take", { heroId });
      }
    }
    for (let guard = 0; guard < 20 && second.session.state().screen === "piece-check"; guard += 1) {
      const open = second.session.state().offered.filter((o) => o.open);
      const next =
        open.find((o) => o.actionId === "turn-drums") ?? open.find((o) => o.actionId === "confirm");
      if (!next) break;
      await second.act(next.promptId, next.actionId);
    }
    expect(second.session.state().screen).toBe("play");
    expect(second.session.state().play?.groups[0]?.spaceId).toBe(target.id);
  });
  it("EV-21: Back still works after Continue when no trigger fired", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bloodtower-cu05-"));
    dirs.push(dir);
    const opened = openDatabase(join(dir, "session.sqlite"));
    closers.push(() => opened.close());
    const store = createEventStore(opened.db);
    const log = createHostLogger({ dataDir: dir, mirror: false });
    const clock = stepClock();
    createSessionStore(opened.db).saveRoster({
      sessionId: "session-1",
      packId: "test",
      packVersion: "0.1.0",
      startedWall: "2026-10-30T00:00:00.000Z",
      joinCode: "000000",
      devices: [],
      holdings: [],
    });
    let count = 0;
    const boot = async () => {
      count += 1;
      const tower = createMockTower({ log });
      const session = createCoreSession({
        sessionId: `session-${count}`,
        seed: "seed",
        stories: [TEST_STORY],
        playContent: PROVING_GROUNDS_PLAY,
        packVersion: "0.1.0",
        store,
        tower: bloodtowerTowerFromMock(tower),
        clock,
        log,
        onChange: () => {},
        graceMs: 10,
      });
      await session.whenIdle();
      const joined = session.join({ joinCode: "000000", formFactor: "ipad" });
      await session.whenIdle();
      if (!joined.ok) throw new Error("join refused");
      const act = async (p: string, a: string, args: Record<string, unknown> = {}) => {
        session.act(joined.deviceId, p, a, args);
        await session.whenIdle();
      };
      return { session, act };
    };

    const first = await boot();
    const { act, session } = first;
    await act("base-board-done", "board-set-up");
    await act("play-without-tower", "play-without-tower");
    await act("continue-pick-story-test", "continue");
    await act("set-setting", "set", { settingId: "hints", optionId: "off" });
    await act("continue-game-settings", "continue");
    for (const heroId of HEROES) await act("hero-hold", "take", { heroId });
    await act("continue-claim-heroes", "continue");
    for (const step of session.state().setupSteps) {
      if (step.id === "starting-purse") await act(`spin-setup-${step.id}`, "spin");
      await act(`continue-setup-${step.id}`, "continue");
    }
    await act("continue-begin", "continue");
    for (const moment of OPENING_MOMENTS) await act(openingPromptId(moment), "continue");

    const open = () =>
      session
        .projectDevice(session.state().devices.values().next().value as string)
        .actions.filter((action) => action.open);
    // Take the move roll, then tap a quiet neighbour.
    for (let guard = 0; guard < 5 && !open().some((o) => o.actionId === "walk"); guard += 1) {
      const next = open().find((o) => o.actionId === "continue");
      if (!next) break;
      await act(next.promptId, next.actionId);
    }
    const walk = open().find((o) => o.actionId === "walk");
    if (!walk) throw new Error("No walk offered.");
    const groupId = walk.promptId.split("--")[1];
    const spaceOf = () => session.state().play?.groups.find((g) => g.id === groupId)?.spaceId;
    const start = spaceOf();
    const seq = session.state().play?.rngSeq;
    await act(walk.promptId, walk.actionId);
    const tapped = spaceOf();
    expect(tapped).not.toBe(start);

    // The crash: a second host on the same database, Continue.
    const second = await boot();
    const row = store.getAutosave();
    if (!row) throw new Error("No autosave to continue.");
    second.session.rememberAutosave({
      gameId: row.gameId,
      packId: row.packId,
      day: store.lastCheckpoint(row.gameId)?.day ?? 1,
    });
    expect(await second.session.resumeSession()).toBe(true);
    await second.act("continue-saved-game", "continue");
    // Continue seats the saved party on the iPads joined now (CU/16): pick the unheld heroes.
    for (const heroId of HEROES) {
      if (second.session.state().holdings[heroId] == null) {
        await second.act("hero-hold", "take", { heroId });
      }
    }
    for (let guard = 0; guard < 20 && second.session.state().screen === "piece-check"; guard += 1) {
      const open = second.session.state().offered.filter((o) => o.open);
      const next =
        open.find((o) => o.actionId === "turn-drums") ?? open.find((o) => o.actionId === "confirm");
      if (!next) break;
      await second.act(next.promptId, next.actionId);
    }
    expect(second.session.state().screen).toBe("play");
    expect(second.session.state().play?.groups.find((g) => g.id === groupId)?.spaceId).toBe(tapped);
    const back = second.session
      .projectDevice(second.session.state().devices.values().next().value as string)
      .actions.find((o) => o.open && o.actionId === "back");
    expect(back).toBeDefined();
    expect(second.session.state().play?.rngSeq).toBe(seq);
    await second.act(back?.promptId ?? "", "back");
    expect(second.session.state().play?.rngSeq).toBe(seq);
    expect(second.session.state().play?.groups.find((g) => g.id === groupId)?.spaceId).toBe(start);
  });
});

// EV-23: the seeded stream position is the same before a tap, after Back and after a save and restore.
describe("EV-23 stream position across a checkpoint", () => {
  it("rngSeq survives a save and restore, and a tap with Back leaves it alone", async () => {
    const { initPlayState } = await import("../../engine/loops/chapter/playState.ts");
    const { initialShellState } = await import("../../engine/loops/session/state.ts");
    const { parseShellCheckpoint, shellCheckpointFromState } = await import("./shellCheckpoint.ts");
    const { handleGroupTurnPress, backPromptId } = await import(
      "../../engine/loops/group-turn/loop.ts"
    );
    const { bindShellState, clearShellState } = await import(
      "../../engine/loops/session/shellRef.ts"
    );
    const { neighborsOf } = await import("../../engine/loops/chapter/board.ts");
    const play = initPlayState("ev23", PROVING_GROUNDS_PLAY);
    const state = { ...initialShellState({ sessionId: "s", seed: "ev23" }), play };
    bindShellState(state);
    const group = play.groups[0];
    if (!group) throw new Error("No group.");
    const to = neighborsOf(play.content.board, group.spaceId)[0]?.id ?? "";
    const before = play.rngSeq;
    const local = {
      groupId: group.id,
      movesLeft: 2,
      awaitingPress: true,
      encounterPending: false,
      landedOnBuildingWithNoMoves: false,
      undo: [],
    };
    const tapped = handleGroupTurnPress(local, `walk--${group.id}--${to}`, "walk", () => false);
    handleGroupTurnPress(tapped, backPromptId(group.id), "back");
    clearShellState();
    expect(play.rngSeq).toBe(before);
    const restored = parseShellCheckpoint(
      JSON.parse(JSON.stringify(shellCheckpointFromState(state))) as unknown,
    );
    expect(restored.play?.rngSeq).toBe(before);
  });
});
