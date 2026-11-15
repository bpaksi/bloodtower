import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROTOCOL_VERSION, type ServerMessage, serverMessageSchema } from "bloodtower-protocols";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { skullNoBuildingEffect } from "../../engine/loops/session/effects.ts";
import { loadConfig } from "../config.ts";
import { createHostLogger } from "../log/hostLog.ts";
import { createMockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { type SessionHost, startSessionHost } from "./host.ts";

const dirs: string[] = [];
const hosts: SessionHost[] = [];
const sockets: WebSocket[] = [];

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.close();
  for (const host of hosts.splice(0)) await host.close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-toast-"));
  dirs.push(dir);
  return dir;
};

describe("CU/03 EV-15 the skull-no-building error reaches the Story board", () => {
  it("an error logged with that code arrives on the board socket as a logged toast", async () => {
    const root = tempDir();
    writeFileSync(join(root, "index.html"), "<h1>Bloodtower</h1>");
    const log = createHostLogger({ dataDir: tempDir(), mirror: false });
    const host = await startSessionHost({
      port: 0,
      host: "127.0.0.1",
      webRoot: root,
      packsDir: loadConfig().packsDir,
      databasePath: join(tempDir(), "session.sqlite"),
      tower: bloodtowerTowerFromMock(createMockTower()),
      towerWatchMs: 0,
      log,
    });
    hosts.push(host);
    const socket = new WebSocket(`ws://127.0.0.1:${host.port}/ws`);
    sockets.push(socket);
    const messages: ServerMessage[] = [];
    socket.on("message", (raw) => {
      messages.push(serverMessageSchema.parse(JSON.parse(String(raw))));
    });
    await new Promise<void>((resolve, reject) => {
      socket.once("open", () => resolve());
      socket.once("error", reject);
    });
    socket.send(
      JSON.stringify({
        v: PROTOCOL_VERSION,
        type: "hello",
        payload: { role: "storyboard", clientLabel: "Story board", formFactor: "mac" },
      }),
    );
    const waitFor = async (ready: () => boolean) => {
      const started = Date.now();
      while (!ready()) {
        if (Date.now() - started > 5000) throw new Error("timed out waiting for the board");
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    };
    await waitFor(() => messages.some((message) => message.type === "boardView"));

    // What the core session does with the engine's skull-no-building effect (session.ts).
    const effect = skullNoBuildingEffect(3);
    log.error(effect.code, effect.message, { device: null });

    await waitFor(() => messages.some((message) => message.type === "logged"));
    const toast = messages.find((message) => message.type === "logged");
    expect(toast?.type === "logged" ? toast.payload.code : null).toBe("skull-no-building");
    expect(toast?.type === "logged" ? toast.payload.message : null).toBe(effect.message);
  });
});
