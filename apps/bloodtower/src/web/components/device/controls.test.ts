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

  it("says the session host is unavailable and shows no fake hunters", () => {
    const join = renderToStaticMarkup(createElement(JoinScreen, { live: false, code: null }));
    expect(join).toContain("Session host unavailable.");
    expect(join).toContain("Join code unavailable.");
    expect(join).toContain("Rejoin");
    expect(join).not.toContain("Hunters unavailable.");
    expect(join).not.toContain("Device token");
    expect(join).toContain('disabled="" name="token"');
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
          prompt: { id: "continue-tower-connect", label: "Next: pick a story" },
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
    expect(connect).not.toContain('data-primary="true">Next: pick a story');

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
          prompt: { id: "continue-tower-connect", label: "Next: pick a story" },
          lock: null,
          won: null,
        }),
      }),
    );
    expect(ready).toContain("Next: pick a story");
    expect(ready).not.toContain("Play without tower");
    expect(ready.match(/data-primary="true"/g)).toHaveLength(1);
    expect(ready).toContain('data-primary="true">Next: pick a story');

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

  it("shows the highlighted story with arrows and a Choose button that names it", () => {
    const door = (id: string, title: string, loadable = true) => ({
      id,
      title,
      blurb: null,
      players: { min: 1, max: 4 },
      loadable,
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
    expect(join).toContain("Session host unavailable.");
    expect(join).toContain('name="token"');
    expect(join).not.toContain('disabled="" name="token"');
  });
});
