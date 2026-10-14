import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { HttpError, pcmToWav, synthesize } from "../gemini.ts";
import type { Scenario, Story } from "./types.ts";

/** Committed cache of rendered lines and scenes (ships with the project). */
export const CACHE_DIR = path.join(process.cwd(), "audio-cache");
export const DEFAULT_MODEL = "gemini-3.8-flash-tts";
const GAP_MS = 400;
const BYTES_PER_SEC = 48000; // 24 kHz, 16-bit mono
/** Free tier allows ~3 requests/minute, so keep this low. */
const CONCURRENCY = 1;

export interface RenderedLine {
  index: number;
  speaker: string;
  voice: string;
  style: string;
  text: string;
  hash: string;
  url: string | null;
  seconds: number | null;
}

export interface RenderResult {
  storyId: string;
  scenarioId: string;
  model: string;
  lines: RenderedLine[];
  full: { url: string; seconds: number } | null;
  generatedNow: number;
  missing: number;
  /** Set when generation stopped early (e.g. quota). */
  stopReason: string | null;
}

export function lineHash(model: string, voice: string, style: string, text: string): string {
  return createHash("sha256")
    .update(JSON.stringify([model, voice, style, text]))
    .digest("hex")
    .slice(0, 20);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Thrown when the daily quota is exhausted; retrying today is pointless. */
export class QuotaExhaustedError extends HttpError {}

function retryDelayMs(message: string): number | null {
  if (/per day/i.test(message)) return null;
  const m = message.match(/retry in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/i);
  if (!m) return 15000;
  const [, h, min, sec] = m;
  return ((Number(h ?? 0) * 60 + Number(min ?? 0)) * 60 + Number(sec)) * 1000 + 1000;
}

async function synthWithRetry(
  model: string,
  voice: string,
  style: string,
  text: string,
): Promise<Buffer> {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await synthesize({ model, mode: "single", voice, style, text });
      return r.wav;
    } catch (e) {
      if (!(e instanceof HttpError)) throw e;
      if (e.status === 429) {
        const delay = retryDelayMs(e.message);
        if (delay === null) throw new QuotaExhaustedError(e.message, 429);
        if (attempt >= 8) throw e;
        await sleep(delay);
        continue;
      }
      if (e.status < 500 || attempt >= 4) throw e;
      await sleep(2000 * 2 ** attempt);
    }
  }
}

function pcmOf(wav: Buffer): Buffer {
  return wav.subarray(44);
}

function resolveLine(story: Story, scenario: Scenario, index: number, model: string) {
  const line = scenario.script[index];
  const who =
    line.speaker === "narrator"
      ? story.narrator
      : story.characters.find((c) => c.id === line.speaker);
  if (!who) throw new HttpError(`Unknown speaker "${line.speaker}"`, 500);
  const style = line.style ?? who.style;
  return {
    line,
    voice: who.voice,
    style,
    hash: lineHash(model, who.voice, style, line.text),
  };
}

export async function renderScenario(
  story: Story,
  scenario: Scenario,
  model: string,
  generate: boolean,
): Promise<RenderResult> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const resolved = scenario.script.map((_, i) => resolveLine(story, scenario, i, model));
  const wavs: (Buffer | null)[] = resolved.map((r) => {
    const p = path.join(CACHE_DIR, `${r.hash}.wav`);
    return fs.existsSync(p) ? fs.readFileSync(p) : null;
  });

  let generatedNow = 0;
  let stopReason: string | null = null;
  if (generate) {
    const todo = resolved.map((_, i) => i).filter((i) => !wavs[i]);
    let next = 0;
    const worker = async () => {
      while (next < todo.length && !stopReason) {
        const i = todo[next++];
        const r = resolved[i];
        const wav = await synthWithRetry(model, r.voice, r.style, r.line.text);
        fs.writeFileSync(path.join(CACHE_DIR, `${r.hash}.wav`), wav);
        wavs[i] = wav;
        generatedNow++;
      }
    };
    try {
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    } catch (e) {
      // Keep whatever finished; report the error alongside partial results.
      stopReason = e instanceof Error ? e.message : String(e);
    }
  }

  const lines: RenderedLine[] = resolved.map((r, i) => {
    const wav = wavs[i];
    return {
      index: i,
      speaker: r.line.speaker,
      voice: r.voice,
      style: r.style,
      text: r.line.text,
      hash: r.hash,
      url: wav ? `/audio/${r.hash}.wav` : null,
      seconds: wav ? Number((pcmOf(wav).length / BYTES_PER_SEC).toFixed(2)) : null,
    };
  });

  const missing = wavs.filter((w) => !w).length;
  let full: RenderResult["full"] = null;
  if (missing === 0) {
    const fullHash = createHash("sha256")
      .update(JSON.stringify([GAP_MS, ...resolved.map((r) => r.hash)]))
      .digest("hex")
      .slice(0, 20);
    const name = `scene-${story.id}-${scenario.id}-${fullHash}.wav`;
    const p = path.join(CACHE_DIR, name);
    if (!fs.existsSync(p)) {
      const gap = Buffer.alloc(Math.round((GAP_MS / 1000) * BYTES_PER_SEC));
      const parts = wavs.flatMap((w, i) =>
        i === 0 ? [pcmOf(w as Buffer)] : [gap, pcmOf(w as Buffer)],
      );
      fs.writeFileSync(p, pcmToWav(Buffer.concat(parts)));
    }
    const size = fs.statSync(p).size;
    full = {
      url: `/audio/${name}`,
      seconds: Number(((size - 44) / BYTES_PER_SEC).toFixed(2)),
    };
  }

  return {
    storyId: story.id,
    scenarioId: scenario.id,
    model,
    lines,
    full,
    generatedNow,
    missing,
    stopReason,
  };
}
