import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FLASH_DURATION_MS, timingResultSchema } from "@dark-tower/tower";
import { describe, expect, it } from "vitest";
import { saveTimingResult, timingResultFilename } from "./resultLog.ts";

const at = new Date("2026-10-15T18:04:05.006Z");

const body = timingResultSchema.parse({
  version: 1,
  startedAt: "2026-10-15T18:00:00.000Z",
  notes: "Skull drop was quiet. Flash at 8 looked like a smear.",
  lightSequences: [
    {
      name: "rotationDrumMiddle",
      flagged: true,
      sentWithoutWaiting: true,
      sentAt: 1_700_000_000_000,
      acknowledgedAt: null,
      doneAt: 1_700_000_003_000,
      outcome: "indeterminate",
    },
  ],
  overlap: [],
  skull: { dropAt: null, towerMadeSound: null },
  flash: { warningShown: true, skipped: true, rates: [], fastestCleanHz: null },
});

describe("timing result log", () => {
  it("names the file from the time, with no colon the filesystem would reject", () => {
    expect(timingResultFilename(at)).toBe("timing-2026-10-15T18-04-05-006Z.json");
    expect(timingResultFilename(at)).not.toContain(":");
  });

  it("writes Bob's notes and keeps a missing acknowledgement null", async () => {
    const dir = await mkdtemp(join(tmpdir(), "timing-result-"));
    const saved = await saveTimingResult(dir, body, at);
    expect(saved).toEqual({ ok: true, file: "timing-2026-10-15T18-04-05-006Z.json" });
    if (!saved.ok) return;
    const text = await readFile(join(dir, saved.file), "utf8");
    const json = JSON.parse(text) as {
      notes: string;
      savedAt: string;
      lightSequences: { acknowledgedAt: number | null; flagged: boolean }[];
    };
    expect(json.notes).toBe("Skull drop was quiet. Flash at 8 looked like a smear.");
    expect(json.savedAt).toBe("2026-10-15T18:04:05.006Z");
    expect(json.lightSequences[0]).toMatchObject({
      flagged: true,
      acknowledgedAt: null,
    });
    expect(JSON.stringify(json)).not.toContain('"acknowledgedAt":0');
    expect(text.endsWith("\n")).toBe(true);
  });

  it("does not let the body choose the path, and writes a second file when the name is taken", async () => {
    const dir = await mkdtemp(join(tmpdir(), "timing-result-"));
    expect((await saveTimingResult(dir, { ...body, file: "../x.json" }, at)).ok).toBe(false);
    expect((await saveTimingResult(dir, { ...body, notes: "" }, at)).ok).toBe(true);
    const again = await saveTimingResult(dir, body, at);
    expect(again).toEqual({ ok: true, file: "timing-2026-10-15T18-04-05-006Z-2.json" });
    expect(await readdir(dir)).toHaveLength(2);
  });

  it("accepts an empty note and a skipped flash that still records the warning", async () => {
    const dir = await mkdtemp(join(tmpdir(), "timing-result-"));
    const saved = await saveTimingResult(
      dir,
      {
        ...body,
        notes: "",
        flash: {
          warningShown: true,
          skipped: true,
          rates: [],
          fastestCleanHz: null,
          durationMs: FLASH_DURATION_MS,
        },
      },
      at,
    );
    // `durationMs` is not a field of `flash`, so the extra key is refused.
    expect(saved.ok).toBe(false);
    const empty = await saveTimingResult(dir, { ...body, notes: "" }, at);
    expect(empty.ok).toBe(true);
  });
});
