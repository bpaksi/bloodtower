import { reportAudioStartRefused } from "./audioError.ts";
import { readLevels } from "./levels.ts";
import { storyBoardAudio } from "./storyAudio.tsx";

/*
 * The coin sound for the starting-purse spin (CU/15, Q7.4). With no tower the board speakers play
 * it, once per spin (DEC-201, DEC-903); no iPad plays sound. It is made in the browser from two
 * short notes, so no sound file is needed. With the tower linked the tower plays the sound instead.
 */

/** Two notes a fifth apart: the second rings longer, as a coin does. */
export const COIN_NOTES: readonly { hz: number; at: number; seconds: number }[] = [
  { hz: 987.77, at: 0, seconds: 0.09 },
  { hz: 1318.51, at: 0.08, seconds: 0.45 },
];

/** Schedules the coin on `context`, into `out`. Pure scheduling: nothing is read or stored. */
export const scheduleCoin = (context: AudioContext, out: AudioNode): void => {
  const start = context.currentTime;
  for (const note of COIN_NOTES) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "triangle";
    osc.frequency.value = note.hz;
    const from = start + note.at;
    gain.gain.setValueAtTime(0.0001, from);
    gain.gain.exponentialRampToValueAtTime(0.35, from + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, from + note.seconds);
    osc.connect(gain);
    gain.connect(out);
    osc.start(from);
    osc.stop(from + note.seconds + 0.02);
  }
};

declare global {
  interface Window {
    /** How many coin cues this board has played. A test reads it; nothing else does. */
    __btCoinCues?: number;
  }
}

/** Plays the coin cue on the board's audio. A browser with no audio logs and toasts, never stays silent. */
export const playCoinCue = (): void => {
  const audio = storyBoardAudio(readLevels(window.localStorage));
  if (!audio.playCoin(scheduleCoin)) {
    reportAudioStartRefused(new Error("The coin cue could not play: this browser has no audio."));
    return;
  }
  window.__btCoinCues = (window.__btCoinCues ?? 0) + 1;
};
