// Drizzle's view of the R1 tables. `migrations.ts` creates them. A column that differs
// between the two fails the round-trip tests.
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** One run. `pack_version` is the version the run started on (R-ENG-11). */
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  packId: text("pack_id").notNull(),
  packVersion: text("pack_version").notNull(),
  startedWall: text("started_wall").notNull(),
  joinCode: text("join_code").notNull(),
});

/** A joined iPad or phone. The story board is not a row here. */
export const devices = sqliteTable("devices", {
  sessionId: text("session_id").notNull(),
  deviceId: text("device_id").notNull(),
  formFactor: text("form_factor").notNull(),
  token: text("token").notNull(),
  connected: integer("connected", { mode: "boolean" }).notNull(),
});

/** One device holding one hunter. A device may hold several. */
export const holdings = sqliteTable("holdings", {
  sessionId: text("session_id").notNull(),
  deviceId: text("device_id").notNull(),
  hunter: text("hunter").notNull(),
});

/** Every press, winning and losing. Append-only. */
export const controlPresses = sqliteTable("control_presses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  promptId: text("prompt_id").notNull(),
  action: text("action").notNull(),
  deviceId: text("device_id").notNull(),
  atMonoMs: real("at_mono_ms").notNull(),
  atWall: text("at_wall").notNull(),
  winner: integer("winner", { mode: "boolean" }).notNull(),
});

/**
 * PRD-41 timing rows. An open row has null ends. Null stays null: it is never stored as zero.
 * Closing a row sets the two end columns and, for a battle screen, the result.
 */
export const timingMarks = sqliteTable("timing_marks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  kind: text("kind").notNull(),
  subject: text("subject").notNull(),
  startMonoMs: real("start_mono_ms").notNull(),
  endMonoMs: real("end_mono_ms"),
  startWall: text("start_wall").notNull(),
  endWall: text("end_wall"),
  deviceId: text("device_id"),
  cause: text("cause"),
  hunter: text("hunter"),
  result: text("result"),
});
