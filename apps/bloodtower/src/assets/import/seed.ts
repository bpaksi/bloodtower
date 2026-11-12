import { createHash } from "node:crypto";
import { join } from "node:path";
import { audioSplicePlan, PauseMarkupError, ttsCacheMaterial } from "@asset-studio/formats";
import type { JobCastMember } from "../needs/deps.ts";
import { errorText } from "../needs/source.ts";

/**
 * asset-studio 0.2's default Gemini voice model (`DEFAULT_GEMINI_MODEL`, not exported by the
 * cli library). The model is part of the voice cache key, so a render under another model
 * does not find the seeded audio and calls the provider.
 */
export const DEFAULT_TTS_MODEL = "gemini-3.8-flash-tts";
/** The model name asset-studio's fake voice provider reports. */
export const FAKE_TTS_MODEL = "fake-1";

type Env = Readonly<Record<string, string | undefined>>;

/** The model a render with this environment would key its voice cache with. */
export const ttsModel = (env: Env, flag?: string): string => {
  if (flag !== undefined) return flag;
  if (env.ASSET_STUDIO_FAKE_PROVIDERS === "1") return FAKE_TTS_MODEL;
  return env.ASSET_STUDIO_TTS_MODEL ?? DEFAULT_TTS_MODEL;
};

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

/**
 * The tts-cache file asset-studio's voice render reads for one spoken line, or a reason the
 * line cannot be seeded. Mirrors `renderLine` in `@asset-studio/cli` `dist/voice/render.js`:
 * `<work>/<story>/tts-cache/<sha256(ttsCacheMaterial|model=<model>)>.wav`, one file per speech
 * segment, so only a line of exactly one speech segment (no pause markup) can be seeded.
 */
export const cacheFileFor = (
  storyRoot: string,
  text: string,
  voice: NonNullable<JobCastMember["voice"]>,
  model: string,
): { file: string } | { reason: string } => {
  let plan: ReturnType<typeof audioSplicePlan>;
  try {
    plan = audioSplicePlan(text);
  } catch (error) {
    if (error instanceof PauseMarkupError) return { reason: `pause markup: ${error.message}` };
    return { reason: `cannot plan the line: ${errorText(error)}` };
  }
  const speech = plan.filter((step) => step.type === "speech");
  if (plan.length !== 1 || speech.length !== 1 || speech[0]?.type !== "speech") {
    return { reason: "line has pause markup, so its segments are cached one by one" };
  }
  const material: { text: string; provider: string; voiceId: string; style?: string } = {
    text: speech[0].text,
    provider: voice.provider,
    voiceId: voice.voiceId,
  };
  if (voice.style !== undefined) material.style = voice.style;
  const key = sha256(`${ttsCacheMaterial(material)}|model=${model}`);
  return { file: join(storyRoot, "tts-cache", `${key}.wav`) };
};
