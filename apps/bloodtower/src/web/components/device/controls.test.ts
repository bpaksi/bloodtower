import {
  type DeviceState,
  deviceStatePayloadSchema,
  type TowerSnapshot,
} from "bloodtower-protocols";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { deviceControls } from "./controls";
import { DeviceScreen } from "./DeviceScreen";
import { detectFormFactor, layoutFor } from "./formFactor";
import { JoinScreen } from "./JoinScreen";
import { controlMessage, holdMessage } from "./messages";

const tower = (connection: TowerSnapshot["connection"]): TowerSnapshot => ({
  connection,
  battery: { state: "unavailable" },
  calibrated: { state: "unavailable" },
});

const playing = (): DeviceState =>
  deviceStatePayloadSchema.parse({
    screen: "play",
    quitPromptId: "quit",
    heldHunters: ["alpha"],
    views: [
      {
        hunter: "alpha",
        name: "Agnes",
        privateMoment: {
          momentId: "proving-ground.02.private.alpha",
          text: "Only Agnes hears this.",
          still: null,
        },
      },
    ],
    prompt: { id: "continue-1", label: "Continue" },
    lock: null,
    won: null,
  });

describe("device messages", () => {
  it("builds hold and control messages with no tower command", () => {
    const hold = holdMessage("alpha", "take");
    const press = controlMessage("tower-connect", "tower-connect");
    expect(hold.type).toBe("hold");
    expect(press.payload).toEqual({ promptId: "tower-connect", action: "tower-connect" });
    expect(JSON.stringify(press)).not.toContain("capabilityId");
    expect(JSON.stringify(press)).not.toContain("bytes");
    expect(() => controlMessage("continue-0", "continue")).not.toThrow();
  });
});

const volumeState = (
  phase: "idle" | "levels" | "asking" | "answered",
  mode: "tower" | "room" = "tower",
): DeviceState =>
  deviceStatePayloadSchema.parse({
    screen: "tower-volume-test",
    heldHunters: [],
    views: [],
    prompt:
      phase === "levels"
        ? null
        : { id: "continue-tower-volume-test", label: "Next: gather the party" },
    lock: null,
    won: null,
    backPromptId: "back-tower-volume-test",
    volumeTest: {
      mode,
      phase,
      level: phase === "levels" ? 1 : null,
      runs: phase === "idle" ? 0 : 1,
      failed: false,
      answer: phase === "answered" ? "all-same" : null,
    },
    volumePlayPromptId:
      mode === "tower" && (phase === "idle" || phase === "asking") ? "volume-play-0" : null,
    volumeAnswerPromptId: phase === "asking" ? "volume-answer" : null,
  });

const volumeHtml = (state: DeviceState) =>
  renderToStaticMarkup(
    createElement(DeviceScreen, {
      live: true,
      deviceId: "device-1",
      state,
      pausePromptId: null,
      connectLock: null,
      calibrateLock: null,
      tower: tower("connected"),
    }),
  );

describe("tower volume test on a device", () => {
  const controls = (state: DeviceState) =>
    deviceControls({
      live: true,
      state,
      pausePromptId: null,
      connectLock: null,
      calibrateLock: null,
      tower: tower("connected"),
      deviceId: "device-1",
    });

  it("offers Play levels, then the question and Play again, and Back beside Continue", () => {
    expect(controls(volumeState("idle"))).toMatchObject({
      volumePlay: true,
      volumeAnswer: false,
      continue: true,
      back: true,
      backPromptId: "back-tower-volume-test",
    });
    expect(controls(volumeState("levels"))).toMatchObject({
      volumePlay: false,
      volumeAnswer: false,
      continue: false,
    });
    expect(controls(volumeState("asking"))).toMatchObject({ volumePlay: true, volumeAnswer: true });
    expect(controls(volumeState("answered"))).toMatchObject({
      volumePlay: false,
      volumeAnswer: false,
    });
    expect(controls({ ...volumeState("idle"), volumePlayPromptId: null }).volumePlay).toBe(false);
  });

  it("shows text and buttons only, with neutral level and answer words and a write-in field", () => {
    const idle = volumeHtml(volumeState("idle"));
    expect(idle).toContain('data-screen="tower-volume-test"');
    expect(idle).toMatch(/data-action="volume-play"[^>]*>Play levels</);
    expect(idle).not.toContain("<img");
    expect(volumeHtml(volumeState("levels"))).toContain("Level 1 is playing.");

    const asking = volumeHtml(volumeState("asking"));
    expect(asking).toContain("Did the levels sound different?");
    expect(asking).toContain("All three differ");
    expect(asking).toContain("Only one level is louder");
    expect(asking).toContain("All the same");
    expect(asking).toContain("data-volume-note");
    expect(asking).toMatch(/data-action="volume-play"[^>]*>Play again</);
    // The library's tier names are unconfirmed, so no word says which level is quiet or loud.
    for (const html of [idle, asking, volumeHtml(volumeState("levels"))]) {
      expect(html.toLowerCase()).not.toMatch(/quiet|quietest|loudest/);
    }
    expect(volumeHtml(volumeState("answered"))).toContain("Answered: All the same.");
  });

  it("with no tower shows only the room-sound note: no Play, no question", () => {
    const html = volumeHtml(volumeState("idle", "room"));
    expect(html).toContain('data-volume-mode="room"');
    expect(html).not.toContain('data-action="volume-play"');
    expect(html).not.toContain("Did the levels sound different?");
    expect(html).toMatch(/data-action="continue"/);
  });

  it("builds an answer press with its option, and the write-in text only for the write-in", () => {
    const write = controlMessage(
      "volume-answer",
      "volume-answer",
      "write-in",
      undefined,
      "Level 1",
    );
    expect(write.payload).toEqual({
      promptId: "volume-answer",
      action: "volume-answer",
      option: "write-in",
      note: "Level 1",
    });
    expect(() =>
      controlMessage("volume-answer", "volume-answer", "all-same", undefined, "x"),
    ).toThrow();
    expect(JSON.stringify(write)).not.toContain("capabilityId");
  });
});

describe("device controls", () => {
  it("enables Quit only while its prompt is open, even when a step is locked", () => {
    const state = playing();
    const controls = (quitPromptId: string | null) =>
      deviceControls({
        live: true,
        state: {
          ...state,
          quitPromptId,
          lock: { promptId: "continue-1", action: "continue", winnerDeviceId: "device-2" },
          won: false,
        },
        pausePromptId: null,
        connectLock: null,
        calibrateLock: null,
        tower: tower("disconnected"),
        deviceId: "device-1",
      });
    expect(controls("quit").quit).toBe(true);
    expect(controls("quit").continue).toBe(false);
    expect(controls(null).quit).toBe(false);
  });

  it("enables Back only on the Not playable yet prompt, and the screen shows that Back alone", () => {
    const notPlayable = (promptId: string | null): DeviceState =>
      deviceStatePayloadSchema.parse({
        ...playing(),
        screen: "not-playable",
        quitPromptId: null,
        heldHunters: [],
        views: [],
        prompt: promptId ? { id: promptId, label: "Back" } : null,
        lock: null,
        won: null,
      });
    const controls = (promptId: string | null) =>
      deviceControls({
        live: true,
        state: notPlayable(promptId),
        pausePromptId: null,
        connectLock: null,
        calibrateLock: null,
        tower: tower("disconnected"),
        deviceId: "device-1",
      });
    expect(controls("back-not-playable").back).toBe(true);
    expect(controls("back-not-playable").continue).toBe(false);
    expect(controls("continue-pick-story-test").back).toBe(false);
    expect(controls(null).back).toBe(false);

    const html = renderToStaticMarkup(
      createElement(DeviceScreen, {
        live: true,
        deviceId: "device-1",
        state: notPlayable("back-not-playable"),
        pausePromptId: null,
        connectLock: null,
        calibrateLock: null,
        tower: tower("disconnected"),
      }),
    );
    expect(html).toContain('data-screen="not-playable"');
    expect(html).toContain("Not playable yet");
    expect(html).toMatch(/data-action="back"[^>]*>Back</);
  });

  it("shows Game settings as one button group per setting, with Continue and Back, and no image", () => {
    const settings = (overrides: Partial<DeviceState> = {}): DeviceState =>
      deviceStatePayloadSchema.parse({
        screen: "game-settings",
        heldHunters: [],
        views: [],
        prompt: { id: "continue-game-settings", label: "Continue" },
        lock: null,
        won: null,
        stories: {
          cards: [
            {
              id: "test",
              title: "Proving ground",
              blurb: null,
              tagline: null,
              cover: "/packs/test/assets/cover.png",
              players: { min: 1, max: 4 },
              playable: true,
              loadable: true,
              tower: "optional",
            },
          ],
          focus: "test",
          current: "test",
        },
        gameSettings: {
          story: "test",
          settings: [
            {
              id: "length",
              label: "Length",
              options: [
                { id: "short", label: "Short" },
                { id: "standard", label: "Standard" },
                { id: "long", label: "Long" },
              ],
            },
            {
              id: "difficulty",
              label: "Difficulty",
              options: [{ id: "standard", label: "Standard" }],
            },
          ],
          chosen: { length: "long", difficulty: "standard" },
        },
        setPromptId: "set-3",
        backPromptId: "back-game-settings",
        backLock: null,
        ...overrides,
      });
    const controls = (state: DeviceState) =>
      deviceControls({
        live: true,
        state,
        pausePromptId: null,
        connectLock: null,
        calibrateLock: null,
        tower: tower("disconnected"),
        deviceId: "device-1",
      });
    const open = controls(settings());
    expect(open).toMatchObject({ set: true, continue: true, back: true });
    expect(open.backPromptId).toBe("back-game-settings");
    // A Continue lock leaves Back alone, and a Back lock leaves Continue alone.
    const continued = controls(
      settings({
        lock: {
          promptId: "continue-game-settings",
          action: "continue",
          winnerDeviceId: "device-2",
        },
        won: false,
      }),
    );
    expect(continued).toMatchObject({ continue: false, back: true });
    const backed = controls(
      settings({
        backLock: { promptId: "back-game-settings", action: "back", winnerDeviceId: "device-2" },
      }),
    );
    expect(backed).toMatchObject({ continue: true, back: false });
    expect(controls(settings({ setPromptId: null })).set).toBe(false);

    const html = renderToStaticMarkup(
      createElement(DeviceScreen, {
        live: true,
        deviceId: "device-1",
        state: settings(),
        pausePromptId: null,
        connectLock: null,
        calibrateLock: null,
        tower: tower("disconnected"),
      }),
    );
    expect(html).toContain('data-screen="game-settings"');
    expect(html).toContain("Game settings");
    expect(html).toContain("Proving ground");
    expect(html.match(/data-action="set"/g)).toHaveLength(4);
    expect(html).toMatch(/data-option="long" aria-pressed="true"[^>]*>Long</);
    expect(html).toMatch(/data-option="short" aria-pressed="false"[^>]*>Short</);
    expect(html).toMatch(/data-action="continue"[^>]*>Continue</);
    expect(html).not.toMatch(/data-action="back"[^>]*hidden/);
    // Devices show no images (R3-UI-51): no cover on the device.
    expect(html).not.toContain("<img");
    expect(html).not.toContain("cover.png");
  });

  it("builds a set press with its setting and option and nothing else", () => {
    expect(controlMessage("set-0", "set", "long", "length").payload).toEqual({
      promptId: "set-0",
      action: "set",
      option: "long",
      setting: "length",
    });
    expect(() => controlMessage("set-0", "set", "long")).toThrow();
  });

  it("enables Begin only when that prompt is open, and locks a losing press", () => {
    const begin = deviceStatePayloadSchema.parse({
      screen: "begin",
      heldHunters: [],
      views: [],
      prompt: { id: "begin", label: "Begin" },
      lock: null,
      won: null,
    });
    const open = deviceControls({
      live: true,
      state: begin,
      pausePromptId: null,
      connectLock: null,
      calibrateLock: null,
      tower: tower("disconnected"),
      deviceId: "device-1",
    });
    expect(open.begin).toBe(true);
    expect(open.towerCalibrate).toBe(false);
    expect(open.towerConnect).toBe(true);

    const lost = deviceStatePayloadSchema.parse({
      ...begin,
      prompt: { id: "continue-0", label: "Continue" },
      lock: { promptId: "continue-0", action: "continue", winnerDeviceId: "device-2" },
      won: false,
    });
    const locked = deviceControls({
      live: true,
      state: lost,
      pausePromptId: null,
      connectLock: {
        promptId: "tower-connect",
        action: "tower-connect",
        winnerDeviceId: "device-1",
      },
      calibrateLock: null,
      tower: tower("connected"),
      deviceId: "device-1",
    });
    expect(locked.continue).toBe(false);
    expect(locked.gameplayLock).toBe("Locked. Another player pressed first.");
    expect(locked.connectLock).toBe("Your press counted.");
    expect(locked.towerCalibrate).toBe(true);
    expect(
      deviceControls({
        live: false,
        state: begin,
        pausePromptId: "pause-1",
        connectLock: null,
        calibrateLock: null,
        tower: tower("connected"),
        deviceId: "device-1",
      }).begin,
    ).toBe(false);
  });
});

describe("device screens", () => {
  it("shows a private line and the controls on the device, and a join code on the join page", () => {
    const device = renderToStaticMarkup(
      createElement(DeviceScreen, {
        live: true,
        deviceId: "device-1",
        state: playing(),
        pausePromptId: "pause-1",
        connectLock: null,
        calibrateLock: null,
        tower: tower("disconnected"),
      }),
    );
    expect(device).toContain("Only Agnes hears this.");
    expect(device).toContain("Agnes:");
    expect(device).toContain("Continue");
    expect(device).toContain("Menu");
    expect(device).toContain("bt-menu");
    expect(device).not.toContain("Connect tower");
    expect(device).not.toContain("Calibrate");
    expect(device).toContain('data-screen="play"');
    expect(device).toContain('data-layout="ipad"');
    expect(device).not.toContain("Only Emeric hears this.");

    const join = renderToStaticMarkup(createElement(JoinScreen, { live: true, code: "048213" }));
    expect(join).toContain("048213");
    expect(join).toContain("Game is loading...");
    expect(join).not.toContain("Hold Tomas");
    expect(join).not.toContain("Open controls");
    expect(join).not.toContain("Only Agnes hears this.");
    expect(join).not.toContain("Device token");
    expect(join).not.toContain("Use the full layout");
    expect(join).toContain('data-layout="ipad"');
  });

  it("strips [pause N] tags from a private line caption", () => {
    const device = renderToStaticMarkup(
      createElement(DeviceScreen, {
        live: true,
        deviceId: "device-1",
        state: deviceStatePayloadSchema.parse({
          screen: "play",
          quitPromptId: "quit",
          heldHunters: ["alpha"],
          views: [
            {
              hunter: "alpha",
              name: "Agnes",
              privateMoment: {
                momentId: "proving-ground.02.private.alpha",
                text: "Go on. [pause 0.5] I'll wait.",
                still: null,
              },
            },
          ],
          prompt: { id: "continue-1", label: "Continue" },
          lock: null,
          won: null,
        }),
        pausePromptId: "pause-1",
        connectLock: null,
        calibrateLock: null,
        tower: tower("disconnected"),
      }),
    );
    expect(device).toContain("Agnes: Go on. I&#x27;ll wait.");
    expect(device).not.toContain("[pause");
  });

  it("detects a phone for hello, and keeps the iPad layout", () => {
    expect(detectFormFactor("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(
      "phone",
    );
    expect(detectFormFactor("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("ipad");
    expect(layoutFor("phone", null)).toBe("phone");
    expect(layoutFor("phone", "full")).toBe("full");
    expect(layoutFor("ipad", null)).toBe("full");

    const join = renderToStaticMarkup(
      createElement(JoinScreen, {
        live: true,
        code: "048213",
      }),
    );
    expect(join).toContain('data-layout="ipad"');
    expect(join).not.toContain("Use the full layout");
    expect(join).toContain("Game is loading...");
    expect(join).not.toContain("Hold Agnes");

    const device = renderToStaticMarkup(
      createElement(DeviceScreen, {
        live: true,
        deviceId: "device-1",
        state: playing(),
        pausePromptId: null,
        connectLock: null,
        calibrateLock: null,
        tower: tower("disconnected"),
      }),
    );
    expect(device).toContain('data-layout="ipad"');
    expect(device).not.toContain("Use the full layout");
    expect(device).toContain("Only Agnes hears this.");
  });

  it("shows the join form without a host error when no code is present", () => {
    const join = renderToStaticMarkup(createElement(JoinScreen, { live: false, code: null }));
    expect(join).not.toContain("Session host unavailable.");
    expect(join).toContain("Join code");
    expect(join).toContain("Enter the table");
    expect(join).toContain("Rejoin token");
    expect(join).not.toContain("Hunters unavailable.");
    expect(join).not.toContain("Device token");
  });

  it("says the session host is unavailable while waiting with a join code", () => {
    const join = renderToStaticMarkup(createElement(JoinScreen, { live: false, code: "123456" }));
    expect(join).toContain("Session host unavailable.");
    expect(join).toContain("123456");
    expect(join).not.toContain("Join code");
  });

  it("renders each opening screen with one primary action and no phone layout", () => {
    const base = {
      live: true,
      deviceId: "device-1",
      pausePromptId: null as string | null,
      connectLock: null,
      calibrateLock: null,
      tower: tower("disconnected"),
    };
    const splash = renderToStaticMarkup(
      createElement(DeviceScreen, {
        ...base,
        state: deviceStatePayloadSchema.parse({
          screen: "splash",
          heldHunters: [],
          views: [],
          prompt: null,
          lock: null,
          won: null,
        }),
      }),
    );
    expect(splash).toContain("Game is loading...");
    expect(splash).toContain('data-screen="splash"');
    expect(splash).not.toContain('data-primary="true"');

    const connect = renderToStaticMarkup(
      createElement(DeviceScreen, {
        ...base,
        state: deviceStatePayloadSchema.parse({
          screen: "tower-connect",
          heldHunters: [],
          views: [],
          prompt: { id: "continue-tower-connect", label: "Next: gather the party" },
          lock: null,
          won: null,
        }),
      }),
    );
    expect(connect).toContain("Connect tower");
    expect(connect).toContain("Play without tower");
    expect(connect).toContain("Tower Connect");
    expect(connect).toContain('data-primary="true">Connect tower');
    expect(connect.match(/data-primary="true"/g)).toHaveLength(1);
    expect(connect).not.toContain('data-primary="true">Play without tower');
    expect(connect).not.toContain('data-primary="true">Next: gather the party');

    const ready = renderToStaticMarkup(
      createElement(DeviceScreen, {
        ...base,
        tower: {
          connection: "connected",
          battery: { state: "unavailable" },
          calibrated: { state: "known", calibrated: true },
        },
        connectLock: {
          promptId: "tower-connect",
          action: "tower-connect",
          winnerDeviceId: "device-1",
        },
        calibrateLock: {
          promptId: "tower-calibrate",
          action: "tower-calibrate",
          winnerDeviceId: "device-1",
        },
        state: deviceStatePayloadSchema.parse({
          screen: "tower-connect",
          heldHunters: [],
          views: [],
          prompt: { id: "continue-tower-connect", label: "Next: gather the party" },
          lock: null,
          won: null,
        }),
      }),
    );
    expect(ready).toContain("Next: gather the party");
    expect(ready).not.toContain("Play without tower");
    expect(ready.match(/data-primary="true"/g)).toHaveLength(1);
    expect(ready).toContain('data-primary="true">Next: gather the party');

    const party = renderToStaticMarkup(
      createElement(DeviceScreen, {
        ...base,
        state: deviceStatePayloadSchema.parse({
          screen: "party-join",
          heldHunters: ["alpha"],
          views: [{ hunter: "alpha", name: "Agnes", privateMoment: null }],
          prompt: null,
          lock: null,
          won: null,
          roster: [
            { id: "alpha", name: "Agnes" },
            { id: "beta", name: "Tomas" },
          ],
        }),
      }),
    );
    expect(party).toContain("Take all");
    expect(party).toContain("Claim all hunters first");
    expect(party).toContain("Agnes: Mine");
    expect(party).toContain("Claim Tomas");
    expect(party).toContain('data-action="continue"');
  });

  it("shows Connect Tower by the chosen story's tower field, with Back beside Continue", () => {
    const connectState = (
      mode: "required" | "optional",
      prompt: { id: string; label: string } | null,
    ): DeviceState =>
      deviceStatePayloadSchema.parse({
        screen: "tower-connect",
        heldHunters: [],
        views: [],
        prompt,
        lock: null,
        won: null,
        stories: {
          cards: [
            {
              id: "test",
              title: "Proving ground",
              blurb: null,
              tagline: null,
              cover: null,
              players: { min: 1, max: 4 },
              playable: true,
              loadable: true,
              tower: mode,
            },
          ],
          focus: "test",
          current: "test",
        },
        gameSettings: { story: "test", settings: [], chosen: {} },
        backPromptId: "back-tower-connect",
        backLock: null,
      });
    const render = (state: DeviceState, reading: TowerSnapshot) =>
      renderToStaticMarkup(
        createElement(DeviceScreen, {
          live: true,
          deviceId: "device-1",
          pausePromptId: null,
          connectLock: null,
          calibrateLock: null,
          tower: reading,
          state,
        }),
      );
    const prompt = { id: "continue-tower-connect", label: "Next: gather the party" };
    const reason = "Connect and calibrate the tower first";
    const back = /<button[^>]*data-action="back"[^>]*>Back<\/button>/;

    // Optional: skipping is allowed, and Back returns to Game settings.
    const optional = render(connectState("optional", prompt), tower("unavailable"));
    expect(optional).toContain("Play without tower");
    expect(optional).not.toContain(reason);
    expect(optional.match(back)?.[0]).not.toContain("hidden");
    expect(optional.match(back)?.[0]).not.toContain("disabled");

    // Required, not ready: the server sends no prompt. No skip; Continue shows, disabled, with why.
    const held = render(connectState("required", null), tower("connected"));
    expect(held).not.toContain("Play without tower");
    expect(held).toContain(`Waiting: ${reason}`);
    expect(held).toContain(`Disabled: ${reason}.`);
    const continueButton = held.match(/<button[^>]*data-action="continue"[^>]*>/)?.[0] ?? "";
    expect(continueButton).toContain("disabled");
    expect(continueButton).not.toContain("hidden");
    expect(held.match(back)?.[0]).not.toContain("disabled");

    // Required and ready: Continue is the one primary action.
    const ready = render(connectState("required", prompt), {
      connection: "connected",
      battery: { state: "unavailable" },
      calibrated: { state: "known", calibrated: true },
    });
    expect(ready).not.toContain("Play without tower");
    expect(ready).not.toContain(reason);
    expect(ready).toContain('data-primary="true">Next: gather the party');
  });

  it("shows the highlighted story with arrows and a Choose button that names it", () => {
    const door = (id: string, title: string, loadable = true) => ({
      id,
      title,
      blurb: null,
      tagline: null,
      cover: null,
      players: { min: 1, max: 4 },
      playable: true,
      loadable,
      tower: "optional",
    });
    const render = (focus: string, cards = [door("alpha", "Alpha"), door("beta", "Beta")]) =>
      renderToStaticMarkup(
        createElement(DeviceScreen, {
          live: true,
          deviceId: "device-1",
          pausePromptId: null,
          connectLock: null,
          calibrateLock: null,
          tower: tower("connected"),
          state: deviceStatePayloadSchema.parse({
            screen: "pick-story",
            heldHunters: [],
            views: [],
            prompt: cards.find((card) => card.id === focus)?.loadable
              ? { id: `continue-pick-story-${focus}`, label: `Choose ${focus}` }
              : null,
            lock: null,
            won: null,
            stories: { cards, focus, current: cards[0]?.id ?? focus },
          }),
        }),
      );
    const two = render("beta");
    expect(two).toContain('data-story="beta"');
    expect(two).toContain('data-action="story-previous"');
    expect(two).toContain('data-action="story-next"');
    expect(two).toContain('data-primary="true">Choose beta');
    // One story: no arrows, and the story is still shown.
    const one = render("alpha", [door("alpha", "Alpha")]);
    expect(one).toContain('data-story="alpha"');
    expect(one).not.toContain("story-next");
    // A door that can't load says so and the Choose button is disabled.
    const greyed = render("zzz", [door("alpha", "Alpha"), door("zzz", "zzz", false)]);
    expect(greyed).toContain("Can&#x27;t load");
    expect(greyed).toMatch(/<button[^>]*data-action="continue"[^>]*disabled/);
  });

  it("shows Oil and Force pick options on the iPad at the door-choice pick-card", () => {
    const html = renderToStaticMarkup(
      createElement(DeviceScreen, {
        live: true,
        deviceId: "device-1",
        pausePromptId: null,
        connectLock: null,
        calibrateLock: null,
        tower: tower("disconnected"),
        state: deviceStatePayloadSchema.parse({
          screen: "play",
          quitPromptId: "quit",
          heldHunters: ["alpha"],
          views: [{ hunter: "alpha", name: "Agnes", privateMoment: null }],
          prompt: { id: "pick-6", label: "Oil the hinge, or force it." },
          pick: {
            momentId: "grey-stair.door-choice",
            prompt: "Oil the hinge, or force it.",
            options: [
              { id: "oil-the-hinge", label: "Oil the hinge" },
              { id: "force-it", label: "Force it" },
            ],
          },
          lock: null,
          won: null,
        }),
      }),
    );
    expect(html).toContain("Oil the hinge");
    expect(html).toContain("Force it");
    expect(html).toMatch(/data-pick="oil-the-hinge"/);
    expect(html).toMatch(/data-pick="force-it"/);
  });

  it("lets a token be pasted before the socket is up when rejoin is wired", () => {
    const join = renderToStaticMarkup(
      createElement(JoinScreen, {
        live: false,
        code: null,
        onRejoin: () => undefined,
      }),
    );
    expect(join).not.toContain("Session host unavailable.");
    expect(join).toContain('name="token"');
    expect(join).not.toContain('disabled="" name="token"');
  });
});
