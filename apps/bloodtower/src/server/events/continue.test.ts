import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { EngineEvent } from "../../engine/events.ts";
import { ENGINE_VERSION, initialEngineState, step } from "../../engine/index.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { checkpointStateFromEngine } from "./checkpoint.ts";
import { continueFromCheckpoint } from "./continue.ts";
import { createEventStore } from "./store.ts";

const dirs: string[] = [];
const tempDb = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-events-"));
  dirs.push(dir);
  return join(dir, "session.sqlite");
};

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const runLive = (events: EngineEvent[]) => {
  let state = initialEngineState();
  for (const event of events) {
    state = step(state, event).state;
  }
  return state;
};

const appendEngine = (
  store: ReturnType<typeof createEventStore>,
  gameId: string,
  events: EngineEvent[],
  meta: { seed: string; packVersion: string },
) => {
  let seq = 0;
  for (const event of events) {
    seq += 1;
    store.append({
      gameId,
      kind: "engine",
      payload: { v: 1, event },
      atMonoMs: seq * 10,
      atWall: `2026-10-23T12:00:${String(seq).padStart(2, "0")}.000Z`,
      deviceId: null,
      seed: meta.seed,
      packVersion: meta.packVersion,
      engineVersion: ENGINE_VERSION,
    });
  }
  return seq;
};

describe("continue from checkpoint", () => {
  it("replays later engine events to the same state as a live run", () => {
    const path = tempDb();
    const opened = openDatabase(path);
    try {
      const store = createEventStore(opened.db);
      const gameId = "game-replay";
      const meta = { seed: "replay-seed", packVersion: "0.2.0", engineVersion: ENGINE_VERSION };

      const engineEvents: EngineEvent[] = [{ kind: "start-test-loop", v: 1, seed: "game-x" }];
      for (let i = 0; i < 14; i++) {
        engineEvents.push({
          kind: "press",
          v: 1,
          deviceId: `device-${(i % 3) + 1}`,
          promptId: i % 2 === 0 ? "inner-advance" : "outer-advance",
          actionId: "continue",
        });
      }

      const live = runLive(engineEvents);
      const totalSeq = appendEngine(store, gameId, engineEvents, meta);
      const split = 7;
      const atCheckpoint = runLive(engineEvents.slice(0, split));
      store.writeCheckpoint({
        gameId,
        day: 1,
        afterEventSeq: split,
        stateJson: JSON.stringify(checkpointStateFromEngine(atCheckpoint)),
        atMonoMs: 1000,
        atWall: "2026-10-23T12:00:00.000Z",
        seed: meta.seed,
        packVersion: meta.packVersion,
        engineVersion: ENGINE_VERSION,
      });

      const resumed = continueFromCheckpoint(store, {
        gameId,
        engineVersion: ENGINE_VERSION,
        packVersion: meta.packVersion,
        meta,
        atMonoMs: 2000,
        atWall: "2026-10-23T12:01:00.000Z",
      }).state;

      expect(resumed).toEqual(live);
      expect(totalSeq).toBe(engineEvents.length);
    } finally {
      opened.close();
    }
  });

  it("logs version-changed when the engine version differs, then replays", () => {
    const path = tempDb();
    const opened = openDatabase(path);
    try {
      const store = createEventStore(opened.db);
      const gameId = "game-version";
      const meta = { seed: "v-seed", packVersion: "1.0.0", engineVersion: ENGINE_VERSION };
      const engineEvents: EngineEvent[] = [
        { kind: "start-test-loop", v: 1, seed: "only" },
        {
          kind: "press",
          v: 1,
          deviceId: "d1",
          promptId: "inner-advance",
          actionId: "continue",
        },
      ];
      appendEngine(store, gameId, engineEvents, meta);
      const checkpointState = runLive(engineEvents.slice(0, 1));
      store.writeCheckpoint({
        gameId,
        day: 1,
        afterEventSeq: 1,
        stateJson: JSON.stringify(checkpointStateFromEngine(checkpointState)),
        atMonoMs: 50,
        atWall: "2026-10-23T12:00:00.000Z",
        seed: meta.seed,
        packVersion: meta.packVersion,
        engineVersion: "0.0.0-old",
      });

      const result = continueFromCheckpoint(store, {
        gameId,
        engineVersion: ENGINE_VERSION,
        packVersion: meta.packVersion,
        meta,
        atMonoMs: 60,
        atWall: "2026-10-23T12:00:01.000Z",
      });

      expect(result.versionChangedLogged).toBe(true);
      const rows = store.listEvents(gameId, 0);
      const versionRow = rows.find((row) => row.kind === "version-changed");
      expect(versionRow).toBeDefined();
      expect(result.state).toEqual(runLive(engineEvents));
    } finally {
      opened.close();
    }
  });

  it("keeps one autosave row and replaces it for a new game", () => {
    const path = tempDb();
    const opened = openDatabase(path);
    try {
      const sessionStore = createSessionStore(opened.db);
      sessionStore.saveRoster({
        sessionId: "sess-a",
        packId: "test",
        packVersion: "0.1.0",
        startedWall: "2026-10-23T12:00:00.000Z",
        joinCode: "048213",
        devices: [],
        holdings: [],
      });
      sessionStore.saveRoster({
        sessionId: "sess-b",
        packId: "test",
        packVersion: "0.1.0",
        startedWall: "2026-10-23T12:01:00.000Z",
        joinCode: "048214",
        devices: [],
        holdings: [],
      });
      const store = createEventStore(opened.db);
      store.setAutosave({ gameId: "game-a", sessionId: "sess-a", packId: "test" });
      expect(store.getAutosave()?.gameId).toBe("game-a");
      store.replaceAutosave({ gameId: "game-b", sessionId: "sess-b", packId: "test" });
      expect(store.getAutosave()?.gameId).toBe("game-b");
      expect(store.getAutosave()?.sessionId).toBe("sess-b");
    } finally {
      opened.close();
    }
  });
});
