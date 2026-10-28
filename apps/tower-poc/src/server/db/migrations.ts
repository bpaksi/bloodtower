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
  // The old sound feel record (M6 step 6.1). Nothing reads or writes it now: the review moved to
  // apps/sound-review-tool, which carried its rows over. Kept so the migration list stays as run.
  `CREATE TABLE sound_feel (
    sound_index INTEGER PRIMARY KEY,
    mood TEXT,
    reads_as TEXT,
    strength TEXT,
    length_ms INTEGER,
    answer_length_ms INTEGER,
    note TEXT,
    updated_at INTEGER NOT NULL,
    client TEXT NOT NULL
  )`,
];
