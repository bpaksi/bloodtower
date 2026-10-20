/** Smallest files whose headers carry a size, for the pack tests. They are not decodable images. */

export const pngBytes = (width: number, height: number): Buffer => {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "latin1");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
};

/** SOI, an APP1 block of `padding` bytes (a big EXIF), a DHT, then SOF0 with the size. */
export const jpegBytes = (width: number, height: number, padding = 0): Buffer => {
  const app = Buffer.alloc(4 + padding);
  app.writeUInt16BE(0xffe1, 0);
  app.writeUInt16BE(2 + padding, 2);
  const dht = Buffer.from([0xff, 0xc4, 0x00, 0x04, 0x00, 0x00]);
  const sof = Buffer.alloc(19);
  sof.writeUInt16BE(0xffc0, 0);
  sof.writeUInt16BE(17, 2);
  sof[4] = 8;
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  sof[9] = 3;
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app, dht, sof]);
};

export const webpBytes = (
  kind: "VP8X" | "VP8L" | "VP8 ",
  width: number,
  height: number,
): Buffer => {
  const bytes = Buffer.alloc(40);
  bytes.write("RIFF", 0, "latin1");
  bytes.writeUInt32LE(32, 4);
  bytes.write("WEBP", 8, "latin1");
  bytes.write(kind, 12, "latin1");
  if (kind === "VP8X") {
    bytes.writeUIntLE(width - 1, 24, 3);
    bytes.writeUIntLE(height - 1, 27, 3);
  } else if (kind === "VP8L") {
    bytes[20] = 0x2f;
    bytes.writeUInt32LE(((height - 1) << 14) | (width - 1), 21);
  } else {
    bytes.set([0x9d, 0x01, 0x2a], 23);
    bytes.writeUInt16LE(width, 26);
    bytes.writeUInt16LE(height, 28);
  }
  return bytes;
};
