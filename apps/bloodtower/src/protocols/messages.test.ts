import { describe, expect, it } from "vitest";
import { controlPressSchema } from "./control.ts";
import {
  actMessageSchema,
  boardViewMessageSchema,
  clientMessageSchema,
  envelopeSchema,
  PROTOCOL_VERSION,
  serverMessageSchema,
} from "./v2/index.ts";

describe("protocol v2 host switch-over", () => {
  it("uses protocol version 2 on the wire", () => {
    expect(PROTOCOL_VERSION).toBe(2);
  });

  it("parses act and boardView envelopes", () => {
    const act = {
      v: 2,
      type: "act",
      payload: { promptId: "continue-begin", actionId: "continue", args: {} },
    };
    expect(clientMessageSchema.safeParse(act).success).toBe(true);
    const board = {
      v: 2,
      type: "boardView",
      payload: {
        screen: "tower-choice",
        levels: [
          {
            id: "tower-choice",
            label: "Tower",
            shows: "Wake the tower, or play tonight without it?",
          },
        ],
        heroes: [],
        narration: null,
        actions: [],
      },
    };
    expect(serverMessageSchema.safeParse(board).success).toBe(true);
    expect(envelopeSchema.safeParse({ ...act, v: 1 }).success).toBe(false);
  });

  it("keeps control press rows for the event log", () => {
    expect(
      controlPressSchema.safeParse({
        promptId: "continue-begin",
        action: "continue",
        deviceId: "device-1",
        atMonoMs: 0,
        atWall: "2026-10-23T00:00:00.000Z",
        winner: true,
        screen: "begin",
        nextScreen: "play",
      }).success,
    ).toBe(true);
  });
});
