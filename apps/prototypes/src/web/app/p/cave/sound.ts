// Stand-in for "a sound from the tower": played in the browser with WebAudio. The tower is never touched.
import { logger } from "../../../lib/logger.ts";

/** Plays a short low tone; the pitch differs per passage. Returns an error text for the control, or null. */
export function playTowerSound(passage: number): string | null {
  try {
    const Ctx = window.AudioContext;
    if (!Ctx) throw new Error("This browser has no WebAudio.");
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 90 + passage * 40;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
    osc.onended = () => void ctx.close();
    return null;
  } catch (cause) {
    const entry = logger.error("Could not play the tower sound.", cause, "CAVE_SOUND_FAILED");
    return `${entry.code}: ${entry.message}`;
  }
}
