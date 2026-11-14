import { describe, expect, it } from "vitest";
import { boardViewMessageSchema, boardViewPayloadSchema, packedLineSchema } from "./index.ts";

const LINE_ID = "seal-break.01~vo-01";
const CAPTION =
  "The roads are clear, and a seal breaks like an old oath giving way. Ahead stands the Ruined Keep.";

const packedLine = {
  packId: "test",
  lineId: LINE_ID,
  caption: CAPTION,
  audio: LINE_ID,
  painting: "painting.cover",
  glow: "glow.cover",
  play: 1,
};

const board = {
  screen: "table-join" as const,
  levels: [{ id: "join", label: "Join", shows: "Code 123456" }],
  heroes: [],
  narration: null,
  actions: [],
  packedLine,
};

describe("A1-8b-2 EV-04: the board view's packed line carries only ids and text", () => {
  it("accepts the demo line with its cover and mask ids", () => {
    expect(packedLineSchema.parse(packedLine)).toEqual(packedLine);
    expect(boardViewPayloadSchema.safeParse(board).success).toBe(true);
    expect(
      boardViewMessageSchema.safeParse({ v: 2, type: "boardView", payload: board }).success,
    ).toBe(true);
  });

  it("accepts caption only: no audio, no painting, no glow", () => {
    const captionOnly = { ...packedLine, audio: null, painting: null, glow: null };
    expect(packedLineSchema.safeParse(captionOnly).success).toBe(true);
  });

  it("refuses any extra key, including a byte or data field", () => {
    for (const key of ["bytes", "raw", "data", "file", "url", "buffer", "audioData"]) {
      expect(packedLineSchema.safeParse({ ...packedLine, [key]: "AAAA" }).success, key).toBe(false);
      expect(
        boardViewPayloadSchema.safeParse({ ...board, packedLine: { ...packedLine, [key]: "AAAA" } })
          .success,
        key,
      ).toBe(false);
    }
  });

  it("refuses base64, a data URL, a path or a buffer where an id belongs", () => {
    const notIds: unknown[] = [
      "data:audio/mp4;base64,AAAAIGZ0eXBNNEEg",
      "AAAAIGZ0eXBNNEEgAAAAAE00QSBpc29t+/=",
      "assets/6171b08d.m4a",
      "../index.json",
      "/packs/test/by-id/seal-break.01~vo-01",
      { type: "Buffer", data: [0, 1, 2] },
      [0, 1, 2],
      new Uint8Array([0, 1, 2]),
    ];
    for (const field of ["lineId", "audio", "painting", "glow"] as const) {
      for (const value of notIds) {
        expect(
          packedLineSchema.safeParse({ ...packedLine, [field]: value }).success,
          `${field}: ${String(value)}`,
        ).toBe(false);
      }
    }
  });

  it("keeps the caption to text of caption length", () => {
    expect(packedLineSchema.safeParse({ ...packedLine, caption: "" }).success).toBe(false);
    expect(packedLineSchema.safeParse({ ...packedLine, caption: "A".repeat(501) }).success).toBe(
      false,
    );
    expect(
      packedLineSchema.safeParse({ ...packedLine, caption: { type: "Buffer", data: [1] } }).success,
    ).toBe(false);
  });

  it("needs a play number, so the board can tell a new play from one already heard", () => {
    const { play: _play, ...noPlay } = packedLine;
    expect(packedLineSchema.safeParse(noPlay).success).toBe(false);
    expect(packedLineSchema.safeParse({ ...packedLine, play: 0 }).success).toBe(false);
    expect(packedLineSchema.safeParse({ ...packedLine, play: 1.5 }).success).toBe(false);
  });

  it("is optional, so a view without it stays valid", () => {
    const { packedLine: _line, ...without } = board;
    expect(boardViewPayloadSchema.safeParse(without).success).toBe(true);
    expect(boardViewPayloadSchema.safeParse({ ...board, packedLine: null }).success).toBe(true);
  });
});
