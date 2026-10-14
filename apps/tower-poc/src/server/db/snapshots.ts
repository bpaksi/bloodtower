// Keeps the state store's latest snapshot in the database, for the restore prompt (D11).
import { eq } from "drizzle-orm";
import { stateSnapshotSchema } from "tower-poc-protocols";
import type { SnapshotStorage } from "../stateStore.ts";
import type { Db } from "./client.ts";
import { stateSnapshots } from "./schema.ts";

const ROW = 1;

export const createSnapshotStorage = (
  db: Db,
  /** Called when the saved row cannot be read; it is then treated as missing. */
  onUnreadable: (reason: string) => void = (reason) =>
    console.warn(`Ignoring the saved state snapshot: ${reason}`),
): SnapshotStorage => ({
  load: () => {
    const row = db.select().from(stateSnapshots).where(eq(stateSnapshots.id, ROW)).get();
    if (!row) return undefined;
    let json: unknown;
    try {
      json = JSON.parse(row.snapshot);
    } catch {
      onUnreadable("it is not valid JSON.");
      return undefined;
    }
    const snapshot = stateSnapshotSchema.safeParse(json);
    if (!snapshot.success || !Number.isSafeInteger(row.savedAt) || row.savedAt < 0) {
      onUnreadable("it does not match the state protocol.");
      return undefined;
    }
    return { savedAt: row.savedAt, snapshot: snapshot.data };
  },
  save: ({ savedAt, snapshot }) => {
    if (Object.keys(snapshot).length === 0) {
      db.delete(stateSnapshots).where(eq(stateSnapshots.id, ROW)).run();
      return;
    }
    const values = { savedAt, snapshot: JSON.stringify(snapshot) };
    db.insert(stateSnapshots)
      .values({ id: ROW, ...values })
      .onConflictDoUpdate({ target: stateSnapshots.id, set: values })
      .run();
  },
});
