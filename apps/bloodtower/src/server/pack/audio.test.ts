import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../config.ts";
import { devAudioAllowOrigin, indexPackAudio, isAudioPath, validateAudioFolder } from "./audio.ts";
import { loadPackDir, loadR1Pack, type PackLoadIssue } from "./load.ts";
import { tryServePackAssets } from "./serve.ts";

const packsDir = () => loadConfig().packsDir;

const temps: string[] = [];
const copyPack = (id: string) => {
  // The loader passes a real path (macOS tmp is a symlink), so the copy is resolved the same way.
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "bloodtower-audio-")));
  temps.push(dir);
  cpSync(join(packsDir(), id), dir, { recursive: true });
  return dir;
};

let server: Server | undefined;
afterEach(async () => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;
  }
});

const issuesFor = (dir: string): PackLoadIssue[] => {
  const issues: PackLoadIssue[] = [];
  validateAudioFolder(dir, (item) => issues.push(item));
  return issues;
};

describe("pack audio folder", () => {
  it("loads the Proving Ground loops from packs/test/audio and indexes them by file name", () => {
    const result = loadR1Pack(packsDir());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect([...result.assets.audio.byFile.keys()].sort()).toEqual([
      "night1-ambient.m4a",
      "night2-ambient.m4a",
      "pg-music.m4a",
      "startup-ambient.m4a",
    ]);
  });

  it("accepts flat .m4a files only", () => {
    const dir = copyPack("test");
    mkdirSync(join(dir, "audio"), { recursive: true });
    writeFileSync(join(dir, "audio", "extra.m4a"), "x");
    expect(issuesFor(dir)).toEqual([]);
  });

  it("refuses a WAV master, a subfolder, and a file that is not audio", () => {
    const dir = copyPack("test");
    writeFileSync(join(dir, "audio", "master.wav"), "x");
    mkdirSync(join(dir, "audio", "nested"));
    const messages = issuesFor(dir).map((item) => `${item.file}: ${item.message}`);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining("audio/master.wav: V-1: An audio file must be an .m4a file."),
        expect.stringContaining("audio/nested: V-1: The audio folder has no subfolders."),
      ]),
    );
  });

  it("makes a playable pack with a bad audio file fail the load", () => {
    const dir = copyPack("test");
    writeFileSync(join(dir, "audio", "master.wav"), "x");
    const result = loadPackDir(dir);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((item) => item.rule)).toContain("V-1");
  });

  it("ignores the audio folder in a metadata-only pack (playable: false)", () => {
    const dir = copyPack("dracula");
    mkdirSync(join(dir, "audio"));
    writeFileSync(join(dir, "audio", "master.wav"), "x");
    const result = loadPackDir(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.playable).toBe(false);
  });

  it("indexes nothing when the pack has no audio folder", () => {
    const dir = copyPack("dracula");
    expect(indexPackAudio(dir).byFile.size).toBe(0);
  });

  it("serves a declared loop at /packs/<id>/audio/<file> and refuses everything else", async () => {
    const result = loadR1Pack(packsDir());
    if (!result.ok) throw new Error("the test pack must load");
    const catalogs = [result.assets];
    server = createServer((req, res) => {
      void tryServePackAssets(catalogs, req, res).then((handled) => {
        if (!handled) res.writeHead(418).end();
      });
    });
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("no port");
    const base = `http://127.0.0.1:${address.port}`;

    const ok = await fetch(`${base}/packs/test/audio/startup-ambient.m4a`);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("audio/mp4");
    await ok.arrayBuffer();

    for (const path of [
      "/packs/test/audio/missing.m4a",
      "/packs/test/audio/..%2Fpack.yaml",
      "/packs/test/audio/nested%2Fpg-music.m4a",
      "/packs/test/audio/pg-music.wav",
      "/packs/nope/audio/pg-music.m4a",
    ]) {
      const response = await fetch(`${base}${path}`);
      expect(response.status, path).toBe(404);
      await response.arrayBuffer();
    }
  });
});

describe("devAudioAllowOrigin (pnpm dev board on another port)", () => {
  const dev = ["http://localhost:3000"];

  it("matches only the audio routes", () => {
    expect(isAudioPath("/audio/signature/signature-bed.m4a")).toBe(true);
    expect(isAudioPath("/packs/test/audio/pg-music.m4a")).toBe(true);
    expect(isAudioPath("/packs/test/assets/cover.png")).toBe(false);
    expect(isAudioPath("/landing/window.png")).toBe(false);
  });

  it("allows a listed dev origin on an audio route", () => {
    expect(devAudioAllowOrigin("/audio/signature/motif-sting.m4a", dev[0], dev)).toBe(dev[0]);
    expect(devAudioAllowOrigin("/packs/test/audio/night1-ambient.m4a", dev[0], dev)).toBe(dev[0]);
  });

  it("allows a LAN dev origin, as the session socket does under pnpm dev", () => {
    expect(devAudioAllowOrigin("/audio/x.m4a", "http://192.168.1.20:3000", dev)).toBe(
      "http://192.168.1.20:3000",
    );
  });

  it("allows nothing outside dev, off the audio routes, or for other origins", () => {
    expect(devAudioAllowOrigin("/audio/x.m4a", dev[0], [])).toBeUndefined();
    expect(devAudioAllowOrigin("/packs/test/assets/cover.png", dev[0], dev)).toBeUndefined();
    expect(devAudioAllowOrigin("/audio/x.m4a", "https://evil.example", dev)).toBeUndefined();
    expect(devAudioAllowOrigin("/audio/x.m4a", undefined, dev)).toBeUndefined();
  });
});
