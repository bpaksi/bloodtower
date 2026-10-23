import { PROTOCOL_VERSION } from "bloodtower-protocols";
import { describe, expect, it, vi } from "vitest";
import { deviceHello, openSession, storyboardHello } from "./session";

describe("openSession v2", () => {
  it("sends hello and surfaces boardView", async () => {
    const sends: string[] = [];
    const socket = {
      readyState: 1,
      send: (raw: string) => {
        sends.push(raw);
      },
      close: () => undefined,
      onopen: null as (() => void) | null,
      onmessage: null as ((event: { data: string }) => void) | null,
      onclose: null as (() => void) | null,
    };
    const boards: unknown[] = [];
    openSession({
      url: "ws://127.0.0.1/ws",
      hello: storyboardHello(),
      createSocket: () => socket as unknown as WebSocket,
      onLive: () => undefined,
      onWelcome: () => undefined,
      onBoardView: (payload) => boards.push(payload),
      onDeviceView: () => undefined,
      onError: () => undefined,
    });
    socket.onopen?.();
    expect(JSON.parse(sends[0] ?? "{}").v).toBe(PROTOCOL_VERSION);
    socket.onmessage?.({
      data: JSON.stringify({
        v: PROTOCOL_VERSION,
        type: "boardView",
        payload: {
          screen: "pick-game",
          levels: [{ id: "join", label: "Join", shows: "Code 000000" }],
          heroes: [],
          narration: null,
          actions: [],
        },
      }),
    });
    expect(boards).toHaveLength(1);
  });

  it("refuses act when the socket is closed", () => {
    const socket = {
      readyState: 3,
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onclose: null,
    };
    const client = openSession({
      url: "ws://127.0.0.1/ws",
      hello: deviceHello({ formFactor: "ipad", joinCode: "123456" }),
      createSocket: () => socket as unknown as WebSocket,
      onLive: () => undefined,
      onWelcome: () => undefined,
      onBoardView: () => undefined,
      onDeviceView: () => undefined,
      onError: () => undefined,
    });
    expect(client.sendAct("new-pick-game", "new-game")).toBe(false);
  });
});
