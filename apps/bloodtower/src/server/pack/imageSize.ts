import { closeSync, openSync, readSync } from "node:fs";

export interface ImageSize {
  width: number;
  height: number;
}

/** Reads `length` bytes at `position`, or fewer at the end of the file. */
const readAt = (fd: number, position: number, length: number): Buffer => {
  const buffer = Buffer.alloc(length);
  const read = readSync(fd, buffer, 0, length, position);
  return buffer.subarray(0, read);
};

const pngSize = (head: Buffer): ImageSize | undefined => {
  // 8-byte signature, then the IHDR chunk: length, "IHDR", width, height.
  if (head.length < 24 || head.toString("latin1", 12, 16) !== "IHDR") return undefined;
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
};

const webpSize = (head: Buffer): ImageSize | undefined => {
  if (head.length < 30) return undefined;
  const chunk = head.toString("latin1", 12, 16);
  if (chunk === "VP8X") {
    return { width: head.readUIntLE(24, 3) + 1, height: head.readUIntLE(27, 3) + 1 };
  }
  if (chunk === "VP8L") {
    if (head[20] !== 0x2f) return undefined;
    const bits = head.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 ") {
    if (head[23] !== 0x9d || head[24] !== 0x01 || head[25] !== 0x2a) return undefined;
    return { width: head.readUInt16LE(26) & 0x3fff, height: head.readUInt16LE(28) & 0x3fff };
  }
  return undefined;
};

/** Frame markers that carry the size. C4 (DHT), C8 (JPG) and CC (DAC) share the range but do not. */
const isJpegFrame = (marker: number) =>
  marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

const jpegSize = (fd: number): ImageSize | undefined => {
  let position = 2;
  // Walks the segment headers, so a large EXIF block is skipped without being read.
  for (let step = 0; step < 512; step += 1) {
    const head = readAt(fd, position, 4);
    if (head.length < 4 || head[0] !== 0xff) return undefined;
    const marker = head[1] ?? 0;
    if (marker === 0xff) {
      position += 1;
      continue;
    }
    // No length: standalone markers, then the compressed data, which holds no size.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      if (marker === 0xd9) return undefined;
      position += 2;
      continue;
    }
    const length = head.readUInt16BE(2);
    if (isJpegFrame(marker)) {
      const frame = readAt(fd, position + 5, 4);
      if (frame.length < 4) return undefined;
      return { width: frame.readUInt16BE(2), height: frame.readUInt16BE(0) };
    }
    if (marker === 0xda || length < 2) return undefined;
    position += 2 + length;
  }
  return undefined;
};

/**
 * Width and height from the file header, by the file's own signature rather than its extension.
 * Handles PNG, JPEG and WebP (the formats the loader accepts). Undefined when the header is not
 * one of those or is cut short. EXIF orientation is not applied.
 */
export const readImageSize = (file: string): ImageSize | undefined => {
  let fd: number;
  try {
    fd = openSync(file, "r");
  } catch {
    return undefined;
  }
  try {
    const head = readAt(fd, 0, 32);
    let size: ImageSize | undefined;
    if (head.length >= 8 && head.toString("latin1", 1, 4) === "PNG") size = pngSize(head);
    else if (head[0] === 0xff && head[1] === 0xd8) size = jpegSize(fd);
    else if (
      head.toString("latin1", 0, 4) === "RIFF" &&
      head.toString("latin1", 8, 12) === "WEBP"
    ) {
      size = webpSize(head);
    }
    return size && size.width > 0 && size.height > 0 ? size : undefined;
  } catch {
    return undefined;
  } finally {
    closeSync(fd);
  }
};

/** Within 0.5% of 16:9, so 1366x768 (1.7786) passes and 1.7 or 4:3 does not. */
export const STILL_ASPECT_TOLERANCE = 0.005;

export const isSixteenByNine = ({ width, height }: ImageSize): boolean =>
  Math.abs(width / height / (16 / 9) - 1) <= STILL_ASPECT_TOLERANCE;
