import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { PROTOCOL_VERSION, packSchema } from "bloodtower-protocols";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import QRCode from "qrcode";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { resolveStaticFile, startHost } from "./server.ts";

const roots: string[] = [];

const makeRoot = () => {
  const root = join(tmpdir(), `bloodtower-host-${Date.now()}-${roots.length}`);
  mkdirSync(root, { recursive: true });
  roots.push(root);
  return root;
};

afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

describe("resolveStaticFile", () => {
  it("serves index.html for / and refuses a path that escapes the root", async () => {
    const root = makeRoot();
    writeFileSync(join(root, "index.html"), "<h1>Bloodtower</h1>");

    expect(await resolveStaticFile(root, "/")).toBe(join(root, "index.html"));
    expect(await resolveStaticFile(root, "/../secret.txt")).toBeUndefined();
    expect(await resolveStaticFile(root, "/%2e%2e/secret.txt")).toBeUndefined();
    expect(await resolveStaticFile(root, "/%00")).toBeUndefined();
  });
});

describe("m4a and Range", () => {
  it("sends audio/mp4 for .m4a and 206 for a byte range", async () => {
    const root = makeRoot();
    writeFileSync(join(root, "clip.m4a"), "abcdefghij");
    const host = await startHost({ port: 0, host: "127.0.0.1", webRoot: root });
    try {
      const full = await fetch(`http://127.0.0.1:${host.port}/clip.m4a`);
      expect(full.status).toBe(200);
      expect(full.headers.get("content-type")).toBe("audio/mp4");
      expect(full.headers.get("accept-ranges")).toBe("bytes");
      expect(await full.text()).toBe("abcdefghij");

      const ranged = await fetch(`http://127.0.0.1:${host.port}/clip.m4a`, {
        headers: { Range: "bytes=0-1" },
      });
      expect(ranged.status).toBe(206);
      expect(ranged.headers.get("content-type")).toBe("audio/mp4");
      expect(ranged.headers.get("content-range")).toBe("bytes 0-1/10");
      expect(await ranged.text()).toBe("ab");
    } finally {
      await host.close();
    }
  });
});

describe("startHost", () => {
  it("serves the page, reports connection-only health, and rejects other methods", async () => {
    const root = makeRoot();
    writeFileSync(join(root, "index.html"), "<h1>Bloodtower</h1>");
    const host = await startHost({ port: 0, host: "127.0.0.1", webRoot: root });
    try {
      const page = await fetch(`http://127.0.0.1:${host.port}/`);
      expect(page.status).toBe(200);
      expect(await page.text()).toContain("Bloodtower");

      const health = await fetch(`http://127.0.0.1:${host.port}/health`);
      expect(health.status).toBe(200);
      expect(await health.json()).toEqual({
        protocol: PROTOCOL_VERSION,
        tower: "connection-only",
        effects: "none",
      });

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

describe("dependencies this step pins for later steps", () => {
  it("opens an in-memory SQLite database through Drizzle and does not create the game tables", () => {
    const sqlite = new Database(":memory:");
    try {
      const db = drizzle({ client: sqlite });
      expect(db.all(sql`select 1 as n`)).toEqual([{ n: 1 }]);
      const tables = sqlite
        .prepare("select name from sqlite_master where type = 'table'")
        .all() as Array<{ name: string }>;
      expect(tables.map((table) => table.name)).not.toContain("timing_marks");
    } finally {
      sqlite.close();
    }
  });

  it("parses YAML into the pack schema and encodes a join URL as a QR", async () => {
    const parsed = parse("pack_id: test\n");
    expect(parsed).toEqual({ pack_id: "test" });
    expect(packSchema.safeParse(parsed).success).toBe(false);

    const url = "http://127.0.0.1:4787/join?code=048213";
    const qr = QRCode.create(url);
    expect(qr.modules.size).toBeGreaterThan(0);
    const svg = await QRCode.toString(url, { type: "svg" });
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("private");
  });

  it("declares the tower packages and does not import them from the host", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("./package.json", import.meta.url), "utf8"),
    ) as {
      dependencies: Record<string, string>;
    };
    expect(manifest.dependencies.ultimatedarktower).toBe("7.1.2");
    expect(manifest.dependencies.ultimatedarktowerdata).toBe("3.0.0");
    expect(manifest.dependencies["@stoprocent/noble"]).toBe("2.8.0");

    const entry = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    const host = readFileSync(new URL("./server.ts", import.meta.url), "utf8");
    expect(`${entry}\n${host}`).not.toMatch(/ultimatedarktower|@stoprocent\/noble|\bws\b/);
  });
});
