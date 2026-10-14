import { describe, expect, it } from "vitest";
import {
  CLIENT_MESSAGE_TYPES,
  clientMessageSchema,
  cueMessagePayloadSchema,
  dashboardEventPayloadSchema,
  dashboardStatePayloadSchema,
  deviceStatePayloadSchema,
  envelopeSchema,
  helloPayloadSchema,
  hostHealthSchema,
  lidChoiceMessagePayloadSchema,
  PROTOCOL_VERSION,
  privateContinuePayloadSchema,
  SCENE_ID,
  SERVER_MESSAGE_TYPES,
  STARTING_CARRIED_ITEMS,
  serverMessageSchema,
  welcomePayloadSchema,
} from "./index.ts";

const envelope = (type: string, payload: unknown) => ({
  v: PROTOCOL_VERSION,
  type,
  payload,
});

const hunter = (carried = STARTING_CARRIED_ITEMS.emeric) => ({
  corruption: null,
  holders: [] as string[],
  location: null,
  present: null,
  carriedItems: carried,
});

const dashboardState = {
  night: 2,
  hunters: {
    agnes: hunter(STARTING_CARRIED_ITEMS.agnes),
    tomas: hunter(STARTING_CARRIED_ITEMS.tomas),
    wren: hunter(STARTING_CARRIED_ITEMS.wren),
    emeric: hunter(),
  },
  skullSupply: null,
  skullDropsTonight: null,
  storyFlag: null,
  moment: null,
  paused: null,
  join: { code: "4821", url: "http://127.0.0.1:4767/join" },
  battle: null,
  lidChoice: null,
  fightResult: null,
  gate: { canBegin: false, unheld: ["agnes", "tomas", "wren", "emeric"] },
};

describe("envelope", () => {
  it("rejects a bad version, an empty type, and extra keys", () => {
    const hello = envelope("hello", { role: "dashboard", clientLabel: "Mac", formFactor: "mac" });
    expect(envelopeSchema.parse(hello)).toEqual(hello);
    expect(envelopeSchema.safeParse({ ...hello, v: 2 }).success).toBe(false);
    expect(envelopeSchema.safeParse({ ...hello, type: "" }).success).toBe(false);
    expect(envelopeSchema.safeParse({ ...hello, bytes: "0a0b" }).success).toBe(false);
  });
});

describe("client messages", () => {
  it("lists the client message types by hand", () => {
    expect(CLIENT_MESSAGE_TYPES).toEqual([
      "hello",
      "hold",
      "setPresence",
      "confirmKit",
      "start",
      "advance",
      "lidChoice",
      "fightResult",
      "costPick",
      "skullDone",
      "reassign",
      "endSession",
      "investigationPick",
      "investigationContinue",
      "forewarnedChoice",
      "privateContinue",
      "funRating",
    ]);
  });

  it("has no tower, calibrate, command or raw message", () => {
    const banned = ["command", "calibrate", "connect", "disconnect", "reconnect", "raw", "tower"];
    for (const type of [...CLIENT_MESSAGE_TYPES, ...SERVER_MESSAGE_TYPES]) {
      expect(banned.some((word) => type.toLowerCase().includes(word))).toBe(false);
    }
    expect(clientMessageSchema.safeParse(envelope("command", {})).success).toBe(false);
    expect(clientMessageSchema.safeParse(envelope("raw", { bytes: "0a0b" })).success).toBe(false);
  });

  it("accepts a dashboard hello and a device hello, and rejects a swapped form factor", () => {
    expect(
      helloPayloadSchema.parse({ role: "dashboard", clientLabel: "Mac", formFactor: "mac" }).role,
    ).toBe("dashboard");
    expect(
      clientMessageSchema.parse(
        envelope("hello", { role: "device", clientLabel: "iPad", formFactor: "ipad" }),
      ).type,
    ).toBe("hello");
    expect(
      helloPayloadSchema.safeParse({ role: "device", clientLabel: "Mac", formFactor: "mac" })
        .success,
    ).toBe(false);
    expect(
      clientMessageSchema.safeParse(
        envelope("hello", {
          role: "dashboard",
          clientLabel: "Mac",
          formFactor: "mac",
          bytes: "ff",
        }),
      ).success,
    ).toBe(false);
  });

  it("requires a stake carrier only when nailing", () => {
    expect(
      lidChoiceMessagePayloadSchema.parse({ choice: "nailed", stakeCarrier: "wren" }).stakeCarrier,
    ).toBe("wren");
    expect(
      lidChoiceMessagePayloadSchema.safeParse({ choice: "nailed", stakeCarrier: null }).success,
    ).toBe(false);
    expect(
      lidChoiceMessagePayloadSchema.safeParse({ choice: "watched", stakeCarrier: "wren" }).success,
    ).toBe(false);
  });

  it("accepts continue only for that hunter's private moment", () => {
    const momentId = `${SCENE_ID}.09.private.agnes`;
    expect(privateContinuePayloadSchema.parse({ hunter: "agnes", momentId }).hunter).toBe("agnes");
    expect(
      privateContinuePayloadSchema.safeParse({
        hunter: "agnes",
        momentId: `${SCENE_ID}.01`,
      }).success,
    ).toBe(false);
    expect(
      privateContinuePayloadSchema.safeParse({
        hunter: "tomas",
        momentId,
      }).success,
    ).toBe(false);
  });
});

describe("server messages", () => {
  const versions = { protocol: PROTOCOL_VERSION, server: "0.0.0", node: "v22.14.0" };
  const token = "device-token-1234";

  it("lists the server message types by hand", () => {
    expect(SERVER_MESSAGE_TYPES).toEqual([
      "welcome",
      "error",
      "dashboardState",
      "deviceState",
      "cue",
      "dashboardEvent",
    ]);
  });

  it("gives the dashboard only its own channel", () => {
    expect(
      welcomePayloadSchema.parse({
        clientId: "dash",
        role: "dashboard",
        token,
        channels: ["dashboard"],
        versions,
      }).channels,
    ).toEqual(["dashboard"]);
    expect(
      welcomePayloadSchema.safeParse({
        clientId: "dash",
        role: "dashboard",
        token,
        channels: ["dashboard", "ipad:agnes"],
        versions,
      }).success,
    ).toBe(false);
    expect(
      welcomePayloadSchema.safeParse({
        clientId: "pad",
        role: "device",
        token,
        channels: ["dashboard"],
        versions,
      }).success,
    ).toBe(false);
    expect(
      welcomePayloadSchema.parse({
        clientId: "pad",
        role: "device",
        token,
        channels: ["ipad:wren", "ipad:tomas"],
        versions,
      }).channels,
    ).toEqual(["ipad:wren", "ipad:tomas"]);
  });

  it("keeps a private moment out of dashboard state and off the dashboard event", () => {
    expect(dashboardStatePayloadSchema.parse(dashboardState).skullSupply).toBeNull();
    expect(
      dashboardStatePayloadSchema.safeParse({
        ...dashboardState,
        moment: { id: `${SCENE_ID}.09.private.agnes`, target: "dashboard" },
      }).success,
    ).toBe(false);
    expect(
      dashboardStatePayloadSchema.safeParse({ ...dashboardState, bytes: "0a0b" }).success,
    ).toBe(false);

    const leaked = {
      id: "e-9",
      at: "2026-10-14T20:00:00.000Z",
      type: "moment_played",
      payload: {
        momentId: `${SCENE_ID}.09.private.wren`,
        target: "ipad:wren",
        startedAt: "2026-10-14T20:00:00.000Z",
        skipped: false,
      },
    };
    expect(dashboardEventPayloadSchema.safeParse(leaked).success).toBe(false);
    expect(
      cueMessagePayloadSchema.safeParse({
        cue: "heartbeat",
        screen: { effect: "pulse", durationMs: null },
        fallbackAudio: { assetId: `${SCENE_ID}.09.private.agnes` },
      }).success,
    ).toBe(false);
    expect(
      cueMessagePayloadSchema.safeParse({
        cue: "dim-all",
        screen: { effect: "fade-near-black", durationMs: 0 },
        fallbackAudio: { assetId: null },
      }).success,
    ).toBe(false);
    expect(
      dashboardEventPayloadSchema.parse({
        id: "e-2",
        at: "2026-10-14T20:00:00.000Z",
        type: "cue_fired",
        payload: {
          cue: "dim-all",
          capability: "screen fade",
          status: "Library",
          result: "fallback",
          reason: "no_tower",
        },
      }).type,
    ).toBe("cue_fired");
  });

  it("shows a private card only to a device that holds that hunter", () => {
    const card = {
      hunter: "agnes",
      momentId: `${SCENE_ID}.09.private.agnes`,
      text: "A private line for Agnes.",
      statusLine: null,
      pendingChoice: null,
    };
    expect(
      deviceStatePayloadSchema.parse({ heldHunters: ["agnes"], cards: [card] }).cards,
    ).toHaveLength(1);
    expect(
      deviceStatePayloadSchema.safeParse({ heldHunters: ["wren"], cards: [card] }).success,
    ).toBe(false);
  });

  it("reports the host up and not using a tower", () => {
    expect(hostHealthSchema.parse({ protocol: PROTOCOL_VERSION, towerUsed: false })).toEqual({
      protocol: PROTOCOL_VERSION,
      towerUsed: false,
    });
    expect(
      hostHealthSchema.safeParse({ protocol: PROTOCOL_VERSION, towerUsed: true }).success,
    ).toBe(false);
    expect(
      hostHealthSchema.safeParse({ protocol: PROTOCOL_VERSION, towerUsed: false, bytes: "0a" })
        .success,
    ).toBe(false);
  });

  it("rejects a server message with an unknown type", () => {
    expect(
      serverMessageSchema.safeParse(envelope("tower.command", { bytes: "0a0b" })).success,
    ).toBe(false);
  });
});
