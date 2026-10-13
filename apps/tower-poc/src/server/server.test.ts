import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROTOCOL_VERSION, serverMessageSchema } from "tower-poc-protocols";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { startTowerServer, type TowerServer, WS_PATH } from "./server.ts";

let dir: string;
let server: TowerServer;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "tower-poc-server-"));
  const webRoot = join(dir, "out");
  await mkdir(join(webRoot, "sounds"), { recursive: true });
  await writeFile(join(webRoot, "index.html"), "<h1>dashboard</h1>");
  await writeFile(join(webRoot, "lights.html"), "<h1>lights</h1>");
  await writeFile(join(webRoot, "sounds", "index.html"), "<h1>sounds</h1>");
  await writeFile(join(webRoot, "404.html"), "<h1>missing</h1>");
  await writeFile(join(dir, "secret.txt"), "outside the web root");
  server = await startTowerServer({ port: 0, host: "127.0.0.1", webRoot, serverVersion: "9.9.9" });
});

afterAll(async () => {
  await server.close();
  await rm(dir, { recursive: true, force: true });
});

/** Raw request, so the path reaches the server without client-side normalization. */
const get = (path: string, method = "GET", port = server.port) =>
  new Promise<{ status: number; type: string | undefined; body: string }>((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, method }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () =>
        resolve({ status: res.statusCode ?? 0, type: res.headers["content-type"], body }),
      );
    });
    req.on("error", reject);
    req.end();
  });

const openSocket = (path = WS_PATH) =>
  new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${server.port}${path}`);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });

const exchange = async (data: string) => {
  const socket = await openSocket();
  try {
    const reply = new Promise<string>((resolve) => {
      socket.once("message", (raw) => resolve(raw.toString()));
    });
    socket.send(data);
    return serverMessageSchema.parse(JSON.parse(await reply));
  } finally {
    socket.close();
  }
};

describe("static web UI", () => {
  it("serves index.html at the root", async () => {
    const res = await get("/");
    expect(res).toMatchObject({ status: 200, body: "<h1>dashboard</h1>" });
    expect(res.type).toBe("text/html; charset=utf-8");
  });

  it("serves exported pages as <page>.html and <page>/index.html", async () => {
    expect(await get("/lights")).toMatchObject({ status: 200, body: "<h1>lights</h1>" });
    expect(await get("/sounds")).toMatchObject({ status: 200, body: "<h1>sounds</h1>" });
    expect(await get("/sounds/")).toMatchObject({ status: 200, body: "<h1>sounds</h1>" });
  });

  it("answers unknown paths with the exported 404 page", async () => {
    expect(await get("/nope")).toMatchObject({ status: 404, body: "<h1>missing</h1>" });
  });

  it("never serves files outside the web root", async () => {
    for (const path of ["/../secret.txt", "/%2e%2e/secret.txt", "/..%2fsecret.txt"]) {
      const res = await get(path);
      expect(res.status).toBe(404);
      expect(res.body).not.toContain("outside the web root");
    }
  });

  it("rejects methods other than GET and HEAD", async () => {
    expect((await get("/", "POST")).status).toBe(405);
    expect(await get("/", "HEAD")).toMatchObject({ status: 200, body: "" });
  });
});

describe("static web UI before the first build", () => {
  it("explains that the export is missing", async () => {
    const empty = await startTowerServer({
      port: 0,
      host: "127.0.0.1",
      webRoot: join(dir, "not-built"),
      serverVersion: "9.9.9",
    });
    try {
      const res = await get("/", "GET", empty.port);
      expect(res.status).toBe(404);
      expect(res.body).toContain("Web UI is not built yet");
    } finally {
      await empty.close();
    }
  });
});

describe("WebSocket endpoint", () => {
  const hello = { v: PROTOCOL_VERSION, type: "hello", id: "m-1", payload: { clientLabel: "test" } };

  it("answers hello with welcome, correlated to the hello id", async () => {
    const reply = await exchange(JSON.stringify(hello));
    expect(reply).toMatchObject({
      type: "welcome",
      correlationId: "m-1",
      payload: { versions: { protocol: PROTOCOL_VERSION, server: "9.9.9", node: process.version } },
    });
  });

  it("gives each connection its own clientId", async () => {
    const [a, b] = await Promise.all([
      exchange(JSON.stringify(hello)),
      exchange(JSON.stringify(hello)),
    ]);
    if (a.type !== "welcome" || b.type !== "welcome") throw new Error("expected welcome");
    expect(a.payload.clientId).not.toBe(b.payload.clientId);
  });

  it.each([
    ["invalid-json", "not json"],
    ["invalid-envelope", JSON.stringify({ type: "hello", payload: {} })],
    ["unknown-type", JSON.stringify({ ...hello, type: "raw" })],
    ["invalid-payload", JSON.stringify({ ...hello, payload: { clientLabel: "" } })],
  ])("answers a bad message with error %s", async (code, data) => {
    const reply = await exchange(data);
    expect(reply).toMatchObject({ type: "error", payload: { code } });
  });

  it("refuses WebSocket upgrades on other paths", async () => {
    await expect(openSocket("/other")).rejects.toThrow();
  });
});
