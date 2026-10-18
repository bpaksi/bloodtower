import type { Layers } from "./layers.ts";
import type { AudioFile } from "./tracks.ts";

/** Between two layers: a 2-3 s crossfade, never a hard cut (R3-UI-64). */
export const CROSSFADE_SECONDS = 2.5;
/** A visual zooms in or out: about 1 s (R3-UI-60). */
export const FADE_TO_SILENCE_SECONDS = 1;

export type LoopChannel = keyof Layers;

export interface LoopHandle {
  /** Ramps the loop to silence over `seconds`, then stops it. */
  fadeOut(seconds: number): void;
}

/** The part that touches the browser. The mixer decides when and how long; the backend plays. */
export interface MixerBackend {
  /** Starts `file` looping on `channel`, ramping from silence to full over `seconds`. */
  startLoop(file: AudioFile, channel: LoopChannel, seconds: number): LoopHandle;
}

/**
 * Keeps each loop channel on the layer the picker chose. A changed file crossfades, and a
 * channel going silent fades out over the shorter visual fade. The same file again is a no-op.
 */
export class LayerMixer {
  private playing: Record<LoopChannel, { url: string; handle: LoopHandle } | null> = {
    ambient: null,
    music: null,
  };

  constructor(private readonly backend: MixerBackend) {}

  apply(layers: Layers): void {
    for (const channel of ["ambient", "music"] as const) {
      const next = layers[channel];
      const current = this.playing[channel];
      if ((current?.url ?? null) === (next?.url ?? null)) continue;
      if (current) current.handle.fadeOut(next ? CROSSFADE_SECONDS : FADE_TO_SILENCE_SECONDS);
      this.playing[channel] = next
        ? { url: next.url, handle: this.backend.startLoop(next, channel, CROSSFADE_SECONDS) }
        : null;
    }
  }

  /** The URL each channel is playing, or null when it is silent. */
  current(): Record<LoopChannel, string | null> {
    return {
      ambient: this.playing.ambient?.url ?? null,
      music: this.playing.music?.url ?? null,
    };
  }
}
