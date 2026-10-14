import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROTOCOL_VERSION, serverMessageSchema } from "tower-poc-protocols";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { isAllowedOrigin, startTowerServer, type TowerServer, WS_PATH } from "./server.ts";

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
  // A sibling of the web root whose name is the root plus ".html".
  await writeFile(join(dir, "out.html"), "<h1>sibling of the web root</h1>");
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

const upgradeRequest = (path: string) =>
  [
    `GET ${path} HTTP/1.1`,
    "Host: 127.0.0.1",
    "Upgrade: websocket",
    "Connection: Upgrade",
    "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==",
    "Sec-WebSocket-Version: 13",
    "",
    "",
  ].join("\r\n");

/**
 * Raw TCP exchange, for input a WebSocket or HTTP client would refuse to send.
 * Writes `first`, then writes `afterReply` once the server has answered.
 * Resolves when the server closes the connection or after `waitMs`.
 */
const rawExchange = (
  first: string,
  options: { afterReply?: Buffer; port?: number; allowHalfOpen?: boolean; waitMs?: number } = {},
) =>
  new Promise<{ received: string; closed: boolean }>((resolve, reject) => {
    const socket = connect({
      host: "127.0.0.1",
      port: options.port ?? server.port,
      allowHalfOpen: options.allowHalfOpen ?? false,
    });
    let received = "";
    let sentSecond = false;
    const finish = (closed: boolean) => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ received, closed });
    };
    const timer = setTimeout(() => finish(false), options.waitMs ?? 1000);
    socket.on("connect", () => socket.write(first));
    socket.on("data", (chunk) => {
      received += chunk.toString("latin1");
      if (options.afterReply && !sentSecond) {
        sentSecond = true;
        socket.write(options.afterReply);
      }
    });
    socket.on("close", () => finish(true));
    socket.on("error", reject);
  });

const openSocket = (path = WS_PATH, origin?: string, port = server.port) =>
  new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`, origin ? { origin } : {});
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

  it("serves index.html at the root even when <root>.html exists beside the root", async () => {
    const res = await get("/");
    expect(res).toMatchObject({ status: 200, body: "<h1>dashboard</h1>" });
  });

  it("answers a request target that is not a valid URL with 400", async () => {
    const res = await rawExchange(
      "GET // HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n",
    );
    expect(res.received).toMatch(/^HTTP\/1\.1 400 /);
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

describe("isAllowedOrigin (D20)", () => {
  const host = "192.168.1.20:4747";

  it("accepts the origin the request was sent to, whichever address that is", () => {
    expect(isAllowedOrigin("http://192.168.1.20:4747", host)).toBe(true);
    expect(isAllowedOrigin("http://localhost:4747", "localhost:4747")).toBe(true);
    expect(isAllowedOrigin("http://towermac.local:4747", "towermac.local:4747")).toBe(true);
  });

  it("refuses another site, another port and another host", () => {
    expect(isAllowedOrigin("https://evil.example", host)).toBe(false);
    expect(isAllowedOrigin("http://192.168.1.20:3000", host)).toBe(false);
    expect(isAllowedOrigin("http://192.168.1.21:4747", host)).toBe(false);
    expect(isAllowedOrigin("http://192.168.1.20:4747.evil.example", host)).toBe(false);
  });

  it("refuses an origin that is not a web origin", () => {
    expect(isAllowedOrigin("null", host)).toBe(false);
    expect(isAllowedOrigin("", host)).toBe(false);
    expect(isAllowedOrigin("file://", host)).toBe(false);
    expect(isAllowedOrigin("chrome-extension://192.168.1.20:4747", host)).toBe(false);
  });

  it("accepts a request with no Origin header: that is a script or a test, not a web page", () => {
    expect(isAllowedOrigin(undefined, host)).toBe(true);
  });

  it("refuses an origin when the request has no Host to compare it with", () => {
    expect(isAllowedOrigin("http://192.168.1.20:4747", undefined)).toBe(false);
  });

  it("accepts a dev origin only when it is listed, and only on an exact match", () => {
    const dev = ["http://localhost:3000"];
    expect(isAllowedOrigin("http://localhost:3000", host, dev)).toBe(true);
    expect(isAllowedOrigin("http://localhost:3000", host)).toBe(false);
    expect(isAllowedOrigin("http://localhost:3001", host, dev)).toBe(false);
    expect(isAllowedOrigin("http://localhost:3000.evil.example", host, dev)).toBe(false);
  });
});

describe("WebSocket origin check (D20)", () => {
  const refused = (origin: string, port = server.port) =>
    openSocket(WS_PATH, origin, port).then(
      (socket) => {
        socket.close();
        return "accepted";
      },
      (error: Error) => error.message,
    );

  it("accepts the service's own origin and a request with no Origin", async () => {
    const own = await openSocket(WS_PATH, `http://127.0.0.1:${server.port}`);
    own.close();
    const none = await openSocket();
    none.close();
  });

  it("refuses another origin with 403, before any message is read", async () => {
    expect(await refused("https://evil.example")).toMatch(/403/);
    expect(await refused(`http://localhost:${server.port}`)).toMatch(/403/);
    expect(await refused("null")).toMatch(/403/);
  });

  it("accepts the next dev origin only on a service started with it", async () => {
    const dev = "http://localhost:3000";
    expect(await refused(dev)).toMatch(/403/);
    const devServer = await startTowerServer({
      port: 0,
      host: "127.0.0.1",
      webRoot: join(dir, "out"),
      serverVersion: "9.9.9",
      devOrigins: [dev],
    });
    try {
      expect(await refused(dev, devServer.port)).toBe("accepted");
      expect(await refused("https://evil.example", devServer.port)).toMatch(/403/);
    } finally {
      await devServer.close();
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
    // No executor yet (M2 step 5): a valid command is answered, and goes nowhere.
    [
      "not-implemented",
      JSON.stringify({
        ...hello,
        type: "command",
        payload: { capabilityId: "sound.play", params: { soundIndex: 1 } },
      }),
    ],
    ["not-implemented", JSON.stringify({ ...hello, type: "calibrate", payload: {} })],
  ])("answers a bad message with error %s", async (code, data) => {
    const reply = await exchange(data);
    expect(reply).toMatchObject({ type: "error", payload: { code } });
  });

  it("refuses WebSocket upgrades on other paths", async () => {
    await expect(openSocket("/other")).rejects.toThrow();
  });

  it("survives a client that sends an invalid WebSocket frame", async () => {
    // Client frames must be masked. This one is not, which is a protocol error.
    const unmaskedTextFrame = Buffer.from([0x81, 0x02, 0x68, 0x69]);
    const res = await rawExchange(upgradeRequest(WS_PATH), { afterReply: unmaskedTextFrame });
    expect(res.received).toMatch(/^HTTP\/1\.1 101 /);
    expect(res.closed).toBe(true);

    expect(await exchange(JSON.stringify(hello))).toMatchObject({ type: "welcome" });
  });

  it("survives an upgrade request whose target is not a valid URL", async () => {
    const res = await rawExchange(upgradeRequest("//"));
    expect(res.received).toMatch(/^HTTP\/1\.1 (400|404) /);
    expect(res.closed).toBe(true);

    expect(await exchange(JSON.stringify(hello))).toMatchObject({ type: "welcome" });
  });

  it("closes promptly after refusing an upgrade from a client that stays connected", async () => {
    const own = await startTowerServer({
      port: 0,
      host: "127.0.0.1",
      webRoot: join(dir, "out"),
      serverVersion: "9.9.9",
    });
    const lingering = connect({ host: "127.0.0.1", port: own.port, allowHalfOpen: true });
    try {
      await new Promise<void>((resolve, reject) => {
        lingering.on("error", reject);
        lingering.on("connect", () => lingering.write(upgradeRequest("/other")));
        lingering.once("data", () => resolve());
      });
      const closed = await Promise.race([
        own.close().then(() => true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1500)),
      ]);
      expect(closed, "close() should not wait for the refused client").toBe(true);
    } finally {
      lingering.destroy();
    }
  });
});
