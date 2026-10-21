// Keeps the sound feel record in the database (spec D25): one row per sound, replaced on each save.
import { asc } from "drizzle-orm";
import { type SoundFeelRow, soundFeelRowSchema } from "tower-poc-protocols";
import type { SoundFeelStorage } from "../soundFeel.ts";
import type { Db } from "./client.ts";
import { soundFeel } from "./schema.ts";

export const createSoundFeelStorage = (db: Db): SoundFeelStorage => ({
  put: (row) => {
    db.insert(soundFeel)
      .values(row)
      .onConflictDoUpdate({ target: soundFeel.index, set: row })
      .run();
  },
  all: () => {
    const rows: SoundFeelRow[] = [];
    let unusable = 0;
    for (const row of db.select().from(soundFeel).orderBy(asc(soundFeel.index)).all()) {
      const parsed = soundFeelRowSchema.safeParse(row);
      if (parsed.success) rows.push(parsed.data);
      else unusable += 1;
    }
    return { rows, unusable };
  },
});
