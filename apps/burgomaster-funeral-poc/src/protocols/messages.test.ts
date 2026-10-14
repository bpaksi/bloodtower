import { describe, expect, it } from "vitest";
import {
  CLIENT_MESSAGE_TYPES,
  clientMessageSchema,
  cueMessagePayloadSchema,
  dashboardEventPayloadSchema,
  dashboardStatePayloadSchema,
  deviceStatePayloadSchema,
  envelopeSchema,
  errorPayloadSchema,
  forewarnedCardPayloadSchema,
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
  paused: [] as { hunter: string; pausedMs: number | null }[],
  devices: [] as {
    deviceId: string;
    formFactor: "ipad" | "phone";
    connected: boolean;
    heldHunters: string[];
  }[],
  join: { code: "4821", url: "http://127.0.0.1:4767/join" },
  battle: null,
  lidChoice: null,
  fightResult: null,
  summary: null,
  gate: { canBegin: false, unheld: ["agnes", "tomas", "wren", "emeric"] },
  stage: "door" as const,
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
      "spendHolyWater",
      "skullDone",
      "reassign",
      "endSession",
      "investigationPick",
      "investigationContinue",
      "forewarnedChoice",
      "forewarnedCard",
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
          momentId: null,
          capability: "screen fade",
          status: "Library",
          result: "fallback",
          reason: "no_tower",
        },
      }).type,
    ).toBe("cue_fired");
  });

  it("restores a held hunter without inventing a private moment", () => {
    const view = {
      hunter: "wren",
      corruption: 0,
      carriedItems: STARTING_CARRIED_ITEMS.wren,
      statusLine: "Choose one card.",
      pendingChoice: { kind: "investigation" as const, actions: ["examine-body" as const] },
      privateMoment: null,
      endLine: null,
      funRating: null,
    };
    expect(
      deviceStatePayloadSchema.parse({ heldHunters: ["wren"], views: [view] }).views,
    ).toHaveLength(1);
    expect(
      deviceStatePayloadSchema.safeParse({
        heldHunters: ["wren"],
        views: [
          {
            ...view,
            privateMoment: { momentId: `${SCENE_ID}.investigate`, text: "Not a finding." },
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      deviceStatePayloadSchema.safeParse({ heldHunters: ["agnes"], views: [view] }).success,
    ).toBe(false);
  });

  it("names every hunter who has no connected holder", () => {
    expect(
      dashboardStatePayloadSchema.parse({
        ...dashboardState,
        paused: [
          { hunter: "wren", pausedMs: null },
          { hunter: "tomas", pausedMs: null },
        ],
        devices: [
          {
            deviceId: "pad-1",
            formFactor: "ipad",
            connected: false,
            heldHunters: ["wren", "tomas"],
          },
          {
            deviceId: "pad-2",
            formFactor: "ipad",
            connected: true,
            heldHunters: ["agnes", "emeric"],
          },
        ],
      }).paused,
    ).toHaveLength(2);
    expect(
      dashboardStatePayloadSchema.safeParse({
        ...dashboardState,
        paused: [{ hunter: "agnes", pausedMs: null }],
        devices: [
          { deviceId: "pad-2", formFactor: "ipad", connected: true, heldHunters: ["agnes"] },
        ],
      }).success,
    ).toBe(false);
  });

  it("accepts the Forewarned card and a holy-water spend from the host", () => {
    expect(
      clientMessageSchema.parse(
        envelope("forewarnedCard", { hunter: "agnes", card: "The crypt door" }),
      ).type,
    ).toBe("forewarnedCard");
    expect(forewarnedCardPayloadSchema.safeParse({ hunter: "agnes", card: "" }).success).toBe(
      false,
    );
    expect(
      clientMessageSchema.parse(envelope("spendHolyWater", { hunter: "agnes", purpose: "price" }))
        .type,
    ).toBe("spendHolyWater");
    expect(
      helloPayloadSchema.parse({
        role: "device",
        clientLabel: "iPad",
        formFactor: "ipad",
        joinCode: "4821",
      }).joinCode,
    ).toBe("4821");
  });

  it("keeps a private moment id out of an error payload", () => {
    expect(
      errorPayloadSchema.safeParse({
        code: "private-on-dashboard",
        message: `${SCENE_ID}.09.private.wren`,
      }).success,
    ).toBe(false);
    expect(
      errorPayloadSchema.parse({
        code: "private-on-dashboard",
        message: "That moment stays on the hunter's device.",
      }).code,
    ).toBe("private-on-dashboard");
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
