// The database's schema, one step per entry, applied in order. SQLite's `user_version` records
// how many have run. Never edit or reorder an entry that has shipped: add a new one.
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE state_snapshots (
    id INTEGER PRIMARY KEY,
    saved_at INTEGER NOT NULL,
    snapshot TEXT NOT NULL
  )`,
];
