import { cpSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { boardViewMessageSchema } from "../../protocols/v2/index.ts";
import { loadConfig } from "../config.ts";
import { openDatabase } from "../db/client.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger, type LogEntry } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower, type MockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { DEMO_LINE_ENV, DEMO_PROMPT_ID, demoLineFromEnv } from "./demoLine.ts";
import { loadStoryCatalog } from "./loadStories.ts";
import { type CoreSession, createCoreSession } from "./session.ts";

const LINE_ID = "seal-break.01~vo-01";
const CAPTION =
  "The roads are clear, and a seal breaks like an old oath giving way. Ahead stands the Ruined Keep.";
const JOIN = { code: "000000", url: "http://127.0.0.1:1/join?code=000000", reachable: true };

const dirs: string[] = [];
const closers: Array<() => void> = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const temp = (label: string) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), `bloodtower-demo-${label}-`)));
  dirs.push(dir);
  return dir;
};

const hashName = (seed: string, ext: string) => `${seed.repeat(64).slice(0, 64)}.${ext}`;

type Packed = { line?: "on-disk" | "missing" | "absent"; painting?: boolean; glow?: boolean };

/** A copy of `packs/test` with an `assets/index.json` as `assets:pack --drafts` writes it. */
const packsWith = (packed: Packed | null): string => {
  const repoPacks = loadConfig().packsDir;
  const root = temp("packs");
  cpSync(join(repoPacks, "base"), join(root, "base"), { recursive: true });
  cpSync(join(repoPacks, "test"), join(root, "test"), { recursive: true });
  if (!packed) return root;
  const assets = join(root, "test", "assets");
  const entries: Record<string, unknown> = {};
  const add = (id: string, kind: string, file: string, size: object, captions: string[] = []) => {
    entries[id] = { kind, file, size, captions, status: "draft" };
  };
  const line = packed.line ?? "on-disk";
  if (line !== "absent") {
    const file = hashName("a", "m4a");
    if (line === "on-disk") writeFileSync(join(assets, file), "line");
    add(LINE_ID, "line", file, { seconds: 5 }, [CAPTION]);
  }
  if (packed.painting ?? true) {
    writeFileSync(join(assets, hashName("b", "webp")), "painting");
    add("painting.cover", "painting", hashName("b", "webp"), { width: 1280, height: 720 });
  }
  if (packed.glow ?? true) {
    writeFileSync(join(assets, hashName("c", "webp")), "glow");
    add("glow.cover", "glow", hashName("c", "webp"), { width: 1280, height: 720 });
  }
  writeFileSync(join(assets, "index.json"), JSON.stringify({ assets: entries }));
  return root;
};

const harness = (packs: string) => {
  const dir = temp("db");
  const opened = openDatabase(join(dir, "session.sqlite"));
  closers.push(() => opened.close());
  const store = createEventStore(opened.db);
  const log = createHostLogger({ dataDir: dir, mirror: false });
  const lines: LogEntry[] = [];
  log.subscribe((entry) => lines.push(entry));
  const clock = stepClock();
  const catalog = loadStoryCatalog(packs);
  let count = 0;
  const boot = async (
    demoLine: string | null | undefined = LINE_ID,
  ): Promise<{ session: CoreSession; tower: MockTower }> => {
    count += 1;
    const tower = createMockTower({ log });
    const session = createCoreSession({
      sessionId: `session-${count}`,
      seed: "seed",
      stories: catalog.stories,
      playContent: catalog.defaultPlay,
      packVersion: "0.1.0",
      store,
      tower: bloodtowerTowerFromMock(tower),
      clock,
      log,
      onChange: () => {},
      ...(demoLine === undefined ? {} : { demoLine }),
    });
    await session.whenIdle();
    return { session, tower };
  };
  return { boot, lines };
};

const joinPad = async (session: CoreSession) => {
  const joined = session.join({ joinCode: "000000", formFactor: "ipad" });
  await session.whenIdle();
  if (!joined.ok) throw new Error("join refused");
  return joined.deviceId;
};

const demo = async (session: CoreSession, pad: string, actionId: string) => {
  session.act(pad, DEMO_PROMPT_ID, actionId, {});
  await session.whenIdle();
};

const board = (session: CoreSession) => session.projectBoard(JOIN);

describe("A1-8b-2 EV-01: the controlled demo entry plays the packed line once with the locked caption", () => {
  it("puts the line id, the exact caption, the audio id and the cover and mask ids on the board view", async () => {
    const { boot } = harness(packsWith({}));
    const { session } = await boot();
    const pad = await joinPad(session);
    expect(board(session).packedLine ?? null).toBeNull();
    await demo(session, pad, "play");
    expect(board(session).packedLine).toEqual({
      packId: "test",
      lineId: LINE_ID,
      caption: CAPTION,
      audio: LINE_ID,
      painting: "painting.cover",
      glow: "glow.cover",
      play: 1,
    });
    // The whole frame the host sends still parses: ids and text, no bytes.
    const frame = { v: 2, type: "boardView", payload: board(session) };
    expect(boardViewMessageSchema.safeParse(frame).success).toBe(true);
  });

  it("is once only: a second play does not play it again", async () => {
    const { boot, lines } = harness(packsWith({}));
    const { session } = await boot();
    const pad = await joinPad(session);
    await demo(session, pad, "play");
    await demo(session, pad, "play");
    await demo(session, pad, "play");
    expect(board(session).packedLine?.play).toBe(1);
    expect(lines.filter((line) => line.code === "demo-line-once")).toHaveLength(2);
  });

  it("an explicit replay plays it again, one play at a time", async () => {
    const { boot } = harness(packsWith({}));
    const { session } = await boot();
    const pad = await joinPad(session);
    await demo(session, pad, "replay");
    expect(board(session).packedLine ?? null).toBeNull();
    await demo(session, pad, "play");
    await demo(session, pad, "replay");
    expect(board(session).packedLine?.play).toBe(2);
    await demo(session, pad, "replay");
    expect(board(session).packedLine?.play).toBe(3);
    expect(board(session).packedLine?.caption).toBe(CAPTION);
  });

  it("is off unless the host was started for the demo", async () => {
    const { boot, lines } = harness(packsWith({}));
    const { session } = await boot(null);
    const pad = await joinPad(session);
    await demo(session, pad, "play");
    expect(board(session).packedLine ?? null).toBeNull();
    expect(lines.some((line) => line.code === "demo-line-off" && line.level === "warn")).toBe(true);
  });

  it("logs an unknown demo action as an error and plays nothing", async () => {
    const { boot, lines } = harness(packsWith({}));
    const { session } = await boot();
    const pad = await joinPad(session);
    await demo(session, pad, "loop");
    expect(board(session).packedLine ?? null).toBeNull();
    expect(lines.some((line) => line.code === "demo-line-act" && line.level === "error")).toBe(
      true,
    );
  });

  it("logs an error and plays nothing when the bound pack has no such line", async () => {
    const { boot, lines } = harness(packsWith({}));
    const { session } = await boot("seal-break.02~vo-01");
    const pad = await joinPad(session);
    await demo(session, pad, "play");
    expect(board(session).packedLine ?? null).toBeNull();
    expect(lines.some((line) => line.code === "demo-line-missing" && line.level === "error")).toBe(
      true,
    );
  });

  it("reads the line id from BLOODTOWER_DEMO_LINE and refuses a value that is not an asset id", () => {
    expect(DEMO_LINE_ENV).toBe("BLOODTOWER_DEMO_LINE");
    expect(demoLineFromEnv({ [DEMO_LINE_ENV]: LINE_ID })).toEqual({ lineId: LINE_ID });
    expect(demoLineFromEnv({})).toEqual({ lineId: null });
    expect(demoLineFromEnv({ [DEMO_LINE_ENV]: "  " })).toEqual({ lineId: null });
    const bad = demoLineFromEnv({ [DEMO_LINE_ENV]: "../assets/index.json" });
    expect(bad.lineId).toBeNull();
    expect(bad.error).toMatch(/not an asset id/u);
  });
});

describe("A1-8b-2 EV-02: cover and glow, and no portrait", () => {
  it("names the glow only when both the cover and its mask are packed", async () => {
    const noGlow = harness(packsWith({ glow: false }));
    const one = await noGlow.boot();
    await demo(one.session, await joinPad(one.session), "play");
    expect(board(one.session).packedLine).toMatchObject({
      painting: "painting.cover",
      glow: null,
    });

    const noPainting = harness(packsWith({ painting: false }));
    const two = await noPainting.boot();
    await demo(two.session, await joinPad(two.session), "play");
    expect(board(two.session).packedLine).toMatchObject({ painting: null, glow: null });
  });

  it("names no portrait or mouth anywhere in the board view", async () => {
    const { boot } = harness(packsWith({}));
    const { session } = await boot();
    await demo(session, await joinPad(session), "play");
    const text = JSON.stringify(board(session));
    expect(text).not.toMatch(/portrait|mouth|avatar/iu);
  });
});

describe("A1-8b-2 EV-05: caption only when the audio file is missing", () => {
  it("keeps the exact caption and names no audio when the line's file is not on disk", async () => {
    const { boot, lines } = harness(packsWith({ line: "missing" }));
    const { session } = await boot();
    await demo(session, await joinPad(session), "play");
    expect(board(session).packedLine).toMatchObject({
      lineId: LINE_ID,
      caption: CAPTION,
      audio: null,
      play: 1,
    });
    expect(lines.some((line) => line.code === "demo-line-audio" && line.level === "warn")).toBe(
      true,
    );
  });

  it("plays caption only from the pack row when nothing is packed", async () => {
    const { boot } = harness(packsWith(null));
    const { session } = await boot();
    await demo(session, await joinPad(session), "play");
    expect(board(session).packedLine).toEqual({
      packId: "test",
      lineId: LINE_ID,
      caption: CAPTION,
      audio: null,
      painting: null,
      glow: null,
      play: 1,
    });
  });
});

describe("A1-8b-2 EV-06: the tower is optional", () => {
  it("plays with the tower never connected, and sends the tower nothing", async () => {
    const { boot } = harness(packsWith({}));
    const { session, tower } = await boot();
    expect(session.state().tower.connection).not.toBe("connected");
    await demo(session, await joinPad(session), "play");
    expect(board(session).packedLine?.play).toBe(1);
    expect(tower.sent()).toEqual([]);
  });
});

describe("A1-8b-2 EV-11: a restore does not replay the line", () => {
  it("a restarted host on the same save has no packed line until the entry is used again", async () => {
    const packs = packsWith({});
    const { boot } = harness(packs);
    const first = await boot();
    await demo(first.session, await joinPad(first.session), "play");
    expect(board(first.session).packedLine?.play).toBe(1);
    const second = await boot();
    await second.session.resumeSession();
    expect(board(second.session).packedLine ?? null).toBeNull();
  });

  it("writes nothing about the demo into the event log or a checkpoint", async () => {
    const { boot } = harness(packsWith({}));
    const { session } = await boot();
    await demo(session, await joinPad(session), "play");
    expect(JSON.stringify(session.state())).not.toContain(LINE_ID);
  });
});
