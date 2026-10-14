import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { wavDurationMs } from "./wav.ts";

const narrator = join(
  import.meta.dirname,
  "../../../assets/audio/lines/n2-burgomasters-funeral.01.vo-01.narrator.wav",
);

describe("wavDurationMs", () => {
  it("reads a duration from the real opening line", () => {
    const duration = wavDurationMs(narrator);
    expect(duration).toBeGreaterThan(1_000);
    expect(duration).toBe(wavDurationMs(readFileSync(narrator)));
  });

  it("rejects a buffer that is not a WAV", () => {
    expect(() => wavDurationMs(Buffer.from("not a wav"))).toThrow(/WAV/);
  });
});
