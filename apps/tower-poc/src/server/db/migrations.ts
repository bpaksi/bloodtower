// The database's schema, one step per entry, applied in order. SQLite's `user_version` records
// how many have run. Never edit or reorder an entry that has shipped: add a new one.
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE state_snapshots (
    id INTEGER PRIMARY KEY,
    saved_at INTEGER NOT NULL,
    snapshot TEXT NOT NULL
  )`,
  // The service's own record, apart from the snapshot (spec D24): one row per value.
  `CREATE TABLE app_records (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  // Verify mode's results (spec D14, M3 step 3.6): one row per result recorded, never changed.
  `CREATE TABLE verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    capability_id TEXT NOT NULL,
    result TEXT NOT NULL,
    notes TEXT NOT NULL,
    diagnostic_session_id TEXT,
    library_version TEXT NOT NULL,
    app_version TEXT NOT NULL,
    tested_at INTEGER NOT NULL,
    environment TEXT NOT NULL
  )`,
];
