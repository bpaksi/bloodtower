import { mkdtemp, readFile, rm } from "node:fs/promises";
import type { Server } from "node:http";
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
    draftPath: join(dir, "data", "sounds.json"),
    exportPath: join(dir, "out", "sound-feel.json"),
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
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // biome-ignore lint/suspicious/noExplicitAny: test reads the JSON as it comes.
  return { status: res.status, body: (await res.json()) as any };
};

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

  it("saves each change to the draft and exports the reviewed sounds", async () => {
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

    const exported = await post("/api/export");
    expect(exported.body.count).toBe(1);
    const file = JSON.parse(await readFile(join(dir, "out", "sound-feel.json"), "utf8"));
    expect(file).toEqual({
      version: 2,
      sounds: [
        { id: "SND-003", index: 3, soundsLike: "creature, magical", tone: "bad", lengthMs: 4905 },
      ],
    });
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
});
