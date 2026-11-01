import { pageServerOrigin } from "../serverOrigin.ts";
import { reportAudioStartRefused } from "./audioError.ts";
import { type Layers, pickLayers } from "./layers.ts";
import { CHANNELS, type Channel, type Levels, levelToGain } from "./levels.ts";
import { loopPointsFor } from "./loopPoints.ts";
import { LayerMixer, type LoopChannel, type LoopHandle, type MixerBackend } from "./mixer.ts";
import { type AudioFile, SIGNATURE } from "./tracks.ts";

/** The bed gives way to the tower in about half a second. */
const DUCK_TIME_CONSTANT = 0.12;

/** Test clip per slider: the bed for ambient, motif-soft for music, motif-sting for voice (R3-UI-03). */
export const TEST_CLIPS: Record<Channel, { file: AudioFile; seconds: number }> = {
  ambient: { file: SIGNATURE.bed, seconds: 4 },
  music: { file: SIGNATURE.soft, seconds: 6.5 },
  voice: { file: SIGNATURE.sting, seconds: 6.5 },
};

export interface BtAudioHook {
  readonly contextState: AudioContextState | null;
  readonly ambientPlaying: boolean;
  readonly gains: Levels;
}

declare global {
  interface Window {
    __btAudio?: BtAudioHook;
  }
}

/**
 * The Mac board's audio (R3-UI-03, R3-UI-60, R3-UI-64). The context is made on the first
 * click or keypress, because browsers only allow audio after a gesture. One instance lives
 * from the landing page onto the Story board. Devices never create one.
 */
export class BoardAudio {
  private context: AudioContext | null = null;
  /** True once the ambient source has started. Cleared when that layer goes silent. */
  private ambientAudible = false;
  private gains = new Map<Channel, GainNode>();
  /** Every channel feeds this one gain, so the tower's sound can duck all of them (R3-UI-60). */
  private duck: GainNode | null = null;
  private duckTarget = 1;
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

  /** True once the context exists and is playing. */
  get running(): boolean {
    return this.context?.state === "running";
  }

  /** The live context state, or null before the first gesture creates one. */
  get contextState(): AudioContextState | null {
    return this.context?.state ?? null;
  }

  /** True once the ambient bed's source has started and the layer is still on. */
  get ambientPlaying(): boolean {
    return this.ambientAudible && this.mixer?.current().ambient != null;
  }

  /** Channel gains. Stored levels stand in until the context exists. */
  gainValues(): Levels {
    return {
      music: this.gainOf("music"),
      ambient: this.gainOf("ambient"),
      voice: this.gainOf("voice"),
    };
  }

  private gainOf(channel: Channel): number {
    const node = this.gains.get(channel);
    if (node) return node.gain.value;
    return levelToGain(this.levels[channel]);
  }

  /**
   * Call from a click or keypress. Safe to call again. A key such as Escape is not a user
   * activation, so the context can start suspended; a later call resumes it.
   */
  unlock(): void {
    if (this.context) {
      this.resume();
      return;
    }
    const Context =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    this.context = context;
    const duck = context.createGain();
    duck.gain.value = this.duckTarget;
    duck.connect(context.destination);
    this.duck = duck;
    for (const channel of CHANNELS) {
      const gain = context.createGain();
      gain.gain.value = levelToGain(this.levels[channel]);
      gain.connect(duck);
      this.gains.set(channel, gain);
    }
    this.resume();
    this.mixer = new LayerMixer(this.backend(context));
    if (!this.pending) {
      this.pending = pickLayers({ screen: "splash", packId: null, visual: false });
    }
    this.mixer.apply(this.pending);
    installBtAudioHook(this);
  }

  private resume(): void {
    const context = this.context;
    if (!context || context.state === "running") return;
    context.resume().catch((error: unknown) => {
      reportAudioStartRefused(error);
    });
  }

  setLevels(levels: Levels): void {
    this.levels = levels;
    if (!this.context) return;
    for (const channel of CHANNELS) {
      const gain = this.gains.get(channel);
      if (!gain) continue;
      gain.gain.value = levelToGain(levels[channel]);
    }
  }

  /**
   * Ducks every channel to `level` (1 is none) over a short ramp. Held until the context exists.
   * The tower volume test uses it while the tower plays.
   */
  setDuck(level: number): void {
    this.duckTarget = level;
    if (!this.context || !this.duck) return;
    this.duck.gain.setTargetAtTime(level, this.context.currentTime, DUCK_TIME_CONSTANT);
  }

  /** The layers the board should hear now. Held until the context exists. */
  update(layers: Layers): void {
    this.pending = layers;
    if (!layers.ambient) this.ambientAudible = false;
    this.mixer?.apply(layers);
  }

  /** The short test clip behind a Sound dialog slider. It stops by itself. */
  test(channel: Channel): void {
    this.resume();
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
          if (channel === "ambient") this.ambientAudible = true;
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

/** Publishes the live audio state tests read (`window.__btAudio`). */
export const installBtAudioHook = (audio: BoardAudio): void => {
  if (typeof window === "undefined") return;
  window.__btAudio = {
    get contextState() {
      return audio.contextState;
    },
    get ambientPlaying() {
      return audio.ambientPlaying;
    },
    get gains() {
      return audio.gainValues();
    },
  };
};
