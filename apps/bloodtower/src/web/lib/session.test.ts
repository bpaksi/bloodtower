import type { ServerMessage } from "bloodtower-protocols";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deviceHello,
  forgetStoredToken,
  openSession,
  sessionUrl,
  storyboardHello,
} from "./session";

class FakeSocket {
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  send(data: string) {
    this.sent.push(data);
  }
  receive(message: ServerMessage) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

const versions = { protocol: 1 as const, server: "0.0.0", node: "v22.14.0" };

describe("stored token", () => {
  it("forgets a token only when hello is refused before welcome", () => {
    expect(
      forgetStoredToken({ hadStoredToken: true, welcomed: false, code: "invalid-state" }),
    ).toBe(true);
    expect(forgetStoredToken({ hadStoredToken: true, welcomed: true, code: "invalid-state" })).toBe(
      false,
    );
    expect(
      forgetStoredToken({ hadStoredToken: true, welcomed: false, code: "invalid-payload" }),
    ).toBe(false);
    expect(
      forgetStoredToken({ hadStoredToken: false, welcomed: false, code: "invalid-state" }),
    ).toBe(false);
  });
});

describe("session url", () => {
  it("uses the page host on the session port, or port 4787 when next dev splits the page", () => {
    expect(sessionUrl({ protocol: "http:", host: "192.168.1.5:4787" })).toBe(
      "ws://192.168.1.5:4787/ws",
    );
    expect(sessionUrl({ protocol: "https:", host: "play.example" })).toBe("wss://play.example/ws");
    expect(sessionUrl({ protocol: "http:", host: "127.0.0.1:4788" })).toBe(
      "ws://127.0.0.1:4788/ws",
    );
    expect(sessionUrl({ protocol: "http:", host: "localhost:3000" })).toBe(
      "ws://localhost:4787/ws",
    );
    expect(sessionUrl({ protocol: "http:", host: "192.168.1.20:3000" })).toBe(
      "ws://192.168.1.20:4787/ws",
    );
  });

  it("keeps a loopback dev url on the Mac, but follows the LAN hostname on an iPad", () => {
    expect(
      sessionUrl({ protocol: "http:", host: "localhost:3000" }, "ws://127.0.0.1:4787/ws"),
    ).toBe("ws://127.0.0.1:4787/ws");
    expect(
      sessionUrl({ protocol: "http:", host: "192.168.1.20:3000" }, "ws://127.0.0.1:4787/ws"),
    ).toBe("ws://192.168.1.20:4787/ws");
  });
});

describe("openSession", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("says hello, then reconnects a device with its token and does not resend a press", () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const devices: ServerMessage[] = [];
    const session = openSession({
      url: "ws://127.0.0.1:4787/ws",
      hello: deviceHello({ formFactor: "ipad", joinCode: "048213" }),
      onWelcome: () => undefined,
      onStoryboard: () => undefined,
      onDevice: (state) => devices.push({ v: 1, type: "deviceState", payload: state }),
      onError: () => undefined,
      onLive: () => undefined,
      createSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket as unknown as WebSocket;
      },
    });
    const first = sockets[0];
    if (!first) throw new Error("socket");
    expect(session.sendControl("begin", "begin")).toBe(false);
    first.open();
    const hello = JSON.parse(first.sent[0] ?? "{}") as {
      type: string;
      payload: { joinCode?: string; token?: string };
    };
    expect(hello.type).toBe("hello");
    expect(hello.payload.joinCode).toBe("048213");
    expect(JSON.stringify(hello)).not.toContain("command");

    first.receive({
      v: 1,
      type: "welcome",
      payload: {
        clientId: "device-1",
        role: "device",
        token: "device-token-1234",
        channels: [],
        versions,
      },
    });
    expect(session.sendHold("alpha", "take")).toBe(true);
    expect(JSON.parse(first.sent[1] ?? "{}")).toMatchObject({
      type: "hold",
      payload: { hunter: "alpha", action: "take" },
    });

    first.close();
    vi.advanceTimersByTime(500);
    const second = sockets[1];
    if (!second) throw new Error("reconnect");
    second.open();
    const again = JSON.parse(second.sent[0] ?? "{}") as {
      payload: { token?: string; joinCode?: string };
    };
    expect(again.payload.token).toBe("device-token-1234");
    expect(again.payload.joinCode).toBeUndefined();
    expect(second.sent).toHaveLength(1);
    session.close();
  });

  it("does not hand a private storyboard frame to the board", () => {
    const sockets: FakeSocket[] = [];
    const boards: unknown[] = [];
    const errors: string[] = [];
    openSession({
      url: "ws://127.0.0.1:4787/ws",
      hello: storyboardHello(),
      onWelcome: () => undefined,
      onStoryboard: (state) => boards.push(state),
      onDevice: () => undefined,
      onError: (error) => errors.push(error.code),
      onLive: () => undefined,
      createSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket as unknown as WebSocket;
      },
    });
    const socket = sockets[0];
    if (!socket) throw new Error("socket");
    socket.open();
    socket.receive({
      v: 1,
      type: "storyboardState",
      payload: {
        screen: "play",
        stage: "playing",
        hunters: [],
        join: null,
        prompt: null,
        moment: {
          id: "proving-ground.02.private.alpha",
          kind: "text-card",
          text: "Only Alpha hears this.",
          still: null,
          fallbackAudio: null,
        },
        pause: null,
        tower: {
          connection: "unavailable",
          battery: { state: "unavailable" },
          calibrated: { state: "unavailable" },
        },
        gate: { canBegin: true, unheld: [] },
        lock: null,
      },
    });
    expect(boards).toEqual([]);
    expect(errors).toEqual(["invalid-payload"]);
    expect(JSON.stringify(errors)).not.toContain("Only Alpha");
  });
});
