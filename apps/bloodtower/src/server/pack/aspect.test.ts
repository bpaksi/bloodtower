import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../config.ts";
import { lintPath } from "../scripts/packLint.ts";
import { jpegBytes, pngBytes, webpBytes } from "./imageFixtures.ts";

const packs = loadConfig().packsDir;

const withPack = (name: "test" | "dracula", run: (dir: string) => void) => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-aspect-"));
  try {
    cpSync(join(packs, name), dir, { recursive: true });
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const put = (dir: string, name: string, bytes: Buffer | string) =>
  writeFileSync(join(dir, "assets", name), bytes);

const aspectLines = (dir: string) =>
  lintPath(dir, process.cwd()).lines.filter((line) => line.includes("rule=V-aspect"));

describe("the repo packs", () => {
  it("lint clean: no errors, no W-fit, every still and cover 16:9", () => {
    for (const name of ["test", "dracula"]) {
      const report = lintPath(join(packs, name), process.cwd());
      expect(report.exitCode, name).toBe(0);
      expect(
        report.lines.filter((line) => line.includes("W-fit")),
        name,
      ).toEqual([]);
    }
    expect(lintPath(undefined, process.cwd()).exitCode).toBe(0);
  });
});

describe("V-aspect", () => {
  it("passes 16:9 and 1366x768 stills in any accepted format", () => {
    withPack("test", (dir) => {
      put(dir, "fx-hall.png", pngBytes(1366, 768));
      put(dir, "fx-stair.png", pngBytes(3840, 2160));
      expect(lintPath(dir, process.cwd()).exitCode).toBe(0);
    });
    withPack("test", (dir) => {
      put(dir, "fx-hall.png", jpegBytes(1920, 1080, 30_000));
      put(dir, "fx-stair.png", webpBytes("VP8X", 1280, 720));
      expect(lintPath(dir, process.cwd()).exitCode).toBe(0);
    });
  });

  it("fails a 4:3 still as an error naming the file, the asset, the size and the shape", () => {
    withPack("test", (dir) => {
      put(dir, "fx-hall.png", pngBytes(1600, 1200));
      const report = lintPath(dir, process.cwd());
      expect(report.exitCode).toBe(1);
      expect(report.lines).toHaveLength(1);
      expect(report.lines[0]).toContain("file=assets/fx-hall.png");
      expect(report.lines[0]).toContain("path=fx.hall");
      expect(report.lines[0]).toContain("rule=V-aspect");
      expect(report.lines[0]).toContain("1600x1200");
    });
  });

  it("fails a still just outside the 0.5% band", () => {
    withPack("test", (dir) => {
      put(dir, "fx-hall.png", pngBytes(1930, 1080));
      expect(lintPath(dir, process.cwd()).exitCode).toBe(1);
    });
  });

  it("fails a header that cannot be read, naming the file", () => {
    withPack("test", (dir) => {
      put(dir, "fx-hall.png", "not an image");
      const [line] = aspectLines(dir);
      expect(lintPath(dir, process.cwd()).exitCode).toBe(1);
      expect(line).toContain("file=assets/fx-hall.png");
      expect(line).toContain("cannot be read");
    });
  });

  it("skips a placeholder with no file, and a portrait of any shape", () => {
    withPack("test", (dir) => {
      // ill.setup-board is a placeholder with no file; the portraits are square already.
      put(dir, "por-alpha.png", pngBytes(1024, 1536));
      const report = lintPath(dir, process.cwd());
      expect(report.exitCode).toBe(0);
      expect(report.lines.some((line) => line.includes("ill.setup-board"))).toBe(false);
    });
  });

  it("checks the cover of a playable pack and of a metadata-only pack", () => {
    for (const name of ["test", "dracula"] as const) {
      withPack(name, (dir) => {
        put(dir, "cover.png", pngBytes(1000, 1000));
        const report = lintPath(dir, process.cwd());
        expect(report.exitCode, name).toBe(1);
        expect(report.lines[0], name).toContain("file=assets/cover.png");
        expect(report.lines[0], name).toContain("path=cover");
        expect(report.lines[0], name).toContain("rule=V-aspect");
      });
    }
  });
});
