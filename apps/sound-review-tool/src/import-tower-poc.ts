// Writes src/seed.json from tower-poc's old sound reviews (its `sound_feel` table), so the tool
// starts with them. Reads the database only. Run with `pnpm import-tower-poc [path/to/db]`.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { carryOver, type OldFeelRow } from "./model.ts";

const here = import.meta.dirname;
const dbPath = process.argv[2] ?? join(here, "..", "..", "tower-poc", "data", "tower-poc.db");

const db = new DatabaseSync(dbPath, { readOnly: true });
try {
  const rows = db
    .prepare(
      'SELECT sound_index AS "index", mood, reads_as AS readsAs, length_ms AS lengthMs, note, updated_at AS updatedAt FROM sound_feel ORDER BY "index"',
    )
    .all() as unknown as OldFeelRow[];
  const draft = carryOver(rows);
  await writeFile(join(here, "seed.json"), `${JSON.stringify(draft, null, 2)}\n`);
  console.log(
    `Carried over ${Object.keys(draft.sounds).length} of ${rows.length} reviews from ${dbPath}.`,
  );
} finally {
  db.close();
}
