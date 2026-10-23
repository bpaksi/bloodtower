import { describe, expect, it } from "vitest";
import {
  actMessageV2Schema,
  boardViewSchema,
  CLIENT_MESSAGE_V2_TYPES,
  clientMessageV2Schema,
  deviceViewSchema,
  envelopeV2Schema,
  errorMessageV2Schema,
  helloMessageV2Schema,
  logMessageV2Schema,
  narrationEndedMessageV2Schema,
  offeredActionSchema,
  PROTOCOL_V2,
  SERVER_MESSAGE_V2_TYPES,
  SETUP_SCREENS,
  serverMessageV2Schema,
  welcomeMessageV2Schema,
} from "./index.ts";

const envelope = (type: string, payload: unknown) => ({
  v: PROTOCOL_V2,
  type,
  payload,
});

const board = {
  screen: "pick-story" as const,
  levels: [{ loopId: "session", phase: "body" as const, shows: "Pick a story" }],
  heroes: [
    { id: "hero-a", name: "Hero A", held: true },
    { id: "hero-b", name: "Hero B", held: false },
  ],
  narration: { id: "landing.01", text: "Each hero keeps a private thought." },
};

const device = {
  screen: "claim-heroes" as const,
  deviceId: "pad-a",
  levels: board.levels,
  roster: board.heroes,
  heroes: [
    {
      id: "hero-a",
      name: "Hero A",
      privateLines: [{ id: "claim.01.private.hero-a", text: "Only Hero A hears this." }],
    },
  ],
  narration: { id: "landing.01", text: "See ipad:hero-a on this device only." },
  actions: [
    { promptId: "continue-claim-heroes", actionId: "continue", label: "Continue", open: true },
    {
      promptId: "back-claim-heroes",
      actionId: "back",
      label: "Back",
      open: false,
      reason: "Claim a hero first.",
    },
  ],
};

describe("v2 envelope", () => {
  it("requires v 2 and rejects an extra key such as bytes", () => {
    const hello = envelope("hello", {
      role: "storyboard",
      clientLabel: "Mac",
      formFactor: "mac",
    });
    expect(envelopeV2Schema.parse(hello)).toEqual(hello);
    expect(envelopeV2Schema.safeParse({ ...hello, v: 1 }).success).toBe(false);
    expect(envelopeV2Schema.safeParse({ ...hello, bytes: "0a0b" }).success).toBe(false);
    expect(helloMessageV2Schema.safeParse({ ...hello, v: 1 }).success).toBe(false);
  });
});

describe("v2 messages", () => {
  it("lists hello, act, narration-ended and log, and the server views", () => {
    expect(CLIENT_MESSAGE_V2_TYPES).toEqual(["hello", "act", "narration-ended", "log"]);
    expect(SERVER_MESSAGE_V2_TYPES).toEqual(["welcome", "error", "boardView", "deviceView"]);
    expect(CLIENT_MESSAGE_V2_TYPES).not.toContain("command");
    expect(CLIENT_MESSAGE_V2_TYPES).not.toContain("control");
  });

  it("accepts hello, welcome and error on v 2", () => {
    expect(
      helloMessageV2Schema.parse(
        envelope("hello", {
          role: "device",
          clientLabel: "Pad",
          formFactor: "ipad",
          joinCode: "048213",
        }),
      ).v,
    ).toBe(2);
    expect(
      helloMessageV2Schema.safeParse(
        envelope("hello", {
          role: "storyboard",
          clientLabel: "Mac",
          formFactor: "mac",
          token: "a".repeat(16),
        }),
      ).success,
    ).toBe(false);
    const welcome = envelope("welcome", {
      clientId: "board-1",
      role: "storyboard",
      token: "a".repeat(16),
      channels: ["storyboard"],
      versions: { protocol: 2, server: "0.0.0", node: "v22" },
    });
    expect(welcomeMessageV2Schema.parse(welcome).payload.versions.protocol).toBe(2);
    expect(
      welcomeMessageV2Schema.safeParse(
        envelope("welcome", {
          clientId: "pad-1",
          role: "device",
          token: "b".repeat(16),
          channels: ["storyboard"],
          versions: { protocol: 2, server: "0.0.0", node: "v22" },
        }),
      ).success,
    ).toBe(false);
    expect(
      welcomeMessageV2Schema.parse(
        envelope("welcome", {
          clientId: "pad-1",
          role: "device",
          token: "b".repeat(16),
          channels: ["ipad:hero-a"],
          versions: { protocol: 2, server: "0.0.0", node: "v22" },
        }),
      ).payload.channels,
    ).toEqual(["ipad:hero-a"]);
    expect(
      welcomeMessageV2Schema.parse(
        envelope("welcome", {
          clientId: "pad-1",
          role: "device",
          token: "b".repeat(16),
          channels: [],
          versions: { protocol: 2, server: "0.0.0", node: "v22" },
        }),
      ).payload.channels,
    ).toEqual([]);
    expect(
      errorMessageV2Schema.parse(
        envelope("error", { code: "invalid-payload", message: "That act is not valid." }),
      ).type,
    ).toBe("error");
  });

  it("accepts act with args and refuses a tower-command key", () => {
    const act = (args: unknown) =>
      actMessageV2Schema.safeParse(
        envelope("act", { promptId: "continue-pick-story", actionId: "continue", args }),
      ).success;
    expect(act({})).toBe(true);
    expect(act({ story: "test", count: 2, flags: [true, null] })).toBe(true);
    expect(act({ bytes: "0a0b" })).toBe(false);
    expect(act({ raw: "0a0b" })).toBe(false);
    expect(act({ packet: "0a0b" })).toBe(false);
    expect(act({ capabilityId: "sound.play" })).toBe(false);
    expect(act({ params: "on" })).toBe(false);
    expect(act({ nested: { capabilityId: "sound.play" } })).toBe(false);
    expect(clientMessageV2Schema.safeParse(envelope("command", {})).success).toBe(false);
  });

  it("accepts narration-ended for a public line and refuses a private id", () => {
    expect(
      narrationEndedMessageV2Schema.parse(
        envelope("narration-ended", { narrationId: "landing.01", line: 0 }),
      ).payload.line,
    ).toBe(0);
    expect(
      narrationEndedMessageV2Schema.safeParse(
        envelope("narration-ended", { narrationId: "claim.01.private.hero-a", line: 0 }),
      ).success,
    ).toBe(false);
    expect(
      narrationEndedMessageV2Schema.safeParse(
        envelope("narration-ended", { narrationId: "ipad:hero-a", line: 0 }),
      ).success,
    ).toBe(false);
  });

  it("accepts a page log and refuses raw bytes", () => {
    const payload = {
      level: "error" as const,
      source: "board" as const,
      device: null,
      session: null,
      screen: "splash",
      code: "page-error",
      message: "The page hit an error.",
    };
    expect(logMessageV2Schema.parse(envelope("log", payload)).v).toBe(2);
    expect(
      logMessageV2Schema.safeParse(envelope("log", { ...payload, bytes: "0a0b" })).success,
    ).toBe(false);
  });
});

describe("board view", () => {
  it("names the setup screens from spec §3.1", () => {
    expect([...SETUP_SCREENS]).toEqual([
      "splash",
      "landing",
      "sound",
      "tower-connect",
      "volume-test",
      "pick-game",
      "pick-story",
      "game-settings",
      "claim-heroes",
      "seals-and-skulls",
    ]);
  });

  it("accepts a public view, including the word private", () => {
    expect(boardViewSchema.parse(board).narration?.text).toContain("private");
    expect(
      boardViewSchema.parse({
        ...board,
        narration: { id: "landing.01", text: "No bytes were sent." },
      }).narration?.text,
    ).toBe("No bytes were sent.");
    expect(boardViewSchema.parse({ ...board, narration: null }).narration).toBeNull();
    expect(
      boardViewSchema.parse({
        ...board,
        levels: [{ loopId: "session", phase: "body", shows: "The ipad waits" }],
      }).levels[0]?.shows,
    ).toBe("The ipad waits");
  });

  it("refuses a private id, an ipad target and the tower-command keys", () => {
    const refused = (value: unknown) => {
      const parsed = boardViewSchema.safeParse(value);
      expect(parsed.success).toBe(false);
    };
    refused({
      ...board,
      narration: { id: "claim.01.private.hero-a", text: "Only Hero A hears this." },
    });
    refused({ ...board, narration: { id: "landing.01", text: "ipad:hero-a" } });
    refused({ ...board, levels: [{ loopId: "session", phase: "body", shows: "ipad:hero-a" }] });
    for (const key of ["privateMoment", "bytes", "raw", "packet", "capabilityId", "params"]) {
      refused({ ...board, [key]: "0a0b" });
    }
    refused({ ...board, heroes: [{ id: "hero-a", name: "Hero A", held: true, params: {} }] });
    const parsed = boardViewSchema.safeParse({
      ...board,
      narration: { id: "landing.01", text: "ipad:hero-a" },
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((item) => item.message.includes("board view"))).toBe(true);
    }
  });
});

describe("device view", () => {
  it("carries a private line and an offered action that is open or closed with a reason", () => {
    const parsed = deviceViewSchema.parse(device);
    expect(parsed.heroes[0]?.privateLines[0]?.id).toBe("claim.01.private.hero-a");
    expect(parsed.actions[0]).toEqual({
      promptId: "continue-claim-heroes",
      actionId: "continue",
      label: "Continue",
      open: true,
    });
    expect(parsed.actions[1]).toEqual({
      promptId: "back-claim-heroes",
      actionId: "back",
      label: "Back",
      open: false,
      reason: "Claim a hero first.",
    });
    expect(serverMessageV2Schema.parse(envelope("deviceView", device)).type).toBe("deviceView");
    expect(serverMessageV2Schema.parse(envelope("boardView", board)).type).toBe("boardView");
  });

  it("refuses a closed action with no reason, an open action with a reason, and raw bytes", () => {
    expect(offeredActionSchema.safeParse({ ...device.actions[1], reason: undefined }).success).toBe(
      false,
    );
    expect(offeredActionSchema.safeParse({ ...device.actions[0], reason: "extra" }).success).toBe(
      false,
    );
    expect(deviceViewSchema.safeParse({ ...device, bytes: "0a0b" }).success).toBe(false);
    expect(deviceViewSchema.safeParse({ ...device, params: {} }).success).toBe(false);
    expect(deviceViewSchema.safeParse({ ...device, capabilityId: "sound.play" }).success).toBe(
      false,
    );
  });
});
