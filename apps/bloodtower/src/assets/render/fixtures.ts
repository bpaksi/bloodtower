import { crc32, deflateSync } from "node:zlib";

const chunk = (type: string, data: Buffer): Buffer => {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, tail]);
};

/** A small generated RGB PNG (a gradient): fixture art, never copyrighted material. */
export const gradientPng = (width = 64, height = 36): Buffer => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(2, 9); // RGB
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x++) {
      row[1 + x * 3] = Math.round((x / width) * 255);
      row[2 + x * 3] = Math.round((y / height) * 255);
      row[3 + x * 3] = 90;
    }
    rows.push(row);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

/** Cast with one voiced speaker and no portraits wanted: the Loremaster, audio only. */
export const RENDER_CAST = `- id: narrator
  name: "Loremaster"
  voice: {provider: gemini-tts, name: Charon, style: "slow"}
`;

/** Two voiced lines. */
export const RENDER_SCRIPT = `- id: "fixture.01"
  lines:
    - {id: "fixture.01.vo-01", speaker: narrator, text: "The roads are clear."}
    - {id: "fixture.01.vo-02", speaker: narrator, text: "A seal breaks."}
`;

/** A line far over asset-studio's 20 s limit: it fails with AS-VOICE-5 and nothing else. */
export const TOO_LONG_SCRIPT = `- id: "fixture.01"
  lines:
    - {id: "fixture.01.vo-01", speaker: narrator, text: "The roads are clear."}
    - {id: "fixture.01.vo-02", speaker: narrator, text: "${"The long road winds on and on. ".repeat(40).trim()}"}
`;
