import { displayCaption } from "./caption.ts";

export const BOARD_CAPTIONS_STORAGE_KEY = "bloodtower.board.captions";

export type BoardCaptionCue = {
  start: number;
  end: number;
  text: string;
};

export const formatBoardCaption = (speakerName: string, scriptText: string): string =>
  `${speakerName}: ${displayCaption(scriptText)}`;

export const readBoardCaptionsEnabled = (): boolean => {
  if (typeof localStorage === "undefined") return true;
  const stored = localStorage.getItem(BOARD_CAPTIONS_STORAGE_KEY);
  if (stored === null) return true;
  return stored !== "0" && stored !== "false";
};

export const writeBoardCaptionsEnabled = (enabled: boolean): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(BOARD_CAPTIONS_STORAGE_KEY, enabled ? "1" : "0");
};

/** True when C should toggle board captions (not Cmd/Ctrl/Alt+C and not from an editable field). */
export const shouldToggleBoardCaptionsFromKeyboard = (event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
}): boolean => {
  if (event.key !== "c" && event.key !== "C") return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const target = event.target;
  if (
    typeof Element !== "undefined" &&
    target instanceof Element &&
    target.closest("input, textarea, select, [contenteditable='true']")
  ) {
    return false;
  }
  return true;
};

const vttTimestampToken = (part: string): string => part.trim().split(/\s+/u)[0] ?? "";

/** Same path as the line audio with a `.vtt` extension (sibling file). */
export const vttPathForAudio = (audioPath: string): string =>
  audioPath.replace(/\.[^./]+$/u, ".vtt");

export const resolveAssetUrl = (baseUrl: string, path: string): string => {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return base + path.replace(/^(\.\/)+/u, "");
};

const parseVttTimestamp = (raw: string): number => {
  const cleaned = raw.trim();
  const [timePart = "0", msPart = "0"] = cleaned.split(".");
  const segments = timePart.split(":").map((part) => Number(part));
  if (segments.some((value) => Number.isNaN(value))) return 0;
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  if (segments.length === 3) {
    hours = segments[0] ?? 0;
    minutes = segments[1] ?? 0;
    seconds = segments[2] ?? 0;
  } else if (segments.length === 2) {
    minutes = segments[0] ?? 0;
    seconds = segments[1] ?? 0;
  } else if (segments.length === 1) {
    seconds = segments[0] ?? 0;
  }
  const millis = Number(msPart.padEnd(3, "0").slice(0, 3));
  return hours * 3600 + minutes * 60 + seconds + (Number.isNaN(millis) ? 0 : millis / 1000);
};

/** Parses WEBVTT cue blocks; ignores headers and malformed lines. */
export const parseVtt = (body: string): BoardCaptionCue[] => {
  const cues: BoardCaptionCue[] = [];
  const normalized = body.replace(/\uFEFF/gu, "").replace(/\r\n/gu, "\n");
  for (const block of normalized.split(/\n\n+/u)) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) continue;
    if (lines[0]?.startsWith("WEBVTT")) continue;
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const timing = lines[timingIndex];
    if (timing === undefined) continue;
    const [startPart, endPart] = timing.split("-->").map((part) => part.trim());
    const startRaw = startPart ? vttTimestampToken(startPart) : "";
    const endRaw = endPart ? vttTimestampToken(endPart) : "";
    if (!startRaw || !endRaw) continue;
    const text = lines
      .slice(timingIndex + 1)
      .join(" ")
      .trim();
    if (text.length === 0) continue;
    cues.push({
      start: parseVttTimestamp(startRaw),
      end: parseVttTimestamp(endRaw),
      text,
    });
  }
  return cues;
};

export const captionAtTime = (
  cues: BoardCaptionCue[],
  time: number,
): BoardCaptionCue | undefined => {
  for (const cue of cues) {
    if (time >= cue.start && time < cue.end) return cue;
  }
  return undefined;
};

/**
 * Caption string for a playback time: active VTT cue, else the last cue that ended (gap hold),
 * else the full line.
 */
export const captionDisplayAtTime = (
  cues: BoardCaptionCue[],
  time: number,
  speakerName: string,
  fullCaption: string,
): string => {
  if (cues.length === 0) return fullCaption;
  const active = captionAtTime(cues, time);
  if (active) return formatBoardCaption(speakerName, active.text);
  let held: BoardCaptionCue | undefined;
  for (const cue of cues) {
    if (cue.end <= time) held = cue;
    else break;
  }
  if (held) return formatBoardCaption(speakerName, held.text);
  return fullCaption;
};

export const loadVttCues = async (
  baseUrl: string,
  audioPath: string,
): Promise<BoardCaptionCue[]> => {
  const url = resolveAssetUrl(baseUrl, vttPathForAudio(audioPath));
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const body = await response.text();
    const cues = parseVtt(body);
    return cues.length > 0 ? cues : [];
  } catch {
    return [];
  }
};
