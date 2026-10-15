import {
  type ControlAction,
  type ControlPress,
  controlPressSchema,
  type PauseCause,
  type TimingKind,
  type TimingMark,
  timingMarkSchema,
} from "bloodtower-protocols";
import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "./client.ts";
import { controlPresses, devices, holdings, sessions, timingMarks } from "./schema.ts";

export interface RosterDevice {
  deviceId: string;
  formFactor: "ipad" | "phone";
  token: string;
  connected: boolean;
}

export interface RosterHolding {
  deviceId: string;
  hunter: string;
}

/** The session row plus who is here and what they hold. Replaced as a set, not patched. */
export interface RosterSnapshot {
  sessionId: string;
  packId: string;
  packVersion: string;
  startedWall: string;
  joinCode: string;
  devices: readonly RosterDevice[];
  holdings: readonly RosterHolding[];
}

export interface StoredRun {
  session: {
    id: string;
    packId: string;
    packVersion: string;
    startedWall: string;
    joinCode: string;
  };
  devices: RosterDevice[];
  holdings: RosterHolding[];
  presses: ControlPress[];
  marks: TimingMark[];
}

const markFromRow = (row: typeof timingMarks.$inferSelect): TimingMark =>
  timingMarkSchema.parse({
    sessionId: row.sessionId,
    kind: row.kind,
    subject: row.subject,
    startMonoMs: row.startMonoMs,
    endMonoMs: row.endMonoMs,
    startWall: row.startWall,
    endWall: row.endWall,
    deviceId: row.deviceId,
    cause: row.cause,
    hunter: row.hunter,
    result: row.result,
  });

const pressFromRow = (row: typeof controlPresses.$inferSelect): ControlPress =>
  controlPressSchema.parse({
    promptId: row.promptId,
    action: row.action,
    deviceId: row.deviceId,
    atMonoMs: row.atMonoMs,
    atWall: row.atWall,
    winner: row.winner,
  });

export interface SessionStore {
  saveRoster: (snapshot: RosterSnapshot) => void;
  insertPress: (sessionId: string, press: ControlPress) => void;
  insertMark: (mark: TimingMark) => number;
  closeMark: (
    id: number,
    end: { endMonoMs: number; endWall: string; result: TimingMark["result"] },
  ) => void;
  listMarks: (sessionId: string) => TimingMark[];
  loadRun: (sessionId: string) => StoredRun;
}

/** SQLite backing for the session, its presses and its timing rows. */
export const createSessionStore = (db: Db): SessionStore => ({
  saveRoster: (snapshot) => {
    db.transaction((tx) => {
      tx.insert(sessions)
        .values({
          id: snapshot.sessionId,
          packId: snapshot.packId,
          packVersion: snapshot.packVersion,
          startedWall: snapshot.startedWall,
          joinCode: snapshot.joinCode,
        })
        .onConflictDoNothing()
        .run();
      tx.delete(holdings).where(eq(holdings.sessionId, snapshot.sessionId)).run();
      tx.delete(devices).where(eq(devices.sessionId, snapshot.sessionId)).run();
      if (snapshot.devices.length > 0) {
        tx.insert(devices)
          .values(
            snapshot.devices.map((device) => ({
              sessionId: snapshot.sessionId,
              deviceId: device.deviceId,
              formFactor: device.formFactor,
              token: device.token,
              connected: device.connected,
            })),
          )
          .run();
      }
      if (snapshot.holdings.length > 0) {
        tx.insert(holdings)
          .values(
            snapshot.holdings.map((holding) => ({
              sessionId: snapshot.sessionId,
              deviceId: holding.deviceId,
              hunter: holding.hunter,
            })),
          )
          .run();
      }
    });
  },

  insertPress: (sessionId, press) => {
    const parsed = controlPressSchema.parse(press);
    db.insert(controlPresses)
      .values({
        sessionId,
        promptId: parsed.promptId,
        action: parsed.action,
        deviceId: parsed.deviceId,
        atMonoMs: parsed.atMonoMs,
        atWall: parsed.atWall,
        winner: parsed.winner,
      })
      .run();
  },

  insertMark: (mark) => {
    const parsed = timingMarkSchema.parse(mark);
    const row = db
      .insert(timingMarks)
      .values({
        sessionId: parsed.sessionId,
        kind: parsed.kind,
        subject: parsed.subject,
        startMonoMs: parsed.startMonoMs,
        endMonoMs: parsed.endMonoMs,
        startWall: parsed.startWall,
        endWall: parsed.endWall,
        deviceId: parsed.deviceId,
        cause: parsed.cause,
        hunter: parsed.hunter,
        result: parsed.result,
      })
      .returning({ id: timingMarks.id })
      .get();
    if (!row) throw new Error("The timing mark was not stored.");
    return row.id;
  },

  closeMark: (id, end) => {
    const updated = db
      .update(timingMarks)
      .set({ endMonoMs: end.endMonoMs, endWall: end.endWall, result: end.result })
      .where(and(eq(timingMarks.id, id), isNull(timingMarks.endMonoMs)))
      .returning({ id: timingMarks.id })
      .get();
    if (!updated) throw new Error(`Timing mark ${id} is not an open row.`);
  },

  listMarks: (sessionId) =>
    db
      .select()
      .from(timingMarks)
      .where(eq(timingMarks.sessionId, sessionId))
      .all()
      .map(markFromRow),

  loadRun: (sessionId) => {
    const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
    if (!session) throw new Error(`No session ${sessionId}.`);
    const deviceRows = db.select().from(devices).where(eq(devices.sessionId, sessionId)).all();
    const holdingRows = db.select().from(holdings).where(eq(holdings.sessionId, sessionId)).all();
    const pressRows = db
      .select()
      .from(controlPresses)
      .where(eq(controlPresses.sessionId, sessionId))
      .all();
    return {
      session: {
        id: session.id,
        packId: session.packId,
        packVersion: session.packVersion,
        startedWall: session.startedWall,
        joinCode: session.joinCode,
      },
      devices: deviceRows.map((device) => {
        if (device.formFactor !== "ipad" && device.formFactor !== "phone") {
          throw new Error(`Device ${device.deviceId} has form factor ${device.formFactor}.`);
        }
        return {
          deviceId: device.deviceId,
          formFactor: device.formFactor,
          token: device.token,
          connected: device.connected,
        };
      }),
      holdings: holdingRows.map((holding) => ({
        deviceId: holding.deviceId,
        hunter: holding.hunter,
      })),
      presses: pressRows.map(pressFromRow),
      marks: db
        .select()
        .from(timingMarks)
        .where(eq(timingMarks.sessionId, sessionId))
        .all()
        .map(markFromRow),
    };
  },
});

export type { ControlAction, PauseCause, TimingKind };
