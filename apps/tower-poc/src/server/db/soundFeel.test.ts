import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSoundFeel } from "../soundFeel.ts";
import { openDatabase } from "./client.ts";
import { soundFeel as soundFeelTable } from "./schema.ts";
import { createSoundFeelStorage } from "./soundFeel.ts";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "tower-poc-sound-feel-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("sound feel storage (spec D25)", () => {
  it("has nothing saved in a new database", () => {
    const { db, close } = openDatabase(":memory:");
    expect(createSoundFeel({ storage: createSoundFeelStorage(db) }).rows()).toEqual([]);
    close();
  });

  it("keeps a sound's feel across a restart, one row per sound with the newest picks", () => {
    const path = join(dir, "tower.db");
    const first = openDatabase(path);
    const feel = createSoundFeel({ storage: createSoundFeelStorage(first.db), now: () => 100 });
    feel.record({ index: 12, mood: "wonder", lengthMs: 900 }, "iPad");
    feel.record({ index: 12, readsAs: "magic", lengthMs: 950, answerLengthMs: 890 }, "Mac");
    feel.record({ index: 3, note: "a voice" }, "iPad");
    first.close();

    const second = openDatabase(path);
    const reloaded = createSoundFeel({ storage: createSoundFeelStorage(second.db) });
    expect(reloaded.rows()).toEqual([
      {
        index: 3,
        mood: null,
        readsAs: null,
        strength: null,
        lengthMs: null,
        answerLengthMs: null,
        note: "a voice",
        updatedAt: 100,
        client: "iPad",
      },
      {
        index: 12,
        mood: "wonder",
        readsAs: "magic",
        strength: null,
        lengthMs: 950,
        answerLengthMs: 890,
        note: null,
        updatedAt: 100,
        client: "Mac",
      },
    ]);
    second.close();
  });

  it("clears a field sent as null and keeps one left out", () => {
    const { db, close } = openDatabase(":memory:");
    const feel = createSoundFeel({ storage: createSoundFeelStorage(db) });
    feel.record({ index: 5, mood: "loss", lengthMs: 700, answerLengthMs: 650 }, "iPad");
    // A replay that got no answer from the tower measures only from the Play press.
    const row = feel.record({ index: 5, lengthMs: 720, answerLengthMs: null }, "iPad");
    expect(row).toMatchObject({ mood: "loss", lengthMs: 720, answerLengthMs: null });
    close();
  });

  it("saves a note of only spaces as no note", () => {
    const { db, close } = openDatabase(":memory:");
    const feel = createSoundFeel({ storage: createSoundFeelStorage(db) });
    expect(feel.record({ index: 1, note: "   " }, "iPad").note).toBeNull();
    close();
  });

  it("leaves out, and warns about, a row it cannot read", () => {
    const { db, close } = openDatabase(":memory:");
    db.insert(soundFeelTable)
      .values({ index: 4, mood: "spooky", updatedAt: 1, client: "iPad" })
      .run();
    db.insert(soundFeelTable)
      .values({ index: 6, mood: "calm", updatedAt: 1, client: "iPad" })
      .run();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const rows = createSoundFeel({ storage: createSoundFeelStorage(db) }).rows();
      expect(rows.map((row) => row.index)).toEqual([6]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("1 saved sound feel row"));
    } finally {
      warn.mockRestore();
      close();
    }
  });
});
