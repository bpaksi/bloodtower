import { describe, expect, it } from "vitest";
import {
  CROSSFADE_SECONDS,
  FADE_TO_SILENCE_SECONDS,
  LayerMixer,
  type LoopChannel,
  type LoopHandle,
  type MixerBackend,
} from "./mixer.ts";
import type { AudioFile } from "./tracks.ts";

const bed: AudioFile = { url: "/audio/signature/signature-bed.m4a", frames: 5_472_000 };
const startup: AudioFile = { url: "/packs/test/audio/startup-ambient.m4a", frames: 4_608_000 };
const waiting: AudioFile = { url: "/packs/test/audio/pg-music.m4a", frames: 7_200_000 };

type Call =
  | { kind: "start"; url: string; channel: LoopChannel; seconds: number }
  | { kind: "fade"; url: string; seconds: number };

const recorder = () => {
  const calls: Call[] = [];
  const backend: MixerBackend = {
    startLoop: (file: AudioFile, channel: LoopChannel, seconds: number): LoopHandle => {
      calls.push({ kind: "start", url: file.url, channel, seconds });
      return {
        fadeOut: (fade: number) => calls.push({ kind: "fade", url: file.url, seconds: fade }),
      };
    },
  };
  return { calls, backend };
};

describe("LayerMixer", () => {
  it("starts each channel's file with a crossfade, not a cut", () => {
    const { calls, backend } = recorder();
    const mixer = new LayerMixer(backend);
    mixer.apply({ ambient: bed, music: null });
    expect(calls).toEqual([
      { kind: "start", url: bed.url, channel: "ambient", seconds: CROSSFADE_SECONDS },
    ]);
    expect(CROSSFADE_SECONDS).toBeGreaterThanOrEqual(2);
    expect(CROSSFADE_SECONDS).toBeLessThanOrEqual(3);
  });

  it("crossfades a changed file: the old one fades out as the new one fades in", () => {
    const { calls, backend } = recorder();
    const mixer = new LayerMixer(backend);
    mixer.apply({ ambient: bed, music: null });
    mixer.apply({ ambient: startup, music: null });
    expect(calls.slice(1)).toEqual([
      { kind: "fade", url: bed.url, seconds: CROSSFADE_SECONDS },
      { kind: "start", url: startup.url, channel: "ambient", seconds: CROSSFADE_SECONDS },
    ]);
  });

  it("does nothing when the same file is picked again", () => {
    const { calls, backend } = recorder();
    const mixer = new LayerMixer(backend);
    mixer.apply({ ambient: bed, music: waiting });
    const before = calls.length;
    mixer.apply({ ambient: { ...bed }, music: waiting });
    expect(calls).toHaveLength(before);
  });

  it("fades a visual in and out over about a second and brings the layer back", () => {
    const { calls, backend } = recorder();
    const mixer = new LayerMixer(backend);
    mixer.apply({ ambient: startup, music: waiting });
    mixer.apply({ ambient: null, music: null });
    expect(mixer.current()).toEqual({ ambient: null, music: null });
    expect(calls.filter((call) => call.kind === "fade")).toEqual([
      { kind: "fade", url: startup.url, seconds: FADE_TO_SILENCE_SECONDS },
      { kind: "fade", url: waiting.url, seconds: FADE_TO_SILENCE_SECONDS },
    ]);
    mixer.apply({ ambient: startup, music: waiting });
    expect(mixer.current()).toEqual({ ambient: startup.url, music: waiting.url });
    expect(calls.at(-1)).toEqual({
      kind: "start",
      url: waiting.url,
      channel: "music",
      seconds: CROSSFADE_SECONDS,
    });
  });

  it("swaps night 1 for night 2 on the picker's change, with a crossfade", () => {
    const night2: AudioFile = { url: "/packs/test/audio/night2-ambient.m4a", frames: 4_320_000 };
    const night1: AudioFile = { url: "/packs/test/audio/night1-ambient.m4a", frames: 4_800_000 };
    const { calls, backend } = recorder();
    const mixer = new LayerMixer(backend);
    mixer.apply({ ambient: night1, music: waiting });
    mixer.apply({ ambient: night2, music: waiting });
    expect(calls.slice(-2)).toEqual([
      { kind: "fade", url: night1.url, seconds: CROSSFADE_SECONDS },
      { kind: "start", url: night2.url, channel: "ambient", seconds: CROSSFADE_SECONDS },
    ]);
  });
});
