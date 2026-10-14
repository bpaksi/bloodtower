// Keeps the service's own record in the database (spec D24): the broken seals and the skull count.
// Unlike the snapshot, it is loaded when the service starts, with no prompt.
import { eq } from "drizzle-orm";
import type { RecordStorage } from "../stateStore.ts";
import type { Db } from "./client.ts";
import { appRecords } from "./schema.ts";

export const createRecordStorage = (db: Db): RecordStorage => ({
  load: (key) => {
    const row = db.select().from(appRecords).where(eq(appRecords.key, key)).get();
    if (!row) return undefined;
    let value: unknown;
    try {
      value = JSON.parse(row.value);
    } catch {
      return { unreadable: "it is not valid JSON." };
    }
    if (!Number.isSafeInteger(row.updatedAt) || row.updatedAt < 0) {
      return { unreadable: "its time is not valid." };
    }
    return { value, updatedAt: row.updatedAt };
  },
  save: (key, value, updatedAt) => {
    const values = { value: JSON.stringify(value), updatedAt };
    db.insert(appRecords)
      .values({ key, ...values })
      .onConflictDoUpdate({ target: appRecords.key, set: values })
      .run();
  },
});
