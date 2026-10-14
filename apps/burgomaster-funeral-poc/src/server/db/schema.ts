import { sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Append-only event log. The payload is the JSON of one logged event. */
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  at: text("at").notNull(),
  type: text("type").notNull(),
  payload: text("payload").notNull(),
});
