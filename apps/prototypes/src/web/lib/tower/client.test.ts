import { type ChildProcess, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTowerClient, TowerClientError } from "./client.ts";

// Starts tower-poc's own server as a separate process with MOCK=1, on a free port and a temporary
// database. Nothing is imported from tower-poc. Never touches Bluetooth or the real tower.
const serverDir = resolve(import.meta.dirname, "../../../../../tower-poc/src/server");

const freePort = () =>
  new Promise<number>((res, rej) => {
    const s = createServer();
    s.once("error", rej);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address() as { port: number };
      s.close(() => res(port));
    });
  });

let child: ChildProcess;
let url: string;
let tmp: string;

beforeAll(async () => {
  const port = await freePort();
  tmp = mkdtempSync(join(tmpdir(), "proto-tower-"));
  url = `ws://127.0.0.1:${port}/ws`;
  child = spawn(resolve(serverDir, "node_modules/.bin/tsx"), ["index.ts"], {
    cwd: serverDir,
    env: {
      ...process.env,
      MOCK: "1",
      PORT: String(port),
      HOST: "127.0.0.1",
      DB_PATH: join(tmp, "mock.db"),
      WEB_ROOT: tmp,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stderr?.on("data", (d) => {
    output += d;
  });
  await new Promise<void>((res, rej) => {
    const t = setTimeout(() => rej(new Error(`tower-poc did not start:\n${output}`)), 30_000);
    child.stdout?.on("data", (d) => {
      output += d;
      if (String(output).includes("Tower: mock (MOCK=1)")) {
        clearTimeout(t);
        res();
      }
    });
    child.once("exit", (code) => {
      clearTimeout(t);
      rej(new Error(`tower-poc exited ${code}:\n${output}`));
    });
  });
}, 40_000);

afterAll(async () => {
  child?.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 300));
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

describe("tower client against tower-poc's mock tower", () => {
  it("opens, reports the mock tower, runs a command and reports its outcome", async () => {
    const client = createTowerClient({ url, timeoutMs: 5000 });
    expect(client.tower).toBeUndefined(); // unknown until the service says
    const welcome = await client.open();
    expect(welcome.tower).toBe("mock"); // the safety check: never a real tower in a test
    expect(client.tower).toBe("mock");
    const connected = await client.press("connect");
    expect(connected.state).toBe("connected");
    const outcome = await client.command("sound.play", { soundIndex: 1 });
    expect(outcome.ok).toBe(true);
    expect(["confirmed", "indeterminate"]).toContain(outcome.stage);
    client.close();
  }, 20_000);

  it("two clients each get their own outcome, never the other's", async () => {
    const a = createTowerClient({ url, timeoutMs: 5000 });
    const b = createTowerClient({ url, timeoutMs: 5000 });
    await a.open();
    await b.open();
    expect(a.welcome?.clientId).not.toBe(b.welcome?.clientId);
    const [good, bad] = await Promise.all([
      a.command("sound.play", { soundIndex: 1 }),
      b.command("sound.play", { soundIndex: "loud" }),
    ]);
    expect(good.ok).toBe(true);
    expect(bad.stage).toBe("rejected");
    expect(good.commandId).not.toBe(bad.commandId);
    a.close();
    b.close();
  }, 20_000);

  it("reports a rejected command as an outcome, with the field named", async () => {
    const client = createTowerClient({ url, timeoutMs: 5000 });
    await client.open();
    const outcome = await client.command("sound.play", { soundIndex: "loud" });
    expect(outcome.ok).toBe(false);
    expect(outcome.stage).toBe("rejected");
    expect(outcome.issues?.[0]?.path).toEqual(["soundIndex"]);
    client.close();
  });

  it("throws NOT_CONNECTED before open, and sends nothing", async () => {
    const client = createTowerClient({ url });
    await expect(client.command("sound.play", { soundIndex: 1 })).rejects.toMatchObject({
      code: "NOT_CONNECTED",
    });
  });

  it("throws SOCKET_FAILED when nothing listens, and does not retry", async () => {
    const port = await freePort();
    let closes = 0;
    const client = createTowerClient({
      url: `ws://127.0.0.1:${port}/ws`,
      onClose: () => closes++,
    });
    const error = await client.open().catch((e) => e);
    expect(error).toBeInstanceOf(TowerClientError);
    expect(error.code).toBe("SOCKET_FAILED");
    expect(error.shown).toContain("SOCKET_FAILED");
    await new Promise((r) => setTimeout(r, 500));
    expect(closes).toBeLessThanOrEqual(1); // no reconnect loop
  });

  it("throws NO_ANSWER, with its code, when a command gets no end stage", async () => {
    // A fake socket that answers hello and then stays silent.
    const sent: string[] = [];
    class Silent extends EventTarget {
      static OPEN = 1;
      readyState = 1;
      constructor(_url: string) {
        super();
        queueMicrotask(() => this.dispatchEvent(new Event("open")));
      }
      send(text: string) {
        sent.push(text);
        const m = JSON.parse(text);
        if (m.type === "hello")
          queueMicrotask(() =>
            this.dispatchEvent(
              new MessageEvent("message", {
                data: JSON.stringify({
                  v: 1,
                  type: "welcome",
                  correlationId: m.id,
                  payload: { clientId: "c", tower: "mock" },
                }),
              }),
            ),
          );
      }
      close() {}
    }
    const client = createTowerClient({
      url: "ws://x",
      timeoutMs: 100,
      WebSocketImpl: Silent as unknown as typeof WebSocket,
    });
    await client.open();
    const error = await client.command("sound.play", { soundIndex: 1 }).catch((e) => e);
    expect(error.code).toBe("NO_ANSWER");
    expect(error.shown).toMatch(/^NO_ANSWER: /);
    await new Promise((r) => setTimeout(r, 300));
    expect(sent.filter((s) => JSON.parse(s).type === "command")).toHaveLength(1); // no resend
  });
});
