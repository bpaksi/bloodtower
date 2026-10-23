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
  gameSettingsSchema,
  helloPayloadSchema,
  holdPayloadSchema,
  hostHealthSchema,
  keeperLineEndedMessageSchema,
  loggedMessageSchema,
  logMessageSchema,
  PROTOCOL_VERSION,
  SERVER_MESSAGE_TYPES,
  type StoryboardState,
  serverMessageSchema,
  setupStepStateSchema,
  startupSummarySchema,
  storiesSchema,
  storyboardStatePayloadSchema,
  towerBatterySchema,
  towerSnapshotSchema,
  volumeTestBoardSchema,
  volumeTestSchema,
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
      "log",
    ]);
    expect(CLIENT_MESSAGE_TYPES).not.toContain("command");
    expect(CONTROL_ACTIONS).toEqual([
      "begin",
      "continue",
      "back",
      "pause",
      "resume",
      "quit",
      "tower-connect",
      "tower-calibrate",
      "pick",
      "set",
      "volume-play",
      "volume-answer",
    ]);
  });

  it("accepts a page log of text and a short code, and refuses raw bytes", () => {
    const payload = {
      level: "error" as const,
      source: "device" as const,
      device: null,
      session: null,
      screen: "play",
      code: "page-error",
      message: "The page hit an error.",
    };
    expect(logMessageSchema.parse(envelope("log", payload))).toMatchObject({ payload });
    expect(logMessageSchema.safeParse(envelope("log", { ...payload, bytes: "0a0b" })).success).toBe(
      false,
    );
    expect(logMessageSchema.safeParse(envelope("log", { ...payload, raw: "0a0b" })).success).toBe(
      false,
    );
    expect(
      logMessageSchema.safeParse(envelope("log", { ...payload, code: "Has Space" })).success,
    ).toBe(false);
    expect(
      loggedMessageSchema.parse(
        envelope("logged", { code: "page-error", source: "server", message: "Sound failed." }),
      ),
    ).toMatchObject({ type: "logged" });
    expect(
      loggedMessageSchema.safeParse(
        envelope("logged", { code: "page-error", source: "server", message: "ipad:alpha" }),
      ).success,
    ).toBe(false);
    expect(
      loggedMessageSchema.safeParse(
        envelope("logged", {
          code: "page-error",
          source: "server",
          message: "no",
          bytes: "0a0b",
        }),
      ).success,
    ).toBe(false);
  });

  it("requires a pick to name its option, and refuses an option on any other action", () => {
    const control = (payload: unknown) =>
      controlMessageSchema.safeParse({ v: 1, type: "control", payload }).success;
    expect(control({ promptId: "pick-6", action: "pick", option: "force-it" })).toBe(true);
    expect(control({ promptId: "pick-6", action: "pick" })).toBe(false);
    expect(control({ promptId: "continue-0", action: "continue", option: "force-it" })).toBe(false);
  });

  it("requires a set to name its setting and option, and refuses a setting on any other action", () => {
    const control = (payload: unknown) =>
      controlMessageSchema.safeParse({ v: 1, type: "control", payload }).success;
    expect(control({ promptId: "set-0", action: "set", setting: "length", option: "long" })).toBe(
      true,
    );
    expect(control({ promptId: "set-0", action: "set", option: "long" })).toBe(false);
    expect(control({ promptId: "set-0", action: "set", setting: "length" })).toBe(false);
    expect(
      control({ promptId: "pick-6", action: "pick", option: "force-it", setting: "length" }),
    ).toBe(false);
    expect(control({ promptId: "continue-0", action: "continue", setting: "length" })).toBe(false);
    expect(control({ promptId: "set-0", action: "set", setting: "Length", option: "long" })).toBe(
      false,
    );
  });

  it("takes a volume answer with its option, and the write-in text only with the write-in answer", () => {
    const control = (payload: unknown) =>
      controlMessageSchema.safeParse({ v: 1, type: "control", payload }).success;
    const answer = { promptId: "volume-answer", action: "volume-answer" };
    expect(control({ promptId: "volume-play-0", action: "volume-play" })).toBe(true);
    expect(control({ ...answer, option: "all-differ" })).toBe(true);
    expect(control({ ...answer, option: "one-louder" })).toBe(true);
    expect(control({ ...answer, option: "all-same" })).toBe(true);
    expect(control({ ...answer, option: "write-in", note: "Only the middle one" })).toBe(true);
    // The answer names its option, from the list, and the write-in carries its text.
    expect(control(answer)).toBe(false);
    expect(control({ ...answer, option: "very-loud" })).toBe(false);
    expect(control({ ...answer, option: "write-in" })).toBe(false);
    expect(control({ ...answer, option: "all-same", note: "extra" })).toBe(false);
    expect(control({ ...answer, option: "write-in", note: "   " })).toBe(false);
    expect(control({ ...answer, option: "write-in", note: "x".repeat(201) })).toBe(false);
    expect(control({ ...answer, option: "write-in", note: "x".repeat(200) })).toBe(true);
    // Nothing else takes a note or an option, and a play press names neither.
    expect(control({ promptId: "continue-0", action: "continue", note: "hi" })).toBe(false);
    expect(control({ promptId: "volume-play-0", action: "volume-play", option: "all-same" })).toBe(
      false,
    );
  });

  it("checks the volume test: a level only while the levels play, an answer only once answered", () => {
    const base = {
      mode: "tower",
      phase: "idle",
      level: null,
      runs: 0,
      failed: false,
      answer: null,
    };
    expect(volumeTestSchema.safeParse(base).success).toBe(true);
    expect(
      volumeTestSchema.safeParse({ ...base, phase: "levels", level: 2, runs: 1 }).success,
    ).toBe(true);
    expect(volumeTestSchema.safeParse({ ...base, phase: "levels", level: 3 }).success).toBe(false);
    expect(volumeTestSchema.safeParse({ ...base, phase: "levels" }).success).toBe(false);
    expect(volumeTestSchema.safeParse({ ...base, level: 1 }).success).toBe(false);
    expect(
      volumeTestSchema.safeParse({ ...base, phase: "answered", answer: "all-same" }).success,
    ).toBe(true);
    expect(volumeTestSchema.safeParse({ ...base, phase: "answered" }).success).toBe(false);
    expect(volumeTestSchema.safeParse({ ...base, answer: "all-same" }).success).toBe(false);
    // The shared shape has no place for the write-in text; only the board's debug fields do.
    expect(volumeTestSchema.safeParse({ ...base, note: "x" }).success).toBe(false);
    expect(volumeTestBoardSchema.safeParse({ ...base, logged: null }).success).toBe(true);
    expect(
      volumeTestBoardSchema.safeParse({
        ...base,
        phase: "answered",
        answer: "write-in",
        logged: { answer: "write-in", note: "x", firmware: null, at: "2026-10-18T10:00:00.000Z" },
      }).success,
    ).toBe(true);
  });

  it("keeps an absent or unavailable tower firmware apart from a known one, never blank", () => {
    const tower = {
      connection: "connected",
      battery: { state: "unavailable" },
      calibrated: { state: "unavailable" },
    };
    expect(towerSnapshotSchema.safeParse(tower).success).toBe(true);
    expect(
      towerSnapshotSchema.safeParse({ ...tower, firmware: { state: "unavailable" } }).success,
    ).toBe(true);
    expect(
      towerSnapshotSchema.safeParse({ ...tower, firmware: { state: "known", version: "1.4.0" } })
        .success,
    ).toBe(true);
    expect(
      towerSnapshotSchema.safeParse({ ...tower, firmware: { state: "known", version: "" } })
        .success,
    ).toBe(false);
  });

  it("checks game settings: one chosen option per listed setting, each one of its options", () => {
    const settings = {
      story: "test",
      settings: [
        {
          id: "length",
          label: "Length",
          options: [
            { id: "short", label: "Short" },
            { id: "long", label: "Long" },
          ],
        },
      ],
      chosen: { length: "short" },
    };
    expect(gameSettingsSchema.safeParse(settings).success).toBe(true);
    expect(gameSettingsSchema.safeParse({ ...settings, chosen: {} }).success).toBe(false);
    expect(gameSettingsSchema.safeParse({ ...settings, chosen: { length: "epic" } }).success).toBe(
      false,
    );
    expect(
      gameSettingsSchema.safeParse({ ...settings, chosen: { length: "short", speed: "fast" } })
        .success,
    ).toBe(false);
    expect(
      gameSettingsSchema.safeParse({
        ...settings,
        settings: [...settings.settings, ...settings.settings],
      }).success,
    ).toBe(false);
    expect(
      storyboardStatePayloadSchema.safeParse({ ...board, gameSettings: settings }).success,
    ).toBe(true);
    expect(storyboardStatePayloadSchema.safeParse({ ...board, gameSettings: null }).success).toBe(
      true,
    );
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
      tagline: null,
      cover: null,
      players: { min: 1, max: 4 },
      playable: true,
      loadable,
      tower: "optional" as string | null,
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
    // The card carries the pack's `tower` field (R3-UI-23); null only when it did not load.
    const withTower = (tower: unknown) =>
      parse({ cards: [{ ...card("alpha"), tower }], focus: "alpha", current: "alpha" });
    for (const tower of ["required", "optional", "none", null]) expect(withTower(tower)).toBe(true);
    expect(withTower("sometimes")).toBe(false);
    expect(withTower(undefined)).toBe(false);
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
      hostHealthSchema.parse({ protocol: 1, tower: "connection-and-sound", effects: "sound-only" }),
    ).toEqual({
      protocol: 1,
      tower: "connection-and-sound",
      effects: "sound-only",
    });
  });

  it("carries a hunter portrait asset id and the pack id on the board, and refuses a bad one", () => {
    const parsed = storyboardStatePayloadSchema.parse({
      ...board,
      packId: "test",
      hunters: [{ ...board.hunters[0], portrait: "por.alpha" }, board.hunters[1]],
    });
    expect(parsed.packId).toBe("test");
    expect(parsed.hunters[0]?.portrait).toBe("por.alpha");
    expect(parsed.hunters[1]?.portrait).toBeUndefined();
    expect(storyboardStatePayloadSchema.parse(board).packId).toBeUndefined();
    for (const portrait of ["../x", "Por Alpha", ""]) {
      expect(
        storyboardStatePayloadSchema.safeParse({
          ...board,
          hunters: [{ ...board.hunters[0], portrait }],
        }).success,
        portrait,
      ).toBe(false);
    }
    expect(storyboardStatePayloadSchema.safeParse({ ...board, packId: "Not Kebab" }).success).toBe(
      false,
    );
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
    expect(SERVER_MESSAGE_TYPES).toEqual([
      "welcome",
      "error",
      "storyboardState",
      "deviceState",
      "logged",
    ]);
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
    const deviceBase = {
      screen: "party-join",
      heldHunters: [],
      views: [],
      prompt: null,
      lock: null,
      won: null,
    };
    const withPortrait = serverMessageSchema.parse(
      envelope("deviceState", {
        ...deviceBase,
        packId: "test",
        roster: [
          { id: "alpha", name: "Alpha", portrait: "por.alpha" },
          { id: "beta", name: "Beta" },
        ],
      }),
    );
    expect(withPortrait.type === "deviceState" && withPortrait.payload.packId).toBe("test");
    expect(
      withPortrait.type === "deviceState" && withPortrait.payload.roster?.map((h) => h.portrait),
    ).toEqual(["por.alpha", undefined]);
    expect(
      serverMessageSchema.safeParse(
        envelope("deviceState", {
          ...deviceBase,
          roster: [{ id: "alpha", name: "Alpha", portrait: "../etc/passwd" }],
        }),
      ).success,
    ).toBe(false);
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

describe("setup step and start-up summary", () => {
  it("keeps the setup step inside its list", () => {
    const step = { id: "lay-out-board", label: "Lay out the board.", index: 2, count: 3 };
    expect(setupStepStateSchema.safeParse(step).success).toBe(true);
    expect(setupStepStateSchema.safeParse({ ...step, index: 3 }).success).toBe(false);
    expect(setupStepStateSchema.safeParse({ ...step, illustration: "x" }).success).toBe(false);
  });

  it("accepts an empty summary and refuses an unknown tower outcome", () => {
    const empty = { game: null, settings: null, tower: null, hunters: null, setup: [] };
    expect(startupSummarySchema.safeParse(empty).success).toBe(true);
    expect(startupSummarySchema.safeParse({ ...empty, tower: "maybe" }).success).toBe(false);
    expect(startupSummarySchema.safeParse({ ...empty, tower: "without" }).success).toBe(true);
  });
});
