import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { type BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { MIGRATIONS } from "./migrations.ts";
import * as schema from "./schema.ts";

export type Db = BetterSQLite3Database<typeof schema>;

export interface OpenDatabase {
  db: Db;
  close: () => void;
}

const migrate = (sqlite: Database.Database, path: string) => {
  const version = sqlite.pragma("user_version", { simple: true }) as number;
  if (version > MIGRATIONS.length) {
    throw new Error(
      `The database at ${path} has schema version ${version}; this build knows up to ${MIGRATIONS.length}.`,
    );
  }
  sqlite.transaction(() => {
    for (const statement of MIGRATIONS.slice(version)) sqlite.exec(statement);
    sqlite.pragma(`user_version = ${MIGRATIONS.length}`);
  })();
};

/** Opens (creating the file and its folder) and migrates. `:memory:` lasts until it is closed. */
export const openDatabase = (path: string): OpenDatabase => {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  try {
    sqlite.pragma("foreign_keys = ON");
    if (path !== ":memory:") sqlite.pragma("journal_mode = WAL");
    migrate(sqlite, path);
  } catch (error) {
    sqlite.close();
    throw error;
  }
  return { db: drizzle({ client: sqlite, schema }), close: () => sqlite.close() };
};
