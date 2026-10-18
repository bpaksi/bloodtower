import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../config.ts";
import { resolveAssetImage } from "./assets.ts";
import { loadPackDir } from "./load.ts";
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

const startPackServer = async () => {
  const loaded = loadPackDir(join(loadConfig().packsDir, "test"));
  expect(loaded.ok).toBe(true);
  if (!loaded.ok) throw new Error("pack");
  const server = createServer((req, res) => {
    void (async () => {
      if (await tryServePackAssets([loaded.assets], req, res)) return;
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found.\n");
    })();
  });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", () => resolveListen()));
  servers.push(server);
  const address = server.address();
  const port = address && typeof address === "object" ? address.port : 0;
  return { port, loaded };
};

describe("pack asset HTTP", () => {
  it("serves a declared image and refuses traversal", async () => {
    const { port } = await startPackServer();
    const base = `http://127.0.0.1:${port}`;

    const byId = await fetch(`${base}/packs/test/asset/fx.hall`);
    expect(byId.status).toBe(200);
    expect(byId.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await byId.arrayBuffer()).length).toBeGreaterThan(0);

    const byFile = await fetchDrained(`${base}/packs/test/assets/fx-hall.png`);
    expect(byFile.status).toBe(200);
    expect(byFile.headers.get("content-type")).toBe("image/png");

    const traversal = await fetchDrained(`${base}/packs/test/assets/%2e%2e%2fsecret.png`);
    expect(traversal.status).toBe(404);

    const unknown = await fetchDrained(`${base}/packs/test/assets/not-declared.png`);
    expect(unknown.status).toBe(404);

    const fakePack = await fetchDrained(`${base}/packs/other/asset/fx.hall`);
    expect(fakePack.status).toBe(404);

    for (const momentId of ["grey-stair.01", "grey-stair.04"]) {
      const camera = await fetch(`${base}/packs/test/camera/${momentId}.json`);
      expect(camera.status).toBe(200);
      expect(camera.headers.get("content-type")).toMatch(/json/);
      const body = (await camera.json()) as { id: string };
      expect(body.id).toBe(momentId);
    }

    const missingCamera = await fetchDrained(`${base}/packs/test/camera/not-a-moment.json`);
    expect(missingCamera.status).toBe(404);

    const cameraTraversal = await fetchDrained(
      `${base}/packs/test/camera/%2e%2e%2fassets%2ffx-hall.png`,
    );
    expect(cameraTraversal.status).toBe(404);

    const cameraTraversalStem = await fetchDrained(
      `${base}/packs/test/camera/%2e%2e%2fgrey-stair.04.json`,
    );
    expect(cameraTraversalStem.status).toBe(404);

    const cameraSlash = await fetchDrained(`${base}/packs/test/camera/foo%2fbar.json`);
    expect(cameraSlash.status).toBe(404);
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
