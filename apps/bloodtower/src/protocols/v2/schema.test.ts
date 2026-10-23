import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION as V1 } from "../messages.ts";
import {
  actMessageSchema,
  boardContentRefused,
  boardViewMessageSchema,
  boardViewPayloadSchema,
  CLIENT_MESSAGE_TYPES,
  clientMessageSchema,
  deviceViewPayloadSchema,
  errorMessageSchema,
  helloMessageSchema,
  logMessageSchema,
  narrationEndedMessageSchema,
  offeredActionSchema,
  PROTOCOL_VERSION,
  SERVER_MESSAGE_TYPES,
  serverMessageSchema,
  welcomeMessageSchema,
} from "./index.ts";

const level = {
  id: "pick-story",
  label: "Pick story",
  shows: "Each hero has a private thought.",
};

const openAction = {
  promptId: "continue-pick-story",
  actionId: "continue",
  label: "Continue",
  open: true as const,
};

const closedAction = {
  promptId: "back-pick-story",
  actionId: "back",
  label: "Back",
  open: false as const,
  reason: "Nothing to undo yet.",
};

const board = {
  screen: "pick-story" as const,
  levels: [level],
  heroes: [
    { id: "alpha", name: "Alpha", held: true },
    { id: "beta", name: "Beta", held: false },
  ],
  narration: { lineId: "pick-story.line", text: "The table hears this." },
  actions: [openAction, closedAction],
};

const envelope = <T extends string>(type: T, payload: unknown, v: 1 | 2 = 2) => ({
  v,
  type,
  payload,
});

describe("protocol v2 envelope", () => {
  it("uses v: 2 and leaves v1 at 1", () => {
    expect(PROTOCOL_VERSION).toBe(2);
    expect(V1).toBe(1);
    expect(CLIENT_MESSAGE_TYPES).toEqual(["hello", "act", "narration-ended", "log"]);
    expect(SERVER_MESSAGE_TYPES).toEqual(["welcome", "error", "boardView", "deviceView"]);
  });

  it("rejects a v1 envelope, an unknown type, and an extra key", () => {
    expect(boardViewMessageSchema.safeParse(envelope("boardView", board, 1)).success).toBe(false);
    expect(clientMessageSchema.safeParse(envelope("control", { promptId: "p" })).success).toBe(
      false,
    );
    expect(serverMessageSchema.safeParse(envelope("storyboardState", board)).success).toBe(false);
    expect(
      boardViewMessageSchema.safeParse({ ...envelope("boardView", board), bytes: "00" }).success,
    ).toBe(false);
  });
});

describe("offered actions", () => {
  it("requires a prompt id, an action id, a label, and open or a closed reason", () => {
    expect(offeredActionSchema.parse(openAction)).toEqual(openAction);
    expect(offeredActionSchema.parse(closedAction)).toEqual(closedAction);
    expect(offeredActionSchema.safeParse({ ...openAction, reason: "no" }).success).toBe(false);
    expect(offeredActionSchema.safeParse({ ...closedAction, reason: undefined }).success).toBe(
      false,
    );
    expect(offeredActionSchema.safeParse({ ...openAction, label: "" }).success).toBe(false);
    expect(offeredActionSchema.safeParse({ ...openAction, promptId: "" }).success).toBe(false);
    expect(offeredActionSchema.safeParse({ ...openAction, actionId: "Continue" }).success).toBe(
      false,
    );
  });
});

describe("client messages", () => {
  it("accepts hello, act, narration-ended and log", () => {
    expect(
      helloMessageSchema.parse(
        envelope("hello", { role: "storyboard", clientLabel: "tv", formFactor: "mac" }),
      ).payload.role,
    ).toBe("storyboard");
    expect(
      helloMessageSchema.safeParse(
        envelope("hello", {
          role: "device",
          clientLabel: "pad",
          formFactor: "ipad",
          joinCode: "123456",
        }),
      ).success,
    ).toBe(true);
    expect(
      helloMessageSchema.safeParse(
        envelope("hello", { role: "device", clientLabel: "pad", formFactor: "ipad" }),
      ).success,
    ).toBe(false);

    const act = actMessageSchema.parse(
      envelope("act", {
        promptId: "continue-pick-story",
        actionId: "continue",
        args: { option: "leave" },
      }),
    );
    expect(act.payload.args).toEqual({ option: "leave" });
    expect(
      actMessageSchema.parse(
        envelope("act", { promptId: "continue-pick-story", actionId: "continue", args: {} }),
      ).payload.args,
    ).toEqual({});
    expect(act.v).toBe(2);

    expect(
      narrationEndedMessageSchema.parse(envelope("narration-ended", { lineId: "pick-story.line" }))
        .payload.lineId,
    ).toBe("pick-story.line");

    expect(
      logMessageSchema.parse(
        envelope("log", {
          level: "error",
          source: "board",
          device: null,
          session: null,
          screen: "pick-story",
          code: "render-failed",
          message: "The mists close in.",
        }),
      ).type,
    ).toBe("log");
  });

  it("refuses tower-command keys on act and extra fields on log", () => {
    for (const args of [
      { bytes: "00" },
      { raw: "00" },
      { packet: "00" },
      { capabilityId: "lights.on" },
      { params: { on: true } },
      { choice: { params: {} } },
    ]) {
      expect(
        actMessageSchema.safeParse(
          envelope("act", { promptId: "continue-pick-story", actionId: "continue", args }),
        ).success,
        JSON.stringify(args),
      ).toBe(false);
    }
    expect(
      logMessageSchema.safeParse(
        envelope("log", {
          level: "error",
          source: "device",
          device: "device-a",
          session: null,
          screen: null,
          code: "render-failed",
          message: "Broken.",
          bytes: "00",
        }),
      ).success,
    ).toBe(false);
    expect(
      narrationEndedMessageSchema.safeParse(
        envelope("narration-ended", { lineId: "pick-story.private.alpha" }),
      ).success,
    ).toBe(false);
  });
});

describe("server messages", () => {
  it("welcomes the board and a device, and refuses a private error", () => {
    const versions = { protocol: 2 as const, server: "0.0.0", node: "22.13.0" };
    expect(
      welcomeMessageSchema.parse(
        envelope("welcome", {
          clientId: "board-1",
          role: "storyboard",
          token: "storyboard-token1",
          channels: ["storyboard"],
          versions,
        }),
      ).payload.channels,
    ).toEqual(["storyboard"]);
    expect(
      welcomeMessageSchema.parse(
        envelope("welcome", {
          clientId: "device-a",
          role: "device",
          token: "device-token-1234",
          channels: ["ipad:alpha"],
          versions,
        }),
      ).payload.channels,
    ).toEqual(["ipad:alpha"]);
    expect(
      welcomeMessageSchema.safeParse(
        envelope("welcome", {
          clientId: "device-a",
          role: "device",
          token: "device-token-1234",
          channels: ["storyboard"],
          versions,
        }),
      ).success,
    ).toBe(false);
    expect(
      errorMessageSchema.safeParse(
        envelope("error", { code: "private-on-storyboard", message: "Saw ipad:alpha" }),
      ).success,
    ).toBe(false);
    expect(
      errorMessageSchema.parse(
        envelope("error", { code: "invalid-payload", message: "That press does not fit." }),
      ).payload.code,
    ).toBe("invalid-payload");
  });
});

describe("board view refusals", () => {
  it("allows the word private and refuses a .private. id, an ipad: string, and the forbidden keys", () => {
    const parsed = boardViewPayloadSchema.parse(board);
    expect(parsed.levels[0]?.shows).toContain("private");
    expect(boardContentRefused(parsed)).toBe(false);

    expect(
      boardViewPayloadSchema.safeParse({
        ...board,
        narration: { lineId: "pick-story.private.alpha", text: "Only Alpha hears this." },
      }).success,
    ).toBe(false);
    expect(
      boardViewPayloadSchema.safeParse({
        ...board,
        levels: [{ ...level, label: "ipad:alpha" }],
      }).success,
    ).toBe(false);
    expect(boardContentRefused({ note: "ipad:alpha" })).toBe(true);
    expect(boardContentRefused({ nested: [{ bytes: "00" }] })).toBe(true);

    for (const key of ["privateMoment", "bytes", "raw", "packet", "capabilityId", "params"]) {
      expect(boardViewPayloadSchema.safeParse({ ...board, [key]: "x" }).success, key).toBe(false);
      expect(
        boardViewPayloadSchema.safeParse({
          ...board,
          heroes: [{ id: "alpha", name: "Alpha", held: true, [key]: "x" }],
        }).success,
        `nested ${key}`,
      ).toBe(false);
    }
  });

  it("wraps the payload in a strict boardView message", () => {
    const message = boardViewMessageSchema.parse(envelope("boardView", board));
    expect(message).toMatchObject({ v: 2, type: "boardView" });
  });
});

describe("device view", () => {
  it("accepts a hero's own private line and refuses a mismatched one", () => {
    const view = deviceViewPayloadSchema.parse({
      deviceId: "device-a",
      screen: "claim-heroes",
      shows: "Claim a hero.",
      heroes: [
        {
          id: "alpha",
          name: "Alpha",
          lines: [{ id: "claim-heroes.private.alpha", text: "Alpha secret" }],
        },
      ],
      actions: [openAction],
    });
    expect(view.heroes[0]?.lines[0]?.text).toBe("Alpha secret");
    expect(
      deviceViewPayloadSchema.safeParse({
        ...view,
        heroes: [
          {
            id: "alpha",
            name: "Alpha",
            lines: [{ id: "claim-heroes.private.beta", text: "Beta secret" }],
          },
        ],
      }).success,
    ).toBe(false);
    expect(deviceViewPayloadSchema.safeParse({ ...view, bytes: "00" }).success).toBe(false);
  });
});
