import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { type LoggedEvent, loggedEventSchema } from "burgomaster-funeral-poc-protocols";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.ts";

const MIGRATION = `
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL
);
`;

export type EventDb = ReturnType<typeof drizzle<typeof schema>>;

export interface OpenLog {
  db: EventDb;
  close: () => void;
}

/** Opens the SQLite log, creating the file and the events table when needed. `:memory:` is allowed. */
export const openLog = (path: string): OpenLog => {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  try {
    sqlite.pragma("journal_mode = WAL");
    const version = sqlite.pragma("user_version", { simple: true }) as number;
    if (version > 1) {
      throw new Error(`The database at ${path} has schema version ${version}; this host knows 1.`);
    }
    if (version < 1) {
      sqlite.exec(MIGRATION);
      sqlite.pragma("user_version = 1");
    }
  } catch (error) {
    sqlite.close();
    throw error;
  }
  return { db: drizzle({ client: sqlite, schema }), close: () => sqlite.close() };
};

/** Checks the event against the contract, then appends it. Nothing here updates or deletes a row. */
export const appendEvent = (db: EventDb, event: LoggedEvent): LoggedEvent => {
  const parsed = loggedEventSchema.parse(event);
  db.insert(schema.events)
    .values({
      id: parsed.id,
      at: parsed.at,
      type: parsed.type,
      payload: JSON.stringify(parsed.payload),
    })
    .run();
  return parsed;
};

/** Reads the log in insertion order and checks each row still matches the contract. */
export const readEvents = (db: EventDb): LoggedEvent[] => {
  const rows = db.select().from(schema.events).all();
  return rows.map((row) =>
    loggedEventSchema.parse({
      id: row.id,
      at: row.at,
      type: row.type,
      payload: JSON.parse(row.payload),
    }),
  );
};
