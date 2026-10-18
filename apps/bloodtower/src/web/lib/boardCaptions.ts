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
    const [startRaw, endRaw] = timing.split("-->").map((part) => part.trim());
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
