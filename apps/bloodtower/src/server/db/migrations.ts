// Schema steps, applied in order. SQLite's `user_version` is how many have run.
// Never edit a step that has shipped: add a new one.
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    pack_id TEXT NOT NULL,
    pack_version TEXT NOT NULL,
    started_wall TEXT NOT NULL,
    join_code TEXT NOT NULL
  )`,
  `CREATE TABLE devices (
    session_id TEXT NOT NULL REFERENCES sessions(id),
    device_id TEXT NOT NULL,
    form_factor TEXT NOT NULL,
    token TEXT NOT NULL,
    connected INTEGER NOT NULL,
    PRIMARY KEY (session_id, device_id)
  )`,
  `CREATE TABLE holdings (
    session_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    hunter TEXT NOT NULL,
    PRIMARY KEY (session_id, device_id, hunter),
    FOREIGN KEY (session_id, device_id) REFERENCES devices(session_id, device_id)
  )`,
  `CREATE TABLE control_presses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    prompt_id TEXT NOT NULL,
    action TEXT NOT NULL,
    device_id TEXT NOT NULL,
    at_mono_ms REAL NOT NULL,
    at_wall TEXT NOT NULL,
    winner INTEGER NOT NULL
  )`,
  `CREATE TABLE timing_marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    kind TEXT NOT NULL,
    subject TEXT NOT NULL,
    start_mono_ms REAL NOT NULL,
    end_mono_ms REAL,
    start_wall TEXT NOT NULL,
    end_wall TEXT,
    device_id TEXT,
    cause TEXT,
    hunter TEXT,
    result TEXT
  )`,
];
