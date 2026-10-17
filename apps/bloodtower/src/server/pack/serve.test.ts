import { mkdirSync, rmSync, writeFileSync } from "node:fs";
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

    const byFile = await fetch(`${base}/packs/test/assets/fx-hall.png`);
    expect(byFile.status).toBe(200);

    const traversal = await fetch(`${base}/packs/test/assets/%2e%2e%2fsecret.png`);
    expect(traversal.status).toBe(404);

    const unknown = await fetch(`${base}/packs/test/assets/not-declared.png`);
    expect(unknown.status).toBe(404);

    const fakePack = await fetch(`${base}/packs/other/asset/fx.hall`);
    expect(fakePack.status).toBe(404);
  });
});

describe("resolveAssetImage", () => {
  it("resolves by manifest path stem in an isolated assets folder", () => {
    const dir = join(tmpdir(), `bloodtower-resolve-${Date.now()}`);
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
      expect(resolved).toBe(join(assetsDir, "fx-hall.png"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
