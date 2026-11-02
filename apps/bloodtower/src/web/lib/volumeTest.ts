import type { VolumeAnswer, VolumeTest } from "bloodtower-protocols";

/** Neutral wording: no quiet or loud names, because the library's tier order is unconfirmed. */
export const VOLUME_ANSWER_LABEL: Record<VolumeAnswer, string> = {
  "all-differ": "All three differ",
  "one-louder": "Only one level is louder",
  "all-same": "All the same",
  "write-in": "Something else",
};

export const VOLUME_QUESTION = "Did the levels sound different?";

/** The board's heading and the line under it for the current phase. */
export const volumeBoardCopy = (test: VolumeTest): { title: string; line: string } => {
  if (test.mode === "room") {
    return {
      title: "Check the room sound",
      line: "No tower is connected, so no tower sound plays. You should hear the start-up bed now. If you can't, reload the board to open the Sound dialog.",
    };
  }
  switch (test.phase) {
    case "levels":
      return {
        title: `Level ${test.level ?? 0}`,
        line: "The tower plays one sound at a time. Listen for how each level sounds.",
      };
    case "balance-bed":
      return { title: "Tower over the room sound", line: "Listen to the room sound first." };
    case "balance-tower":
      return { title: "Tower over the room sound", line: "The tower plays once over the room." };
    case "asking":
      return { title: VOLUME_QUESTION, line: "Answer on an iPad. First answer counts." };
    case "answered":
      return {
        title: "Thank you.",
        line: test.answer ? `Answered: ${VOLUME_ANSWER_LABEL[test.answer]}.` : "Answered.",
      };
    default:
      return {
        title: "Tower volume test",
        line: test.failed
          ? "The tower did not play that sound. Nothing was sent again. Press Play levels to try once more, or continue."
          : "The tower plays one sound at three levels. Press Play levels on an iPad. You can also skip this test.",
      };
  }
};

/** The tower is playing or about to: Continue waits, and so does the answer. */
export const volumeIsPlaying = (test: VolumeTest): boolean =>
  test.phase === "levels" || test.phase === "balance-bed" || test.phase === "balance-tower";

/** The line on the board and on an iPad that is setting its level (SCR-006, Pick story). */
export const VOLUME_LINE = "How loud should the tower be? Press one to hear it.";
/** The only thing an iPad shows until its own Enable sound tap (Bob 2026-10-31 10:33 ET). */
export const ENABLE_SOUND_LINE = "Tap once to turn on this iPad's sound.";

/** A browser audio call an iPad's tap made was refused. Same code as the board's refusal. */
export const AUDIO_START_REFUSED = "audio-start-refused";

/** What the iPad's own audio did, for the e2e hook. Never sent to the host. */
export interface DeviceSoundHook {
  readonly contextState: AudioContextState | null;
  /** One entry per Dungeon Complete this iPad played in the room, in order. */
  readonly played: readonly { volume: number }[];
}

declare global {
  interface Window {
    __btDeviceSound?: DeviceSoundHook;
  }
}

/** Tower tier 0 is loudest. The room sound follows it (GAP-HW-003 settles the real steps). */
const ROOM_GAIN = [1, 0.5, 0.25] as const;
const ROOM_TONE_HZ = 660;
const ROOM_TONE_SECONDS = 0.6;

let context: AudioContext | null = null;
const playedLog: { volume: number }[] = [];

/**
 * This iPad's own audio context. It is made suspended and only a tap resumes it, so no sound
 * can play before Enable sound. One iPad's tap never touches another's context.
 */
const deviceContext = (): AudioContext => {
  if (!context) {
    context = new AudioContext();
    window.__btDeviceSound = {
      get contextState() {
        return context?.state ?? null;
      },
      played: playedLog,
    };
  }
  return context;
};

/** Call while the Enable sound prompt shows, so the suspended context is there to read. */
export const prepareDeviceSound = async (): Promise<void> => {
  const ctx = deviceContext();
  // An earlier tap on this page can let a new context start running. Hold it until Enable sound.
  if (ctx.state === "running") await ctx.suspend();
};

/** Inside the tap's own handler: resume this iPad's context. A refusal is returned, not eaten. */
export const unlockDeviceSound = async (): Promise<void> => {
  await deviceContext().resume();
};

/** Plays Dungeon Complete's stand-in tone in the room at the pressed volume, after a tap. */
export const playRoomVolume = (level: 0 | 1 | 2): void => {
  const ctx = deviceContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = ROOM_TONE_HZ;
  gain.gain.value = ROOM_GAIN[level];
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + ROOM_TONE_SECONDS);
  playedLog.push({ volume: level });
};

/** Test isolation. Production never calls this. */
export const resetDeviceSoundForTests = (): void => {
  context = null;
  playedLog.length = 0;
};
