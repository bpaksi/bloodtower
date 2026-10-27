import { mkdtemp, readFile, rm } from "node:fs/promises";
import { request, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMockTower } from "@dark-tower/tower/runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyDraft } from "./model.ts";
import { startServer } from "./server.ts";
import { createReviewTower, type ReviewTower } from "./tower.ts";

let dir: string;
let server: Server;
let tower: ReviewTower;
let base: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "sound-review-"));
  const mock = createMockTower({ timings: { connectMs: 10, calibrationMs: 50 } });
  tower = createReviewTower(() => mock.adapter);
  server = await startServer({
    tower,
    draft: emptyDraft(),
    loadProblems: ["sound 999 was dropped"],
    draftPath: join(dir, "data", "sounds.json"),
    publicDir: join(import.meta.dirname, "..", "public"),
    port: 0,
    now: () => 1_000,
  });
  const address = server.address();
  if (typeof address !== "object" || !address) throw new Error("no address");
  base = `http://127.0.0.1:${address.port}`;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  vi.restoreAllMocks();
  await tower.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(dir, { recursive: true, force: true });
});

const post = async (path: string, body?: unknown) => {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    // The tool's own page: a browser sends its origin on every POST.
    headers: { "content-type": "application/json", origin: base },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // biome-ignore lint/suspicious/noExplicitAny: test reads the JSON as it comes.
  return { status: res.status, body: (await res.json()) as any };
};

/** A raw request, so the test can set any Host, Origin or body type. */
const raw = (
  path: string,
  headers: Record<string, string>,
  body?: string,
  method = "POST",
): Promise<{ status: number; body: { error?: { code: string } } }> =>
  new Promise((resolve, reject) => {
    const { port } = new URL(base);
    const req = request({ host: "127.0.0.1", port, path, method, headers }, (res) => {
      let text = "";
      res.on("data", (chunk) => {
        text += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: JSON.parse(text) }));
    });
    req.on("error", reject);
    req.end(body);
  });

const waitFor = async (check: () => boolean, ms = 2_000) => {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error("timed out waiting");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

describe("sound review server", () => {
  it("connects, calibrates and plays a sound only when asked", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: test reads the JSON as it comes.
    const start = (await (await fetch(`${base}/api/state`)).json()) as any;
    expect(start.connection.state).toBe("disconnected");
    expect(start.total).toBeGreaterThan(100);

    expect((await post("/api/tower/connect")).body.connection.state).toBe("connected");
    await post("/api/tower/calibrate");
    await waitFor(() => tower.status().calibration === "calibrated");

    const played = await post("/api/command", {
      capabilityId: "sound.play",
      params: { soundIndex: 1 },
    });
    expect(played.status).toBe(200);
    expect(played.body.stages.at(-1).stage).toBe("confirmed");
  });

  it("refuses any capability but sound.play, with a code, before it reaches the tower", async () => {
    await post("/api/tower/connect");
    const before = tower.session.writes();
    const refused = await post("/api/command", {
      capabilityId: "lighting.all-on",
      params: {},
    });
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("not-offered");
    expect(tower.session.writes()).toBe(before);
  });

  it("ends a play to a tower that is not connected without a sound", async () => {
    const played = await post("/api/command", {
      capabilityId: "sound.play",
      params: { soundIndex: 1 },
    });
    expect(played.status).toBe(200);
    expect(played.body.stages.at(-1).stage).toBe("rejected");
  });

  it("refuses a session action the tower is not in a state for, with its code", async () => {
    const refused = await post("/api/tower/calibrate");
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("cannot-calibrate");
  });

  it("says where it saves and what was wrong when it loaded", async () => {
    const res = await fetch(`${base}/api/state`);
    const state = (await res.json()) as { file: string; problems: string[] };
    expect(state.file).toBe(join(dir, "data", "sounds.json"));
    expect(state.problems).toEqual(["sound 999 was dropped"]);
  });

  it("saves each change to the data file, which is the output", async () => {
    await post("/api/sound", { index: 3, soundsLike: "creature, magical", tone: "bad" });
    const saved = await post("/api/sound", { index: 3, lengthMs: 4905 });
    expect(saved.body.reviewed).toBe(1);
    const draft = JSON.parse(await readFile(join(dir, "data", "sounds.json"), "utf8"));
    expect(draft.sounds["3"]).toEqual({
      index: 3,
      soundsLike: "creature, magical",
      tone: "bad",
      lengthMs: 4905,
      updatedAt: 1_000,
    });

    expect((await post("/api/export")).status).toBe(405);
  });

  it("refuses a bad change with its code and saves nothing", async () => {
    const refused = await post("/api/sound", { index: 3, tone: "dread" });
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("bad-tone");
    await expect(readFile(join(dir, "data", "sounds.json"), "utf8")).rejects.toThrow();
  });

  it("serves the page but no file outside public/", async () => {
    expect((await fetch(`${base}/`)).status).toBe(200);
    expect((await fetch(`${base}/app.js`)).status).toBe(200);
    expect((await fetch(`${base}/..%2Fpackage.json`)).status).toBe(404);
    expect((await fetch(`${base}/src/model.ts`)).status).toBe(404);
  });

  it("refuses another site, a rebound host and a non-JSON body before the tower moves", async () => {
    const { port } = new URL(base);
    const own = `127.0.0.1:${port}`;
    const play = JSON.stringify({ capabilityId: "sound.play", params: { soundIndex: 3 } });
    const cases: [string, Record<string, string>, string | undefined, string][] = [
      [
        "/api/tower/connect",
        { host: own, origin: "http://evil.example" },
        undefined,
        "foreign-origin",
      ],
      ["/api/tower/connect", { host: own }, undefined, "foreign-origin"],
      [
        "/api/tower/connect",
        { host: `evil.example:${port}`, origin: base },
        undefined,
        "foreign-host",
      ],
      ["/api/command", { host: own, origin: base, "content-type": "text/plain" }, play, "not-json"],
      [
        "/api/command",
        { host: own, origin: "null", "content-type": "application/json" },
        play,
        "foreign-origin",
      ],
    ];
    for (const [path, headers, body, code] of cases) {
      const refused = await raw(path, headers, body);
      expect(
        [refused.status, refused.body.error?.code],
        `${path} ${JSON.stringify(headers)}`,
      ).toEqual([403, code]);
    }
    expect(
      (await raw("/api/state", { host: `evil.example:${port}` }, undefined, "GET")).status,
    ).toBe(403);
    expect(tower.status().state).toBe("disconnected");
    expect(tower.session.writes()).toBe(0);
    // The page's own requests still get through, by either local name.
    expect(
      (
        await raw("/api/tower/connect", {
          host: `localhost:${port}`,
          origin: `http://localhost:${port}`,
        })
      ).status,
    ).toBe(200);
  });

  it("keeps every change when saves arrive at once", async () => {
    const saves = await Promise.all(
      Array.from({ length: 20 }, (_, i) => post("/api/sound", { index: i + 1, tone: "good" })),
    );
    expect(saves.map((save) => save.status)).toEqual(Array(20).fill(200));
    const draft = JSON.parse(await readFile(join(dir, "data", "sounds.json"), "utf8"));
    expect(Object.keys(draft.sounds)).toHaveLength(20);
  });
});
