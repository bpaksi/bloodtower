import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROTOCOL_VERSION } from "burgomaster-funeral-poc-protocols";
import { afterEach, describe, expect, it } from "vitest";
import { resolveStaticFile, startHost } from "./server.ts";

const roots: string[] = [];

const makeRoot = () => {
  const root = join(tmpdir(), `funeral-host-${Date.now()}-${roots.length}`);
  mkdirSync(root, { recursive: true });
  roots.push(root);
  return root;
};

afterEach(() => {
  roots.length = 0;
});

describe("resolveStaticFile", () => {
  it("serves index.html for / and refuses a path that escapes the root", async () => {
    const root = makeRoot();
    writeFileSync(join(root, "index.html"), "<h1>Burgomaster's Funeral POC</h1>");
    writeFileSync(join(tmpdir(), "secret.txt"), "nope");

    expect(await resolveStaticFile(root, "/")).toBe(join(root, "index.html"));
    expect(await resolveStaticFile(root, "/../secret.txt")).toBeUndefined();
    expect(await resolveStaticFile(root, "/%2e%2e/secret.txt")).toBeUndefined();
    expect(await resolveStaticFile(root, "/%00")).toBeUndefined();
  });
});

describe("startHost", () => {
  it("serves the door, reports health with no tower, and rejects other methods", async () => {
    const root = makeRoot();
    writeFileSync(join(root, "index.html"), "<h1>Burgomaster's Funeral POC</h1>");
    const host = await startHost({ port: 0, host: "127.0.0.1", webRoot: root });
    try {
      const page = await fetch(`http://127.0.0.1:${host.port}/`);
      expect(page.status).toBe(200);
      expect(await page.text()).toContain("Burgomaster's Funeral POC");

      const health = await fetch(`http://127.0.0.1:${host.port}/health`);
      expect(health.status).toBe(200);
      expect(await health.json()).toEqual({ protocol: PROTOCOL_VERSION, towerUsed: false });

      const posted = await fetch(`http://127.0.0.1:${host.port}/health`, { method: "POST" });
      expect(posted.status).toBe(405);

      const missing = await fetch(`http://127.0.0.1:${host.port}/missing`);
      expect(missing.status).toBe(404);
    } finally {
      await host.close();
    }
  });

  it("says the UI is not built when the export is missing", async () => {
    const host = await startHost({ port: 0, host: "127.0.0.1", webRoot: makeRoot() });
    try {
      const page = await fetch(`http://127.0.0.1:${host.port}/`);
      expect(page.status).toBe(404);
      expect(await page.text()).toMatch(/not built/i);
    } finally {
      await host.close();
    }
  });
});
