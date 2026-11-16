import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { configureDayClock, ensureClock, setBuildingSkulls } from "../../engine/loops/day/clock.ts";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { loggedPayloadSchema } from "../../protocols/hostLog.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger, type LogEntry } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { createCoreSession } from "./session.ts";

const dirs: string[] = [];
const closers: Array<() => void> = [];
afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const HEROES = ["hero-a", "hero-b", "hero-c", "hero-d"];

describe("CU/03 EV-15 a skull with nowhere to land is a logged error", () => {
  it("logs one error coded skull-no-building, in the shape the Story board toasts", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bloodtower-skull-"));
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
    const log = createHostLogger({ dataDir: dir, mirror: false });
    const entries: LogEntry[] = [];
    log.subscribe((entry) => entries.push(entry));
    const session = createCoreSession({
      sessionId: "session-1",
      seed: "seed",
      stories: [TEST_STORY],
      playContent: PROVING_GROUNDS_PLAY,
      packVersion: "0.1.0",
      store,
      tower: bloodtowerTowerFromMock(createMockTower({ log })),
      clock: stepClock(),
      log,
      onChange: () => {},
      graceMs: 10,
    });
    await session.whenIdle();
    const joined = session.join({ joinCode: "000000", formFactor: "ipad" });
    await session.whenIdle();
    if (!joined.ok) throw new Error("join refused");
    const act = async (promptId: string, actionId: string, args: Record<string, unknown> = {}) => {
      session.act(joined.deviceId, promptId, actionId, args);
      await session.whenIdle();
    };
    await act("base-board-done", "board-set-up");
    await act("play-without-tower", "play-without-tower");
    await act("continue-pick-story-test", "continue");
    await act("continue-game-settings", "continue");
    for (const heroId of HEROES) await act("hero-hold", "take", { heroId });
    await act("continue-claim-heroes", "continue");
    for (const step of session.state().setupSteps) {
      if (step.id === "starting-purse") await act(`spin-setup-${step.id}`, "spin");
      await act(`continue-setup-${step.id}`, "continue");
    }
    await act("continue-begin", "continue");
    for (const moment of OPENING_MOMENTS) await act(openingPromptId(moment), "continue");

    // Kingdom N is all fallen and the die always says N, so the drop finds nothing twice.
    const play = session.state().play;
    if (!play) throw new Error("No play state.");
    configureDayClock(play, {
      tuning: { skulls: { simulated_drop: { kingdom_die: "1d1" } } },
      supply: 24,
    });
    for (const space of play.content.board.spaces) {
      if (space.building && space.kingdom === "N") setBuildingSkulls(play, space.id, 4);
    }

    const errors = () => entries.filter((entry) => entry.code === "skull-no-building");
    for (let guard = 0; guard < 400 && errors().length === 0; guard += 1) {
      const pick = ["continue", "record", "done", "leave", "end-turn"]
        .map((id) => session.state().offered.find((offer) => offer.open && offer.actionId === id))
        .find((offer) => offer !== undefined);
      if (!pick) break;
      await act(pick.promptId, pick.actionId);
    }
    expect(errors()).toHaveLength(1);
    const entry = errors()[0] as LogEntry;
    expect(entry.level).toBe("error");
    expect(ensureClock(play).nightDrops).toEqual([]);
    // The host turns every error entry into this `logged` payload for the Story board toast.
    expect(
      loggedPayloadSchema.safeParse({
        code: entry.code,
        source: entry.source,
        message: entry.message,
      }).success,
    ).toBe(true);
  });
});
