import { pageServerOrigin } from "../serverOrigin.ts";
import type { Layers } from "./layers.ts";
import { CHANNELS, type Channel, type Levels } from "./levels.ts";
import { loopPointsFor } from "./loopPoints.ts";
import { LayerMixer, type LoopChannel, type LoopHandle, type MixerBackend } from "./mixer.ts";
import { type AudioFile, SIGNATURE } from "./tracks.ts";

const FADE_IN_TIME_CONSTANT = 0.05;

/** Test clip per slider: the bed for ambient, motif-soft for music, motif-sting for voice (R3-UI-03). */
export const TEST_CLIPS: Record<Channel, { file: AudioFile; seconds: number }> = {
  ambient: { file: SIGNATURE.bed, seconds: 4 },
  music: { file: SIGNATURE.soft, seconds: 6.5 },
  voice: { file: SIGNATURE.sting, seconds: 6.5 },
};

/**
 * The Mac board's audio (R3-UI-03, R3-UI-60, R3-UI-64). The context is made on the first board
 * click or keypress, because browsers only allow audio after a gesture. Devices never create one.
 */
export class BoardAudio {
  private context: AudioContext | null = null;
  private gains = new Map<Channel, GainNode>();
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private mixer: LayerMixer | null = null;
  private pending: Layers | null = null;
  private levels: Levels;
  private origin: string;

  /**
   * `origin` is the session host that serves `/audio/` and `/packs/<id>/audio/`. Under
   * `pnpm dev` that is not the page's own origin (see {@link pageServerOrigin}).
   */
  constructor(levels: Levels, origin: string = pageServerOrigin()) {
    this.levels = levels;
    this.origin = origin;
  }

  /** Call from a click or keypress. Safe to call again. */
  unlock(): void {
    if (this.context) return;
    const Context =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    this.context = context;
    for (const channel of CHANNELS) {
      const gain = context.createGain();
      gain.gain.value = this.levels[channel];
      gain.connect(context.destination);
      this.gains.set(channel, gain);
    }
    void context.resume();
    this.mixer = new LayerMixer(this.backend(context));
    if (this.pending) this.mixer.apply(this.pending);
  }

  setLevels(levels: Levels): void {
    this.levels = levels;
    if (!this.context) return;
    for (const channel of CHANNELS) {
      this.gains
        .get(channel)
        ?.gain.setTargetAtTime(levels[channel], this.context.currentTime, FADE_IN_TIME_CONSTANT);
    }
  }

  /** The layers the board should hear now. Held until the context exists. */
  update(layers: Layers): void {
    this.pending = layers;
    this.mixer?.apply(layers);
  }

  /** The short test clip behind a Sound dialog slider. It stops by itself. */
  test(channel: Channel): void {
    const context = this.context;
    const gain = this.gains.get(channel);
    if (!context || !gain) return;
    const { file, seconds } = TEST_CLIPS[channel];
    this.withBuffer(context, file, (buffer) => {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.start(0);
      source.stop(context.currentTime + seconds);
    });
  }

  /** A one-shot on a channel, such as the landing sting or the game-chosen motif. */
  play(file: AudioFile, channel: Channel, seconds: number): void {
    const context = this.context;
    const gain = this.gains.get(channel);
    if (!context || !gain) return;
    this.withBuffer(context, file, (buffer) => {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.start(0);
      source.stop(context.currentTime + seconds);
    });
  }

  private backend(context: AudioContext): MixerBackend {
    return {
      startLoop: (file: AudioFile, channel: LoopChannel, seconds: number): LoopHandle => {
        const out = this.gains.get(channel);
        const track = context.createGain();
        track.gain.setValueAtTime(0, context.currentTime);
        track.gain.linearRampToValueAtTime(1, context.currentTime + seconds);
        track.connect(out ?? context.destination);
        let source: AudioBufferSourceNode | null = null;
        let stopping = false;
        this.withBuffer(context, file, (buffer) => {
          if (stopping) return;
          source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(track);
          const points = file.frames
            ? loopPointsFor(buffer.length, file.frames, buffer.sampleRate)
            : null;
          if (points) {
            source.loop = true;
            source.loopStart = points.loopStart;
            source.loopEnd = points.loopEnd;
            source.start(0, points.startAt);
          } else {
            source.start(0);
          }
        });
        return {
          fadeOut: (fadeSeconds: number) => {
            stopping = true;
            const now = context.currentTime;
            track.gain.cancelScheduledValues(now);
            track.gain.setValueAtTime(track.gain.value, now);
            track.gain.linearRampToValueAtTime(0, now + fadeSeconds);
            source?.stop(now + fadeSeconds);
            window.setTimeout(() => track.disconnect(), (fadeSeconds + 0.5) * 1000);
          },
        };
      },
    };
  }

  /** Runs `use` once the file is decoded. A file that fails to load is reported, not played. */
  private withBuffer(
    context: AudioContext,
    file: AudioFile,
    use: (buffer: AudioBuffer) => void,
  ): void {
    this.buffer(context, file)
      .then(use)
      .catch((error: unknown) => {
        this.buffers.delete(file.url);
        console.warn("[bloodtower] audio unavailable", file.url, error);
      });
  }

  private buffer(context: AudioContext, file: AudioFile): Promise<AudioBuffer> {
    let loaded = this.buffers.get(file.url);
    if (!loaded) {
      loaded = fetch(`${this.origin}${file.url}`)
        .then((response) => {
          if (!response.ok) throw new Error(`Audio ${file.url} returned ${response.status}.`);
          return response.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes));
      this.buffers.set(file.url, loaded);
    }
    return loaded;
  }
}
