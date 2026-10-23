import { PROTOCOL_VERSION } from "@dark-tower/tower";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clientLabel, openServiceSocket, reconnectDelay, serviceUrl } from "./ws.ts";

/** A WebSocket stand-in the test drives by hand. */
class FakeSocket {
  static made: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen?: () => void;
  onclose?: () => void;
  onerror?: () => void;
  onmessage?: (event: { data: string }) => void;
  constructor(readonly url: string) {
    FakeSocket.made.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
  }
  open() {
    this.readyState = WebSocket.OPEN;
    this.onopen?.();
  }
  drop() {
    this.readyState = 3;
    this.onclose?.();
  }
}

const open = (onSocketState = vi.fn(), onMessage = vi.fn()) => {
  const socket = openServiceSocket({
    url: "ws://service/ws",
    label: "Mac",
    onMessage,
    onSocketState,
    createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
  });
  return { socket, onSocketState, onMessage };
};

afterEach(() => {
  FakeSocket.made = [];
  vi.useRealTimers();
});

describe("service socket", () => {
  it("says hello on open and reports itself online", () => {
    const { onSocketState } = open();
    const fake = FakeSocket.made[0];
    fake?.open();
    expect(JSON.parse(fake?.sent[0] ?? "{}")).toMatchObject({
      v: PROTOCOL_VERSION,
      type: "hello",
      payload: { clientLabel: "Mac" },
    });
    expect(onSocketState.mock.calls.map(([state]) => state)).toEqual([
      "reconnecting-to-service",
      "online",
    ]);
  });

  it("passes on valid server messages and drops the rest", () => {
    const { onMessage } = open();
    const fake = FakeSocket.made[0];
    fake?.open();
    fake?.onmessage?.({ data: "not json" });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fake?.onmessage?.({ data: JSON.stringify({ v: PROTOCOL_VERSION, type: "raw", payload: {} }) });
    const connection = {
      v: PROTOCOL_VERSION,
      type: "connection",
      payload: { state: "disconnected", calibration: "uncalibrated" },
    };
    fake?.onmessage?.({ data: JSON.stringify(connection) });
    expect(onMessage.mock.calls).toEqual([[connection]]);
  });

  it("refuses to send while the link is down, and never sends it later", () => {
    vi.useFakeTimers();
    const { socket } = open();
    expect(socket.send("connect", {}, "w-1")).toBe(false);
    FakeSocket.made[0]?.drop();
    vi.advanceTimersByTime(10_000);
    const reopened = FakeSocket.made.at(-1);
    reopened?.open();
    // Only the hello: the refused connect is gone.
    expect(reopened?.sent.map((data) => JSON.parse(data).type)).toEqual(["hello"]);
    expect(socket.send("connect", {}, "w-2")).toBe(true);
  });

  it("reconnects to the service with growing waits, and says unreachable after three failures", () => {
    vi.useFakeTimers();
    const { onSocketState } = open();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      FakeSocket.made.at(-1)?.drop();
      vi.advanceTimersByTime(reconnectDelay(attempt));
    }
    expect(FakeSocket.made).toHaveLength(4);
    expect(onSocketState.mock.calls.at(-1)).toEqual(["service-unreachable"]);
    FakeSocket.made.at(-1)?.open();
    expect(onSocketState.mock.calls.at(-1)).toEqual(["online"]);
  });

  it("calls a service that accepts the socket but never welcomes it unreachable", () => {
    vi.useFakeTimers();
    const { onSocketState } = open();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      FakeSocket.made.at(-1)?.open();
      FakeSocket.made.at(-1)?.drop();
      vi.advanceTimersByTime(reconnectDelay(attempt));
    }
    expect(onSocketState.mock.calls.map(([state]) => state)).toContain("service-unreachable");
  });

  it("stops reconnecting once closed", () => {
    vi.useFakeTimers();
    const { socket } = open();
    FakeSocket.made[0]?.drop();
    socket.close();
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.made).toHaveLength(1);
  });
});

describe("serviceUrl", () => {
  it("uses the page's own host, or the configured URL in dev", () => {
    expect(serviceUrl({ protocol: "http:", host: "192.168.1.5:4747" })).toBe(
      "ws://192.168.1.5:4747/ws",
    );
    expect(serviceUrl({ protocol: "https:", host: "tower.local" })).toBe("wss://tower.local/ws");
    expect(
      serviceUrl({ protocol: "http:", host: "localhost:3000" }, "ws://localhost:4747/ws"),
    ).toBe("ws://localhost:4747/ws");
  });
});

describe("clientLabel", () => {
  it("tells an iPad from a Mac by touch", () => {
    const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
    expect(clientLabel(mac, 0)).toBe("Mac");
    expect(clientLabel(mac, 5)).toBe("iPad");
    expect(clientLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", 5)).toBe("iPhone");
  });
});
