export interface WavInfo {
  channels: number;
  sampleRate: number;
  frames: number;
}

/**
 * A header-level check that a buffer is a whole 16-bit PCM RIFF/WAVE file, the only audio
 * asset-studio can splice. Returns the facts, or a reason string. It decodes nothing.
 */
export const checkWav = (bytes: Buffer): WavInfo | string => {
  if (bytes.length < 12) return "shorter than a RIFF header";
  if (bytes.toString("latin1", 0, 4) !== "RIFF" || bytes.toString("latin1", 8, 12) !== "WAVE") {
    return "not a RIFF/WAVE file";
  }
  let fmt: { channels: number; sampleRate: number; blockAlign: number } | undefined;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString("latin1", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      if (size < 16 || body + 16 > bytes.length) return "truncated fmt chunk";
      const format = bytes.readUInt16LE(body);
      const bits = bytes.readUInt16LE(body + 14);
      if (format !== 1 || bits !== 16) return `not 16-bit PCM (format ${format}, ${bits} bits)`;
      const channels = bytes.readUInt16LE(body + 2);
      const sampleRate = bytes.readUInt32LE(body + 4);
      if (channels < 1 || channels > 2 || sampleRate === 0) {
        return `bad fmt chunk (${channels} channels, ${sampleRate} Hz)`;
      }
      fmt = { channels, sampleRate, blockAlign: channels * 2 };
    } else if (id === "data") {
      if (fmt === undefined) return "data chunk before fmt chunk";
      if (body + size > bytes.length) return "truncated data chunk";
      if (size === 0) return "empty data chunk";
      if (size % fmt.blockAlign !== 0) return "data chunk is not a whole number of frames";
      return { channels: fmt.channels, sampleRate: fmt.sampleRate, frames: size / fmt.blockAlign };
    }
    offset = body + size + (size % 2);
  }
  return fmt === undefined ? "no fmt chunk" : "no data chunk";
};
