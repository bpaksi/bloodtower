import {
  appendFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../config.ts";
import { loadStoryCatalog } from "../core/loadStories.ts";
import { resolveAssetImage } from "./assets.ts";
import { tryServePackAssets } from "./serve.ts";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  for (const server of servers) {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  }
  servers.length = 0;
});

// server.close() waits for every open socket. A response whose body is never read keeps its
// socket open, and a large file then stays blocked on the socket buffer, so close() hangs.
// Read the body here so each request finishes before the test ends.
const fetchDrained = async (url: string) => {
  const res = await fetch(url);
  await res.arrayBuffer();
  return res;
};

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A temporary packs folder: the base pack and a copy of `packs/test` with one audio loop added. */
const startPackServer = async () => {
  const packs = loadConfig().packsDir;
  const root = realpathSync(mkdtempSync(join(tmpdir(), "bloodtower-serve-")));
  temps.push(root);
  cpSync(join(packs, "base"), join(root, "base"), { recursive: true });
  cpSync(join(packs, "test"), join(root, "test"), { recursive: true });
  mkdirSync(join(root, "test", "audio"));
  writeFileSync(join(root, "test", "audio", "loop.m4a"), "audio-bytes");
  // One declared audio asset beside the cover and the stills.
  writeFileSync(join(root, "test", "assets", "theme.m4a"), "theme-bytes");
  const manifest = join(root, "test", "pack.yaml");
  appendFileSync(
    manifest,
    "  - {id: music.theme, type: music, target: storyboard, status: final, path: assets/theme.m4a}\n",
  );
  const catalog = loadStoryCatalog(root);
  expect(catalog.issues).toEqual([]);
  const server = createServer((req, res) => {
    void (async () => {
      if (await tryServePackAssets(catalog.assetIndexes, req, res)) return;
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found.\n");
    })();
  });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", () => resolveListen()));
  servers.push(server);
  const address = server.address();
  const port = address && typeof address === "object" ? address.port : 0;
  return { port, root, catalog };
};

describe("pack asset HTTP (v2 paths only, C3-01 EV-06)", () => {
  it("serves the cover and a still at /packs/<id>/assets/<file> with the file's bytes", async () => {
    const { port, root } = await startPackServer();
    const base = `http://127.0.0.1:${port}`;
    for (const file of ["cover.png", "place-village.jpg"]) {
      const res = await fetch(`${base}/packs/test/assets/${file}`);
      expect(res.status, file).toBe(200);
      expect(res.headers.get("content-type"), file).toBe(
        file.endsWith(".png") ? "image/png" : "image/jpeg",
      );
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.equals(readFileSync(join(root, "test", "assets", file))), file).toBe(true);
    }
  });

  it("serves a declared audio asset at /packs/<id>/assets/<file> with the file's bytes", async () => {
    const { port } = await startPackServer();
    const res = await fetch(`http://127.0.0.1:${port}/packs/test/assets/theme.m4a`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mp4");
    expect(Buffer.from(await res.arrayBuffer()).toString("utf8")).toBe("theme-bytes");
  });

  it("still serves the mood loops at /packs/<id>/audio/<file>", async () => {
    const { port } = await startPackServer();
    const res = await fetch(`http://127.0.0.1:${port}/packs/test/audio/loop.m4a`);
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).toString("utf8")).toBe("audio-bytes");
  });

  it("answers 404 on the removed /packs/<id>/asset/<assetId> route, for an id the pack indexes", async () => {
    const { port, catalog } = await startPackServer();
    const index = catalog.assetIndexes.find((item) => item.packId === "test");
    const assetId = "place.village";
    expect(index?.byId.has(assetId)).toBe(true);
    const removed = await fetchDrained(`http://127.0.0.1:${port}/packs/test/asset/${assetId}`);
    expect(removed.status).toBe(404);
  });

  it("refuses traversal, an undeclared file and an unknown pack", async () => {
    const { port } = await startPackServer();
    const base = `http://127.0.0.1:${port}`;
    for (const path of [
      "/packs/test/assets/%2e%2e%2fpack.yaml",
      "/packs/test/assets/not-declared.png",
      "/packs/other/assets/cover.png",
      "/packs/test/camera/not-a-moment.json",
    ]) {
      const res = await fetchDrained(`${base}${path}`);
      expect(res.status, path).toBe(404);
    }
  });
});

const LINE_ID = "seal-break.01~vo-01";
const hashName = (seed: string, ext: string) => `${seed.repeat(64).slice(0, 64)}.${ext}`;

/** A copy of `packs/test` with a hand-written `assets/index.json`, as `assets:pack --drafts` writes it. */
const startPackedServer = async () => {
  const packs = loadConfig().packsDir;
  const root = realpathSync(mkdtempSync(join(tmpdir(), "bloodtower-by-id-")));
  temps.push(root);
  cpSync(join(packs, "base"), join(root, "base"), { recursive: true });
  cpSync(join(packs, "test"), join(root, "test"), { recursive: true });
  const files = {
    line: hashName("a", "m4a"),
    painting: hashName("b", "webp"),
    glow: hashName("c", "webp"),
  };
  const assets = join(root, "test", "assets");
  writeFileSync(join(assets, files.line), "line-bytes");
  writeFileSync(join(assets, files.painting), "painting-bytes");
  writeFileSync(join(assets, files.glow), "glow-bytes");
  const entry = (kind: string, file: string, size: object, captions: string[] = []) => ({
    kind,
    file,
    size,
    captions,
    status: "draft",
  });
  writeFileSync(
    join(assets, "index.json"),
    JSON.stringify({
      assets: {
        "glow.cover": entry("glow", files.glow, { width: 1280, height: 720 }),
        "painting.cover": entry("painting", files.painting, { width: 1280, height: 720 }),
        [LINE_ID]: entry("line", files.line, { seconds: 5 }, ["The roads are clear."]),
      },
    }),
  );
  const catalog = loadStoryCatalog(root);
  const server = createServer((req, res) => {
    void (async () => {
      if (await tryServePackAssets(catalog.assetIndexes, req, res)) return;
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found.\n");
    })();
  });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", () => resolveListen()));
  servers.push(server);
  const address = server.address();
  const port = address && typeof address === "object" ? address.port : 0;
  return { base: `http://127.0.0.1:${port}`, files };
};

describe("A1-8b-2 EV-03: the host serves a packed file by asset id", () => {
  it("serves a packed line, painting and glow at /packs/<id>/by-id/<assetId> with the right type", async () => {
    const { base } = await startPackedServer();
    const cases = [
      [LINE_ID, "audio/mp4", "line-bytes"],
      ["painting.cover", "image/webp", "painting-bytes"],
      ["glow.cover", "image/webp", "glow-bytes"],
    ] as const;
    for (const [id, type, body] of cases) {
      const res = await fetch(`${base}/packs/test/by-id/${encodeURIComponent(id)}`);
      expect(res.status, id).toBe(200);
      expect(res.headers.get("content-type"), id).toBe(type);
      expect(Buffer.from(await res.arrayBuffer()).toString("utf8"), id).toBe(body);
    }
    // `~` needs no escaping, so the raw id works too.
    const raw = await fetch(`${base}/packs/test/by-id/${LINE_ID}`);
    expect(raw.status).toBe(200);
    expect(Buffer.from(await raw.arrayBuffer()).toString("utf8")).toBe("line-bytes");
  });

  it("answers HEAD with the type and no body", async () => {
    const { base } = await startPackedServer();
    const res = await fetch(`${base}/packs/test/by-id/${LINE_ID}`, { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mp4");
  });

  it("answers 404 for an unknown id, a declared id the index does not name, and another pack", async () => {
    const { base } = await startPackedServer();
    for (const path of [
      "/packs/test/by-id/painting.nowhere",
      // Declared in pack.yaml and on disk, but not in index.json: the by-id route is the index only.
      "/packs/test/by-id/place.village",
      "/packs/test/by-id/portrait.loremaster",
      "/packs/other/by-id/painting.cover",
      "/packs/test/by-id/",
      "/packs/test/by-id/painting.cover/extra",
    ]) {
      const res = await fetchDrained(`${base}${path}`);
      expect(res.status, path).toBe(404);
      expect(res.headers.get("content-type"), path).toBe("text/plain; charset=utf-8");
    }
  });

  it("does not serve index.json as a listing on any route, nor a file by its hash name", async () => {
    const { base, files } = await startPackedServer();
    for (const path of [
      "/packs/test/by-id/index.json",
      "/packs/test/by-id/index",
      "/packs/test/assets/index.json",
      "/packs/test/by-id/%2e%2e%2fassets%2findex.json",
      "/packs/test/by-id/..%2Fpack.yaml",
      `/packs/test/by-id/${files.line}`,
      "/packs/test/by-id",
      "/packs/test",
    ]) {
      const res = await fetch(`${base}${path}`);
      const text = await res.text();
      expect(res.status, path).toBe(404);
      expect(text, path).not.toContain(LINE_ID);
      expect(text, path).not.toContain('"assets"');
    }
  });

  it("answers 404 when the packed file is not on disk (caption only, EV-05)", async () => {
    const packs = loadConfig().packsDir;
    const root = realpathSync(mkdtempSync(join(tmpdir(), "bloodtower-by-id-missing-")));
    temps.push(root);
    cpSync(join(packs, "base"), join(root, "base"), { recursive: true });
    cpSync(join(packs, "test"), join(root, "test"), { recursive: true });
    writeFileSync(
      join(root, "test", "assets", "index.json"),
      JSON.stringify({
        assets: {
          [LINE_ID]: {
            kind: "line",
            file: hashName("d", "m4a"),
            size: { seconds: 5 },
            captions: ["The roads are clear."],
            status: "draft",
          },
        },
      }),
    );
    const catalog = loadStoryCatalog(root);
    expect(catalog.assetIndexes.find((item) => item.packId === "test")?.indexed.has(LINE_ID)).toBe(
      false,
    );
    const server = createServer((req, res) => {
      void (async () => {
        if (await tryServePackAssets(catalog.assetIndexes, req, res)) return;
        res.writeHead(500);
        res.end();
      })();
    });
    await new Promise<void>((resolveListen) =>
      server.listen(0, "127.0.0.1", () => resolveListen()),
    );
    servers.push(server);
    const address = server.address();
    const port = address && typeof address === "object" ? address.port : 0;
    const res = await fetchDrained(`http://127.0.0.1:${port}/packs/test/by-id/${LINE_ID}`);
    expect(res.status).toBe(404);
  });
});

describe("resolveAssetImage", () => {
  it("resolves by manifest path stem in an isolated assets folder", () => {
    const dir = mkdtempSync(join(tmpdir(), "bloodtower-resolve-"));
    const assetsDir = join(dir, "assets");
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(join(assetsDir, "fx-hall.png"), "png");
    try {
      const resolved = resolveAssetImage(assetsDir, {
        id: "fx.hall",
        type: "still",
        target: "storyboard",
        status: "placeholder",
        path: "fx-hall.txt",
      });
      expect(resolved).toBe(join(realpathSync(assetsDir), "fx-hall.png"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  const asset = {
    id: "fx.hall",
    type: "still",
    target: "storyboard",
    status: "placeholder",
    path: "fx-hall.png",
  } as const;

  it("resolves when the assets folder is reached through a symlinked parent", () => {
    const dir = realpathSync(join(tmpdir()));
    const base = mkdtempSync(join(dir, "bloodtower-link-"));
    const real = join(base, "real");
    const link = join(base, "link");
    mkdirSync(join(real, "assets"), { recursive: true });
    writeFileSync(join(real, "assets", "fx-hall.png"), "png");
    symlinkSync(real, link);
    try {
      expect(resolveAssetImage(join(link, "assets"), asset)).toBe(
        join(realpathSync(real), "assets", "fx-hall.png"),
      );
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it("still rejects ../ escapes and symlinks pointing outside the assets folder", () => {
    const base = mkdtempSync(join(tmpdir(), "bloodtower-escape-"));
    const assetsDir = join(base, "assets");
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(join(base, "secret.png"), "png");
    symlinkSync(join(base, "secret.png"), join(assetsDir, "leak.png"));
    try {
      expect(resolveAssetImage(assetsDir, { ...asset, path: "../secret.png" })).toBeUndefined();
      expect(
        resolveAssetImage(assetsDir, { ...asset, id: "leak", path: "leak.png" }),
      ).toBeUndefined();
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
