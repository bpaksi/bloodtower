import { readFileSync } from "node:fs";

/**
 * Duration of a WAV file in milliseconds, from its own header.
 * A file with no rate or no data chunk throws. Zero is not used as a stand-in.
 */
export const wavDurationMs = (file: Buffer | string): number => {
  const raw = typeof file === "string" ? readFileSync(file) : file;
  if (
    raw.length < 12 ||
    raw.toString("ascii", 0, 4) !== "RIFF" ||
    raw.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error("Not a WAV file.");
  }

  let byteRate: number | undefined;
  let dataSize: number | undefined;
  let pos = 12;
  while (pos + 8 <= raw.length) {
    const id = raw.toString("ascii", pos, pos + 4);
    const size = raw.readUInt32LE(pos + 4);
    const start = pos + 8;
    if (id === "fmt ") {
      if (start + 12 > raw.length) throw new Error("WAV fmt chunk is truncated.");
      byteRate = raw.readUInt32LE(start + 8);
    } else if (id === "data") {
      dataSize = size;
      break;
    }
    const padded = size + (size % 2);
    pos = start + padded;
  }

  if (byteRate === undefined || byteRate <= 0 || dataSize === undefined) {
    throw new Error("WAV has no duration.");
  }
  return Math.round((dataSize / byteRate) * 1000);
};
