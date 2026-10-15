import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROTOCOL_VERSION } from "burgomaster-funeral-poc-protocols";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createLive } from "./live.ts";
import { startHost } from "./server.ts";

const roots: string[] = [];
const closers: (() => Promise<void>)[] = [];

afterEach(async () => {
  const started = Date.now();
  for (const close of closers) await close();
  // An unread asset body must not hold the host open until the hook times out.
  expect(Date.now() - started).toBeLessThan(2_000);
  closers.length = 0;
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

const boot = async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "funeral-slice-"));
  roots.push(dataDir);
  const webRoot = mkdtempSync(join(tmpdir(), "funeral-web-"));
  roots.push(webRoot);
  const host = await startHost({
    port: 0,
    host: "127.0.0.1",
    webRoot,
    live: ({ port }) =>
      createLive({
        port,
        bindHost: "127.0.0.1",
        dataDir,
        assetsRoot: join(import.meta.dirname, "../../assets"),
      }),
  });
  closers.push(host.close);
  return host;
};

const connect = (port: number) =>
  new Promise<{ socket: WebSocket; next: () => Promise<unknown> }>((resolveOpen, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const queue: unknown[] = [];
    const waiters: ((value: unknown) => void)[] = [];
    socket.on("message", (raw) => {
      const value = JSON.parse(raw.toString()) as unknown;
      const waiter = waiters.shift();
      if (waiter) waiter(value);
      else queue.push(value);
    });
    const next = () =>
      new Promise<unknown>((resolveMessage, rejectMessage) => {
        const existing = queue.shift();
        if (existing !== undefined) {
          resolveMessage(existing);
          return;
        }
        const timer = setTimeout(() => rejectMessage(new Error("no message")), 3_000);
        waiters.push((value) => {
          clearTimeout(timer);
          resolveMessage(value);
        });
      });
    socket.once("open", () => resolveOpen({ socket, next }));
    socket.once("error", reject);
  });

describe("live slice", () => {
  it("serves a join QR, opens the gate for four hunters, and hides private files", async () => {
    const host = await boot();
    const base = `http://127.0.0.1:${host.port}`;
    const qr = await fetch(`${base}/join/qr.svg`);
    expect(qr.status).toBe(200);
    expect(qr.headers.get("content-type")).toContain("image/svg+xml");
    const svg = await qr.text();
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).not.toContain(".private.");

    const hunters = await fetch(`${base}/hunters`);
    expect(hunters.status).toBe(200);
    const roster = (await hunters.json()) as { hunter: string; portraitUrl: string }[];
    expect(roster.map((hunter) => hunter.hunter)).toEqual(["agnes", "tomas", "wren", "emeric"]);
    const portrait = await fetch(`${base}${roster[0]?.portraitUrl}`);
    expect(portrait.status).toBe(200);

    const dashboard = await connect(host.port);
    dashboard.socket.send(
      JSON.stringify({
        v: PROTOCOL_VERSION,
        type: "hello",
        payload: { role: "dashboard", clientLabel: "dashboard", formFactor: "mac" },
      }),
    );
    const welcome = (await dashboard.next()) as { type: string; payload: { token: string } };
    expect(welcome.type).toBe("welcome");
    const state = (await dashboard.next()) as {
      type: string;
      payload: { gate: { canBegin: boolean }; join: { url: string; code: string } };
    };
    expect(state.type).toBe("dashboardState");
    expect(state.payload.gate.canBegin).toBe(false);
    expect(JSON.stringify(state)).not.toContain(".private.");

    const code = state.payload.join.code;
    const device = await connect(host.port);
    device.socket.send(
      JSON.stringify({
        v: PROTOCOL_VERSION,
        type: "hello",
        payload: { role: "device", clientLabel: "ipad", formFactor: "ipad", joinCode: code },
      }),
    );
    const deviceWelcome = (await device.next()) as {
      type: string;
      payload: { token: string; clientId: string; channels: string[] };
    };
    expect(deviceWelcome.type).toBe("welcome");
    expect(deviceWelcome.payload.channels).not.toContain("dashboard");
    await device.next();

    const blocked = await fetch(
      `${base}/assets/stills/n2-burgomasters-funeral.investigate.examine-body.two-bites.private.agnes@ipad.png`,
      {
        headers: { Authorization: `Bearer ${deviceWelcome.payload.token}` },
      },
    );
    expect(blocked.status).toBe(403);
    const fromDashboard = await fetch(
      `${base}/assets/stills/n2-burgomasters-funeral.investigate.examine-body.two-bites.private.agnes@ipad.png`,
      { headers: { Authorization: `Bearer ${welcome.payload.token}` } },
    );
    expect(fromDashboard.status).toBe(403);

    for (const hunter of ["agnes", "tomas", "wren", "emeric"]) {
      device.socket.send(
        JSON.stringify({
          v: PROTOCOL_VERSION,
          type: "hold",
          payload: {
            deviceId: deviceWelcome.payload.clientId,
            hunter,
            action: "take",
            by: "device",
          },
        }),
      );
    }
    let canBegin = false;
    for (let i = 0; i < 12; i++) {
      const message = (await dashboard.next()) as {
        type: string;
        payload?: { gate?: { canBegin: boolean } };
      };
      if (message.type === "dashboardState" && message.payload?.gate?.canBegin) {
        canBegin = true;
        expect(JSON.stringify(message)).not.toContain(".private.");
        break;
      }
    }
    expect(canBegin).toBe(true);

    const clip = await fetch(`${base}/assets/clips/n2-burgomasters-funeral.01@dashboard.mp4`, {
      headers: { Authorization: `Bearer ${welcome.payload.token}` },
    });
    expect(clip.status).toBe(200);
    expect(clip.headers.get("content-type")).toBe("video/mp4");
    const poster = await fetch(
      `${base}/assets/clips/n2-burgomasters-funeral.01@dashboard.poster.png`,
      { headers: { Authorization: `Bearer ${welcome.payload.token}` } },
    );
    expect(poster.status).toBe(200);
    expect(poster.headers.get("content-type")).toContain("image/png");

    dashboard.socket.close();
    device.socket.close();
  });
});
