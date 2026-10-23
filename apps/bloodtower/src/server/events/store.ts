import { and, desc, eq, gt } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { autosave, checkpoints, events } from "../db/schema.ts";
import type { HostEventKind } from "./kinds.ts";

export const AUTOSAVE_ROW_ID = 1;

export type GameMeta = {
  seed: string;
  packVersion: string;
  engineVersion: string;
};

export type AppendEventInput = GameMeta & {
  gameId: string;
  kind: HostEventKind;
  payload: Record<string, unknown>;
  atMonoMs: number;
  atWall: string;
  deviceId: string | null;
};

export type CheckpointInput = GameMeta & {
  gameId: string;
  day: number;
  afterEventSeq: number;
  stateJson: string;
  atMonoMs: number;
  atWall: string;
};

export type AutosaveRow = {
  gameId: string;
  sessionId: string;
  packId: string;
};

export type StoredHostEvent = {
  gameId: string;
  seq: number;
  kind: HostEventKind;
  payload: string;
  atMonoMs: number;
  atWall: string;
  deviceId: string | null;
  seed: string;
  packVersion: string;
  engineVersion: string;
};

export type StoredCheckpoint = {
  id: number;
  gameId: string;
  day: number;
  afterEventSeq: number;
  stateJson: string;
  atMonoMs: number;
  atWall: string;
  seed: string;
  packVersion: string;
  engineVersion: string;
};

export interface EventStore {
  nextSeq: (gameId: string) => number;
  append: (input: AppendEventInput) => StoredHostEvent;
  listEvents: (gameId: string, afterSeq?: number) => StoredHostEvent[];
  writeCheckpoint: (input: CheckpointInput) => StoredCheckpoint;
  lastCheckpoint: (gameId: string) => StoredCheckpoint | null;
  getAutosave: () => AutosaveRow | null;
  setAutosave: (row: AutosaveRow) => void;
  replaceAutosave: (row: AutosaveRow) => void;
  autosaveForSession: (sessionId: string) => AutosaveRow | null;
  hasEvents: (gameId: string) => boolean;
}

const rowFromSelect = (row: typeof events.$inferSelect): StoredHostEvent => ({
  gameId: row.gameId,
  seq: row.seq,
  kind: row.kind as HostEventKind,
  payload: row.payload,
  atMonoMs: row.atMonoMs,
  atWall: row.atWall,
  deviceId: row.deviceId,
  seed: row.seed,
  packVersion: row.packVersion,
  engineVersion: row.engineVersion,
});

const checkpointFromSelect = (row: typeof checkpoints.$inferSelect): StoredCheckpoint => ({
  id: row.id,
  gameId: row.gameId,
  day: row.day,
  afterEventSeq: row.afterEventSeq,
  stateJson: row.stateJson,
  atMonoMs: row.atMonoMs,
  atWall: row.atWall,
  seed: row.seed,
  packVersion: row.packVersion,
  engineVersion: row.engineVersion,
});

/** Append-only game log and checkpoint writer (D37). */
export const createEventStore = (db: Db): EventStore => {
  const nextSeq = (gameId: string): number => {
    const last = db
      .select({ seq: events.seq })
      .from(events)
      .where(eq(events.gameId, gameId))
      .orderBy(desc(events.seq))
      .limit(1)
      .get();
    return (last?.seq ?? 0) + 1;
  };

  return {
    nextSeq,

    append: (input) => {
      const seq = nextSeq(input.gameId);
      const inserted = db
        .insert(events)
        .values({
          gameId: input.gameId,
          seq,
          kind: input.kind,
          payload: JSON.stringify(input.payload),
          atMonoMs: input.atMonoMs,
          atWall: input.atWall,
          deviceId: input.deviceId,
          seed: input.seed,
          packVersion: input.packVersion,
          engineVersion: input.engineVersion,
        })
        .returning()
        .get();
      if (!inserted) throw new Error("The event was not stored.");
      return rowFromSelect(inserted);
    },

    listEvents: (gameId, afterSeq = 0) =>
      db
        .select()
        .from(events)
        .where(and(eq(events.gameId, gameId), gt(events.seq, afterSeq)))
        .orderBy(events.seq)
        .all()
        .map(rowFromSelect),

    writeCheckpoint: (input) => {
      const row = db
        .insert(checkpoints)
        .values({
          gameId: input.gameId,
          day: input.day,
          afterEventSeq: input.afterEventSeq,
          stateJson: input.stateJson,
          atMonoMs: input.atMonoMs,
          atWall: input.atWall,
          seed: input.seed,
          packVersion: input.packVersion,
          engineVersion: input.engineVersion,
        })
        .returning()
        .get();
      if (!row) throw new Error("The checkpoint was not stored.");
      return checkpointFromSelect(row);
    },

    lastCheckpoint: (gameId) => {
      const row = db
        .select()
        .from(checkpoints)
        .where(eq(checkpoints.gameId, gameId))
        .orderBy(desc(checkpoints.day), desc(checkpoints.id))
        .limit(1)
        .get();
      return row ? checkpointFromSelect(row) : null;
    },

    getAutosave: () => {
      const row = db.select().from(autosave).where(eq(autosave.id, AUTOSAVE_ROW_ID)).get();
      if (!row) return null;
      return { gameId: row.gameId, sessionId: row.sessionId, packId: row.packId };
    },

    setAutosave: (row) => {
      db.insert(autosave)
        .values({
          id: AUTOSAVE_ROW_ID,
          gameId: row.gameId,
          sessionId: row.sessionId,
          packId: row.packId,
        })
        .onConflictDoNothing()
        .run();
    },

    replaceAutosave: (row) => {
      db.insert(autosave)
        .values({
          id: AUTOSAVE_ROW_ID,
          gameId: row.gameId,
          sessionId: row.sessionId,
          packId: row.packId,
        })
        .onConflictDoUpdate({
          target: autosave.id,
          set: {
            gameId: row.gameId,
            sessionId: row.sessionId,
            packId: row.packId,
          },
        })
        .run();
    },

    autosaveForSession: (sessionId) => {
      const row = db.select().from(autosave).where(eq(autosave.sessionId, sessionId)).get();
      if (!row) return null;
      return { gameId: row.gameId, sessionId: row.sessionId, packId: row.packId };
    },

    hasEvents: (gameId) => {
      const row = db
        .select({ seq: events.seq })
        .from(events)
        .where(eq(events.gameId, gameId))
        .limit(1)
        .get();
      return row !== undefined;
    },
  };
};
