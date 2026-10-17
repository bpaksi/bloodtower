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
        name: "Alpha",
        privateMoment: {
          momentId: "proving-ground.02.private.alpha",
          text: "Only Alpha hears this.",
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
    expect(device).toContain("Only Alpha hears this.");
    expect(device).toContain("Continue");
    expect(device).toContain("Connect the tower");
    expect(device).toContain("Calibrate");
    expect(device).not.toContain("Only Delta hears this.");

    const join = renderToStaticMarkup(
      createElement(JoinScreen, {
        live: true,
        code: "048213",
        hunters: [
          { id: "alpha", name: "Alpha" },
          { id: "beta", name: "Beta" },
        ],
        held: ["alpha"],
      }),
    );
    expect(join).toContain("048213");
    expect(join).toContain("Hold Beta");
    expect(join).toContain("Release Alpha");
    expect(join).toContain("Rejoin");
    expect(join).not.toContain("Only Alpha hears this.");
    expect(join).not.toContain("Use the full layout");
  });

  it("detects a phone and offers the full layout", () => {
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
        hunters: [{ id: "alpha", name: "Alpha" }],
        held: [],
        formFactor: "phone",
      }),
    );
    expect(join).toContain('data-layout="phone"');
    expect(join).toContain("Use the full layout");
    expect(join).toContain("Hold Alpha");

    const device = renderToStaticMarkup(
      createElement(DeviceScreen, {
        live: true,
        deviceId: "device-1",
        state: playing(),
        pausePromptId: null,
        connectLock: null,
        calibrateLock: null,
        tower: tower("disconnected"),
        formFactor: "phone",
      }),
    );
    expect(device).toContain('data-layout="phone"');
    expect(device).toContain("Use the full layout");
    expect(device).toContain("Only Alpha hears this.");
  });

  it("says the session host is unavailable and shows no fake hunters", () => {
    const join = renderToStaticMarkup(
      createElement(JoinScreen, { live: false, code: null, hunters: [], held: [] }),
    );
    expect(join).toContain("Session host unavailable.");
    expect(join).toContain("Join code unavailable.");
    expect(join).toContain("Hunters unavailable.");
    expect(join).toContain('disabled="" name="token"');
  });

  it("lets a token be pasted before the socket is up when rejoin is wired", () => {
    const join = renderToStaticMarkup(
      createElement(JoinScreen, {
        live: false,
        code: null,
        hunters: [],
        held: [],
        onRejoin: () => undefined,
      }),
    );
    expect(join).toContain("Session host unavailable.");
    expect(join).toContain('name="token"');
    expect(join).not.toContain('disabled="" name="token"');
  });
});
