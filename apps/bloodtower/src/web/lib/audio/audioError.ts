import { reportPageLog } from "../pageLog.ts";

/** A browser `AudioContext.resume()` that rejected. Logged and toasted on the Story board. */
export const AUDIO_START_REFUSED = "audio-start-refused";

export interface AudioToast {
  code: string;
  message: string;
}

type Sink = (toast: AudioToast) => void;

let sink: Sink | null = null;
const queued: AudioToast[] = [];

/** The Story board shows these toasts. A refusal before the board mounts waits here. */
export const bindStoryBoardAudioErrors = (next: Sink): (() => void) => {
  sink = next;
  const pending = queued.splice(0, queued.length);
  for (const toast of pending) next(toast);
  return () => {
    if (sink === next) sink = null;
  };
};

export const showAudioError = (toast: AudioToast): void => {
  if (sink) sink(toast);
  else queued.push(toast);
};

/** Test isolation. Production never calls this. */
export const resetAudioErrorsForTests = (): void => {
  sink = null;
  queued.length = 0;
};

const refusedMessage = (error: unknown): string => {
  const detail = error instanceof Error ? error.message : String(error);
  return detail.trim() === ""
    ? "The browser refused to start audio."
    : `The browser refused to start audio. ${detail}`;
};

/** One host log line and one Story board toast. The rejection is not dropped. */
export const reportAudioStartRefused = (error: unknown): void => {
  const message = refusedMessage(error);
  void reportPageLog({
    level: "error",
    code: AUDIO_START_REFUSED,
    message,
    source: "board",
  });
  showAudioError({ code: AUDIO_START_REFUSED, message });
};
