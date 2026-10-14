import { describe, expect, it, vi } from "vitest";
import type { WebSocket } from "ws";
import { createClientHub } from "./clientHub.ts";

/** Enough of a ws socket for the hub: its state, send and terminate. */
const fakeSocket = (open = true) => {
  const socket = {
    OPEN: 1,
    readyState: open ? 1 : 3,
    send: vi.fn(),
    terminate: vi.fn(),
  };
  return socket as typeof socket & WebSocket;
};

const message = {
  v: 1,
  type: "connection",
  payload: { state: "connected", calibration: "uncalibrated" },
} as const;

describe("client hub", () => {
  it("gives each socket its own id and time, and forgets it on remove", () => {
    const hub = createClientHub(() => 42);
    const a = fakeSocket();
    const b = fakeSocket();
    const first = hub.add(a);
    const second = hub.add(b);
    expect(first.id).not.toBe(second.id);
    expect(first.connectedAt).toBe(42);
    expect(hub.get(a)).toBe(first);
    hub.remove(a);
    expect(hub.get(a)).toBeUndefined();
    expect(hub.clients()).toEqual([second]);
  });

  it("broadcasts to every open client, once serialised, and skips closed ones", () => {
    const hub = createClientHub();
    const a = fakeSocket();
    const b = fakeSocket();
    const closing = fakeSocket(false);
    for (const socket of [a, b, closing]) hub.add(socket);
    hub.broadcast(message);
    expect(a.send).toHaveBeenCalledWith(JSON.stringify(message));
    expect(b.send).toHaveBeenCalledWith(JSON.stringify(message));
    expect(closing.send).not.toHaveBeenCalled();
  });

  it("drops every connection on closeAll", () => {
    const hub = createClientHub();
    const a = fakeSocket();
    hub.add(a);
    hub.closeAll();
    expect(a.terminate).toHaveBeenCalled();
    expect(hub.clients()).toEqual([]);
  });
});
