import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initialShellState } from "../../engine/loops/session/state.ts";
import { TOWER_READY } from "../../engine/loops/session/tower.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { runShellEffects } from "./effects.ts";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-goodbye-"));
  dirs.push(dir);
  return dir;
};

const harness = () => {
  const dir = tempDir();
  const opened = openDatabase(join(dir, "session.sqlite"));
  const store = createEventStore(opened.db);
  const tower = createMockTower();
  const log = createHostLogger({ dataDir: dir, mirror: false });
  const clock = stepClock();
  const state = initialShellState({ sessionId: "sess", seed: "seed", stories: [] });
  state.screen = "goodbye";
  state.sessionEnded = true;
  state.towerLinked = true;
  state.tower = TOWER_READY;
  state.activeGameId = "game-quit";
  const ctx = {
    store,
    tower: bloodtowerTowerFromMock(tower),
    log,
    sessionId: "sess",
    clock,
    meta: { seed: "seed", packVersion: "pack", engineVersion: "engine" },
    onViewRefresh: () => {},
  };
  return { dir, opened, store, tower, log, state, ctx };
};

const errorLines = (dir: string) => {
  const logDir = join(dir, "logs");
  let names: string[] = [];
  try {
    names = readdirSync(logDir);
  } catch {
    return [];
  }
  return names.flatMap((name) =>
    readFileSync(join(logDir, name), "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as { level: string; code: string }),
  );
};

describe("goodbye idle", () => {
  it("sends lighting.all-off once and records one quit", async () => {
    const { dir, opened, store, tower, state, ctx } = harness();
    try {
      tower.connect();
      await runShellEffects(
        state,
        [
          { kind: "game-record", v: 1, gameId: "game-quit", outcome: "quit" },
          {
            kind: "tower-command",
            v: 1,
            capabilityId: "lighting.all-off",
            params: {},
          },
        ],
        ctx,
      );
      expect(state.goodbyeTower).toBe("idle");
      expect(tower.sent().filter((item) => item.type === "idle")).toEqual([{ type: "idle" }]);
      expect(tower.idleAttempts()).toBe(1);
      await runShellEffects(
        state,
        [{ kind: "game-record", v: 1, gameId: "game-quit", outcome: "quit" }],
        ctx,
      );
      await runShellEffects(
        state,
        [
          { kind: "game-record", v: 1, gameId: "game-quit", outcome: "quit" },
          {
            kind: "tower-command",
            v: 1,
            capabilityId: "lighting.all-off",
            params: {},
          },
        ],
        { ...ctx, replaying: true },
      );
      const records = store.listEvents("game-quit").filter((row) => row.kind === "game-record");
      expect(records).toHaveLength(1);
      expect(tower.sent().filter((item) => item.type === "idle")).toHaveLength(1);
      expect(errorLines(dir).filter((line) => line.code === "tower-command-failed")).toHaveLength(
        0,
      );
    } finally {
      opened.close();
    }
  });

  it("logs one tower-command-failed and stays ended when idle is refused", async () => {
    const { dir, opened, tower, state, ctx } = harness();
    try {
      tower.connect();
      tower.failNextIdle();
      await runShellEffects(
        state,
        [
          {
            kind: "tower-command",
            v: 1,
            capabilityId: "lighting.all-off",
            params: {},
          },
        ],
        ctx,
      );
      expect(state.goodbyeTower).toBe("unavailable");
      expect(state.sessionEnded).toBe(true);
      expect(state.screen).toBe("goodbye");
      expect(tower.sent().filter((item) => item.type === "idle")).toHaveLength(1);
      expect(tower.idleAttempts()).toBe(1);
      const failures = errorLines(dir).filter(
        (line) => line.level === "error" && line.code === "tower-command-failed",
      );
      expect(failures).toHaveLength(1);
    } finally {
      opened.close();
    }
  });

  it("clears the autosave row on new game", async () => {
    const { opened, store, state, ctx } = harness();
    try {
      createSessionStore(opened.db).saveRoster({
        sessionId: "sess",
        packId: "test",
        packVersion: "pack",
        startedWall: "2026-10-25T18:00:00.000Z",
        joinCode: "048213",
        devices: [],
        holdings: [],
      });
      store.replaceAutosave({ gameId: "game-quit", sessionId: "sess", packId: "test" });
      expect(store.getAutosave()?.gameId).toBe("game-quit");
      await runShellEffects(state, [{ kind: "autosave-clear", v: 1 }], ctx);
      expect(store.getAutosave()).toBeNull();
      expect(state.screen).toBe("goodbye");
    } finally {
      opened.close();
    }
  });
});
