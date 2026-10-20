import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Moment, Pack } from "bloodtower-protocols";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../config.ts";
import { lintPath } from "../scripts/packLint.ts";
import {
  boardText,
  textFitWarnings,
  VISUAL_CAPTION_TEXT_LIMIT,
  WAITING_DIALOG_TEXT_LIMIT,
} from "./fit.ts";
import { loadR1Pack } from "./load.ts";

const loaded = loadR1Pack(loadConfig().packsDir);
if (!loaded.ok) throw new Error("the test pack must load");
const base: Pack = loaded.pack;

const words = (length: number) => "a".repeat(length);

const lines = (...texts: string[]): Moment["lines"] =>
  texts.map((text) => ({ speaker: "narrator", text, voice: "vo.line" }));

const packWith = (...moments: Moment[]): Pack => ({ ...base, moments });

const moment = (extra: Partial<Moment>): Moment => ({
  id: "x.01",
  kind: "text-card",
  target: "storyboard",
  ...extra,
});

describe("boardText", () => {
  it("drops pause tags and stage directions and joins lines with one space", () => {
    expect(boardText("Go on. [pause 0.5] I'll wait.\nStay (whisper) close.")).toBe(
      "Go on. I'll wait. Stay close.",
    );
  });
});

describe("W-fit text limits", () => {
  it("states both limits under the measured cuts", () => {
    expect(WAITING_DIALOG_TEXT_LIMIT).toBe(460);
    expect(VISUAL_CAPTION_TEXT_LIMIT).toBe(225);
  });

  it("passes a waiting text exactly at its limit and warns one character over", () => {
    const at = moment({ lines: lines(words(WAITING_DIALOG_TEXT_LIMIT)) });
    expect(textFitWarnings(packWith(at), "moments.yaml")).toEqual([]);
    const over = moment({ id: "x.02", lines: lines(words(WAITING_DIALOG_TEXT_LIMIT + 1)) });
    const [warning, ...rest] = textFitWarnings(packWith(at, over), "moments.yaml");
    expect(rest).toEqual([]);
    expect(warning).toMatchObject({ rule: "W-fit", file: "moments.yaml", path: "x.02" });
    expect(warning?.message).toContain("x.02");
    expect(warning?.message).toContain(`${WAITING_DIALOG_TEXT_LIMIT + 1} characters`);
    expect(warning?.message).toContain(`holds ${WAITING_DIALOG_TEXT_LIMIT}`);
    expect(warning?.message).toContain("waiting dialog");
  });

  it("uses the 3-line caption limit for a still, a clip, an asset or a cue", () => {
    const long = lines(words(VISUAL_CAPTION_TEXT_LIMIT + 1));
    const short = lines(words(VISUAL_CAPTION_TEXT_LIMIT));
    const cue = base.cues[0]?.name ?? "bell";
    const visuals = [
      moment({ id: "v.still", kind: "still", asset: "fx.hall" }),
      moment({ id: "v.clip", kind: "clip", asset: "av.keeper" }),
      moment({ id: "v.asset", kind: "text-card", asset: "fx.hall" }),
      moment({ id: "v.cue", kind: "text-card", cues: [{ cue, at: "start" }] }),
    ];
    for (const visual of visuals) {
      expect(textFitWarnings(packWith({ ...visual, lines: short }), "m"), visual.id).toEqual([]);
      const [warning] = textFitWarnings(packWith({ ...visual, lines: long }), "m");
      expect(warning?.message, visual.id).toContain("caption over a visual");
      expect(warning?.message).toContain(`holds ${VISUAL_CAPTION_TEXT_LIMIT}`);
    }
  });

  it("measures what the board shows: two lines together, no pause tags, no stage directions", () => {
    const half = words(Math.floor((WAITING_DIALOG_TEXT_LIMIT - 1) / 2));
    const fits = moment({
      lines: lines(`${half} [pause 1] (whisper)`, `${half}`),
    });
    expect(textFitWarnings(packWith(fits), "m")).toEqual([]);
    const tooLong = moment({ lines: lines(half, `${half}${words(3)}`) });
    expect(textFitWarnings(packWith(tooLong), "m")).toHaveLength(1);
  });

  it("treats a pick prompt as waiting text even when it names an asset", () => {
    const pick = moment({
      id: "x.pick",
      kind: "pick-card",
      target: "ipad:all",
      lines: lines(words(WAITING_DIALOG_TEXT_LIMIT)),
    });
    expect(textFitWarnings(packWith(pick), "m")).toEqual([]);
  });

  it("skips private iPad moments, the Keeper scene and moments with no lines", () => {
    const long = lines(words(900));
    const skipped = [
      moment({ id: "x.private.alpha", target: "ipad:alpha", lines: long }),
      moment({ id: "grey-stair.03", kind: "clip", asset: "av.keeper", lines: long }),
      moment({ id: "x.holder", placeholder: words(300) }),
    ];
    expect(textFitWarnings(packWith(...skipped), "m")).toEqual([]);
  });
});

describe("W-fit through pack:lint", () => {
  it("warns on a long moment and still exits 0", () => {
    const dir = mkdtempSync(join(tmpdir(), "bloodtower-fit-"));
    try {
      const source = join(loadConfig().packsDir, "test");
      cpSync(source, dir, { recursive: true });
      const file = join(dir, "moments.yaml");
      const yaml = readFileSync(file, "utf8").replace(
        "A bell marks the step.",
        words(WAITING_DIALOG_TEXT_LIMIT + 5),
      );
      writeFileSync(file, yaml);
      const report = lintPath(dir, process.cwd());
      expect(report.exitCode).toBe(0);
      const line = report.lines.find((item) => item.includes("rule=W-fit"));
      expect(line).toContain("file=moments.yaml");
      expect(line).toContain("path=proving-ground.03");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
