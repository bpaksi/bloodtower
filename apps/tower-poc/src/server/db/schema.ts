// Drizzle's view of the tables. The tables themselves are created by `migrations.ts`; the
// snapshot tests run every query through this schema against a migrated database, so a column
// that differs between the two fails there.
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** The latest state snapshot, for the restore prompt (D11). One row at most, with id 1. */
export const stateSnapshots = sqliteTable("state_snapshots", {
  id: integer("id").primaryKey(),
  /** Milliseconds since the epoch. */
  savedAt: integer("saved_at").notNull(),
  /** The snapshot as JSON: values keyed by inventory id. */
  snapshot: text("snapshot").notNull(),
});

/**
 * The service's own record (spec D24): the broken seals and the skull count, one row per value,
 * keyed by inventory id. Loaded at start with no prompt.
 */
export const appRecords = sqliteTable("app_records", {
  key: text("key").primaryKey(),
  /** The value as JSON. */
  value: text("value").notNull(),
  /** Milliseconds since the epoch. */
  updatedAt: integer("updated_at").notNull(),
});

/**
 * Verify mode's results (spec D14): one row per result a person recorded, oldest first. Rows are
 * only added; the newest per capability is the one shown.
 */
export const verifications = sqliteTable("verifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  capabilityId: text("capability_id").notNull(),
  /** pass, partial or fail. */
  result: text("result").notNull(),
  notes: text("notes").notNull(),
  /** Null until saved diagnostics sessions exist (M4). */
  diagnosticSessionId: text("diagnostic_session_id"),
  libraryVersion: text("library_version").notNull(),
  appVersion: text("app_version").notNull(),
  /** Milliseconds since the epoch. */
  testedAt: integer("tested_at").notNull(),
  /** `{tower, client}` as JSON. */
  environment: text("environment").notNull(),
});
