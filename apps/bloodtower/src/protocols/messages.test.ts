import { describe, expect, it } from "vitest";
import {
  CLIENT_MESSAGE_TYPES,
  CONTROL_ACTIONS,
  clientMessageSchema,
  containsPrivateChannel,
  controlMessageSchema,
  controlPressSchema,
  deviceRecordSchema,
  envelopeSchema,
  type FlowScreen,
  helloPayloadSchema,
  holdPayloadSchema,
  hostHealthSchema,
  keeperLineEndedMessageSchema,
  PROTOCOL_VERSION,
  SERVER_MESSAGE_TYPES,
  type StoryboardState,
  serverMessageSchema,
  storiesSchema,
  storyboardStatePayloadSchema,
  towerBatterySchema,
} from "./index.ts";

const envelope = (type: string, payload: unknown) => ({
  v: PROTOCOL_VERSION,
  type,
  payload,
});

const tower = {
  connection: "unavailable" as const,
  battery: { state: "unavailable" as const },
  calibrated: { state: "unavailable" as const },
};

const board = {
  screen: "tower-connect" as const,
  stage: "lobby" as const,
  hunters: [
    { id: "alpha", name: "Alpha", holders: [] as string[], disconnected: false },
    { id: "beta", name: "Beta", holders: ["device-1"], disconnected: false },
  ],
  join: {
    code: "048213",
    url: "http://127.0.0.1:4787/join?code=048213",
    reachable: false,
  },
  prompt: { id: "hold-all", label: "Waiting on Alpha" },
  moment: null,
  pause: null,
  tower,
  gate: { canBegin: false, unheld: ["alpha"] },
  lock: null,
};

describe("envelope", () => {
  it("rejects a bad version, an empty type and extra keys such as bytes", () => {
    const hello = envelope("hello", {
      role: "storyboard",
      clientLabel: "Mac",
      formFactor: "mac",
    });
    expect(envelopeSchema.parse(hello)).toEqual(hello);
    expect(envelopeSchema.safeParse({ ...hello, v: 2 }).success).toBe(false);
    expect(envelopeSchema.safeParse({ ...hello, type: "" }).success).toBe(false);
    expect(envelopeSchema.safeParse({ ...hello, bytes: "0a0b" }).success).toBe(false);
  });
});

describe("client messages", () => {
  it("lists hello, hold, control, the story highlight and the Keeper line report, and not a tower command", () => {
    expect(CLIENT_MESSAGE_TYPES).toEqual([
      "hello",
      "hold",
      "control",
      "focus-story",
      "keeper-line-ended",
    ]);
    expect(CLIENT_MESSAGE_TYPES).not.toContain("command");
    expect(CONTROL_ACTIONS).toEqual([
      "begin",
      "continue",
      "pause",
      "resume",
      "quit",
      "tower-connect",
      "tower-calibrate",
      "pick",
    ]);
  });

  it("requires a pick to name its option, and refuses an option on any other action", () => {
    const control = (payload: unknown) =>
      controlMessageSchema.safeParse({ v: 1, type: "control", payload }).success;
    expect(control({ promptId: "pick-6", action: "pick", option: "force-it" })).toBe(true);
    expect(control({ promptId: "pick-6", action: "pick" })).toBe(false);
    expect(control({ promptId: "continue-0", action: "continue", option: "force-it" })).toBe(false);
  });

  it("moves the story highlight with a story id and nothing else", () => {
    const focus = (payload: unknown) =>
      clientMessageSchema.safeParse({ v: 1, type: "focus-story", payload }).success;
    expect(focus({ story: "dracula" })).toBe(true);
    expect(focus({ story: "Not An Id" })).toBe(false);
    expect(focus({})).toBe(false);
    expect(focus({ story: "dracula", bytes: "0a" })).toBe(false);
  });

  it("lists each story once and keeps focus and current inside the list", () => {
    const card = (id: string, loadable = true) => ({
      id,
      title: id,
      blurb: null,
      players: { min: 1, max: 4 },
      loadable,
    });
    const parse = (value: unknown) => storiesSchema.safeParse(value).success;
    expect(parse({ cards: [card("alpha"), card("beta")], focus: "beta", current: "alpha" })).toBe(
      true,
    );
    expect(parse({ cards: [card("alpha"), card("alpha")], focus: "alpha", current: "alpha" })).toBe(
      false,
    );
    expect(parse({ cards: [card("alpha")], focus: "beta", current: "alpha" })).toBe(false);
    expect(parse({ cards: [card("alpha")], focus: "alpha", current: "beta" })).toBe(false);
    // The bound story always loaded, so it is never a greyed card.
    expect(parse({ cards: [card("alpha", false)], focus: "alpha", current: "alpha" })).toBe(false);
  });

  it("accepts the Keeper line report only with a moment id and a line index", () => {
    const report = (payload: unknown) =>
      keeperLineEndedMessageSchema.safeParse({ v: 1, type: "keeper-line-ended", payload }).success;
    expect(report({ momentId: "grey-stair.03", line: 2 })).toBe(true);
    expect(report({ momentId: "grey-stair.03", line: 3 })).toBe(false);
    expect(report({ momentId: "grey-stair.03", line: 0, extra: true })).toBe(false);
  });

  it("joins a device with a code and refuses a mac as a player", () => {
    expect(
      helloPayloadSchema.parse({
        role: "device",
        clientLabel: "iPad",
        formFactor: "ipad",
        joinCode: "048213",
      }).role,
    ).toBe("device");
    expect(
      helloPayloadSchema.safeParse({
        role: "storyboard",
        clientLabel: "iPad",
        formFactor: "ipad",
      }).success,
    ).toBe(false);
    expect(
      helloPayloadSchema.safeParse({
        role: "device",
        clientLabel: "phone",
        formFactor: "phone",
      }).success,
    ).toBe(false);
    expect(
      clientMessageSchema.safeParse(envelope("control", { promptId: "p1", action: "command" }))
        .success,
    ).toBe(false);
  });

  it("does not accept a storyboard actor on a hold", () => {
    expect(holdPayloadSchema.parse({ hunter: "alpha", action: "take" }).action).toBe("take");
    expect(
      holdPayloadSchema.safeParse({ hunter: "alpha", action: "take", by: "storyboard" }).success,
    ).toBe(false);
  });

  it("records a winning press and a losing press with device, time and screen", () => {
    const press = {
      promptId: "continue-1",
      action: "continue" as const,
      deviceId: "device-1",
      atMonoMs: 40,
      atWall: "2026-10-15T17:00:00.000Z",
      winner: true,
      screen: "play" as const,
      nextScreen: null,
    };
    expect(controlPressSchema.parse(press).winner).toBe(true);
    expect(controlPressSchema.parse({ ...press, deviceId: "device-2", winner: false }).winner).toBe(
      false,
    );
  });

  it("records the screen a winning press moved the flow to, and accepts a press from before the flow state", () => {
    const press = {
      promptId: "continue-tower-connect",
      action: "continue" as const,
      deviceId: "device-1",
      atMonoMs: 40,
      atWall: "2026-10-15T17:00:00.000Z",
      winner: true,
      screen: "tower-connect" as const,
      nextScreen: "pick-story" as const,
    };
    expect(controlPressSchema.parse(press)).toMatchObject({
      screen: "tower-connect",
      nextScreen: "pick-story",
    });
    expect(
      controlPressSchema.parse({ ...press, screen: null, nextScreen: null }).screen,
    ).toBeNull();
    expect(controlPressSchema.safeParse({ ...press, screen: "lobby" }).success).toBe(false);
    expect(controlPressSchema.parse({ ...press, action: "quit" }).action).toBe("quit");
  });
});

describe("story board state", () => {
  it("shows unavailable tower values without coercing them to zero", () => {
    expect(storyboardStatePayloadSchema.parse(board).tower.battery).toEqual({
      state: "unavailable",
    });
    expect(towerBatterySchema.parse({ state: "known", percent: 0 })).toEqual({
      state: "known",
      percent: 0,
    });
    expect(towerBatterySchema.safeParse({ state: "unavailable", percent: 0 }).success).toBe(false);
    expect(
      hostHealthSchema.parse({ protocol: 1, tower: "connection-only", effects: "none" }),
    ).toEqual({
      protocol: 1,
      tower: "connection-only",
      effects: "none",
    });
  });

  it("refuses a private moment, an ipad target and a tower command on the story board", () => {
    expect(
      storyboardStatePayloadSchema.safeParse({
        ...board,
        moment: {
          id: "proving-ground.02.private.alpha",
          kind: "text-card",
          text: "Only Alpha hears this.",
          still: null,
          fallbackAudio: null,
        },
      }).success,
    ).toBe(false);
    expect(containsPrivateChannel({ note: "ipad:alpha" })).toBe(true);
    expect(containsPrivateChannel({ bytes: "0a" })).toBe(true);
    expect(containsPrivateChannel({ capabilityId: "lights.on", params: {} })).toBe(true);
    expect(
      storyboardStatePayloadSchema.safeParse({
        ...board,
        prompt: { id: "p", label: "ipad:alpha" },
      }).success,
    ).toBe(false);
    const shared = storyboardStatePayloadSchema.parse({
      ...board,
      moment: {
        id: "proving-ground.01",
        kind: "text-card",
        text: "Each hunter has a private thought.",
        still: null,
        fallbackAudio: "sfx.bell",
      },
    });
    expect(shared.moment?.fallbackAudio).toBe("sfx.bell");
  });

  it("keeps the stage and the flow screen in step", () => {
    const accepts = (screen: FlowScreen, stage: StoryboardState["stage"]) =>
      storyboardStatePayloadSchema.safeParse({ ...board, screen, stage }).success;
    expect(accepts("splash", "lobby")).toBe(true);
    expect(accepts("begin", "lobby")).toBe(true);
    expect(accepts("play", "lobby")).toBe(false);
    expect(accepts("tower-connect", "playing")).toBe(false);
    expect(accepts("quit", "lobby")).toBe(false);
    expect(accepts("quit", "ended")).toBe(true);
    expect(accepts("play", "ended")).toBe(false);
  });

  it("opens Begin only when nobody is unheld", () => {
    expect(
      storyboardStatePayloadSchema.safeParse({
        ...board,
        gate: { canBegin: true, unheld: ["alpha"] },
      }).success,
    ).toBe(false);
    expect(
      storyboardStatePayloadSchema.parse({
        ...board,
        screen: "play",
        stage: "playing",
        hunters: [
          { id: "alpha", name: "Alpha", holders: ["device-1"], disconnected: false },
          { id: "beta", name: "Beta", holders: ["device-1"], disconnected: false },
        ],
        gate: { canBegin: true, unheld: [] },
      }).gate.canBegin,
    ).toBe(true);
  });

  it("refuses a disconnected hunter nobody holds", () => {
    const hunters = [
      { id: "alpha", name: "Alpha", holders: [] as string[], disconnected: true },
      { id: "beta", name: "Beta", holders: ["device-1"], disconnected: false },
    ];
    expect(
      storyboardStatePayloadSchema.safeParse({
        ...board,
        hunters,
        gate: { canBegin: false, unheld: ["alpha"] },
      }).success,
    ).toBe(false);
  });

  it("keeps a held, disconnected hunter off the unheld list", () => {
    const parsed = storyboardStatePayloadSchema.parse({
      ...board,
      screen: "play",
      stage: "paused",
      hunters: [
        { id: "alpha", name: "Alpha", holders: ["device-1"], disconnected: true },
        { id: "beta", name: "Beta", holders: ["device-1"], disconnected: false },
      ],
      pause: { cause: "disconnect", hunter: "alpha" },
      gate: { canBegin: true, unheld: [] },
    });
    expect(parsed.hunters[0]?.disconnected).toBe(true);
  });
});

describe("server messages", () => {
  it("lists the server types and gives a device its private view only", () => {
    expect(SERVER_MESSAGE_TYPES).toEqual(["welcome", "error", "storyboardState", "deviceState"]);
    const token = "device-token-1234";
    const state = serverMessageSchema.parse(
      envelope("deviceState", {
        screen: "play",
        heldHunters: ["alpha"],
        views: [
          {
            hunter: "alpha",
            name: "Alpha",
            privateMoment: {
              momentId: "proving-ground.02.private.alpha",
              text: "Only Alpha hears this.",
              still: null,
            },
          },
        ],
        prompt: null,
        lock: null,
        won: null,
      }),
    );
    expect(state.type).toBe("deviceState");
    const withLocks = serverMessageSchema.parse(
      envelope("deviceState", {
        screen: "begin",
        heldHunters: [],
        views: [],
        prompt: { id: "begin", label: "Begin" },
        lock: null,
        won: null,
        tower,
        pausePromptId: null,
        connectLock: null,
        calibrateLock: null,
        roster: [{ id: "alpha", name: "Alpha" }],
      }),
    );
    expect(withLocks.type === "deviceState" && withLocks.payload.roster?.[0]?.name).toBe("Alpha");
    expect(
      serverMessageSchema.safeParse(
        envelope("welcome", {
          clientId: "device-1",
          role: "device",
          token,
          channels: [],
          versions: { protocol: 1, server: "0.0.0", node: "22.13.0" },
        }),
      ).success,
    ).toBe(true);
    expect(
      serverMessageSchema.safeParse(
        envelope("welcome", {
          clientId: "board",
          role: "storyboard",
          token,
          channels: ["storyboard", "ipad:alpha"],
          versions: { protocol: 1, server: "0.0.0", node: "22.13.0" },
        }),
      ).success,
    ).toBe(false);
  });
});

describe("devices", () => {
  it("records an iPad holding several hunters and refuses a mac as a holder", () => {
    expect(
      deviceRecordSchema.parse({
        deviceId: "device-1",
        formFactor: "ipad",
        connected: true,
        heldHunters: ["alpha", "beta"],
      }).heldHunters,
    ).toEqual(["alpha", "beta"]);
    expect(
      deviceRecordSchema.safeParse({
        deviceId: "device-1",
        formFactor: "mac",
        connected: true,
        heldHunters: [],
      }).success,
    ).toBe(false);
  });
});
