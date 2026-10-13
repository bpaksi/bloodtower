import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveStaticFile } from "./static.ts";

let dir: string;
let root: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "tower-poc-static-"));
  root = join(dir, "out");
  await mkdir(join(root, "sounds"), { recursive: true });
  await writeFile(join(root, "index.html"), "dashboard");
  await writeFile(join(root, "lights.html"), "lights");
  await writeFile(join(root, "sounds", "index.html"), "sounds");
  await writeFile(join(dir, "secret.txt"), "outside");
  await writeFile(join(dir, "out.html"), "sibling");
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("resolveStaticFile", () => {
  it("maps export paths to files inside the root", async () => {
    expect(await resolveStaticFile(root, "/")).toBe(join(root, "index.html"));
    expect(await resolveStaticFile(root, "/lights")).toBe(join(root, "lights.html"));
    expect(await resolveStaticFile(root, "/lights.html")).toBe(join(root, "lights.html"));
    expect(await resolveStaticFile(root, "/sounds")).toBe(join(root, "sounds", "index.html"));
    expect(await resolveStaticFile(root, "/sounds/")).toBe(join(root, "sounds", "index.html"));
  });

  it("returns undefined for a path with no file", async () => {
    expect(await resolveStaticFile(root, "/nope")).toBeUndefined();
  });

  // These reach the function as written. An HTTP client or `new URL` would normalize some of them first.
  it.each([
    "/../secret.txt",
    "/%2e%2e/secret.txt",
    "/..%2fsecret.txt",
    "/%2e%2e%2fsecret.txt",
    "/sounds/../../secret.txt",
    "/..",
    "/../out.html",
  ])("never resolves %s to a file outside the root", async (path) => {
    expect(await resolveStaticFile(root, path)).toBeUndefined();
  });

  it("does not treat <root>.html as the root page", async () => {
    expect(await resolveStaticFile(root, "")).toBe(join(root, "index.html"));
    expect(await resolveStaticFile(root, "/.")).toBe(join(root, "index.html"));
  });

  it("rejects malformed escapes and NUL bytes", async () => {
    expect(await resolveStaticFile(root, "/%E0%A4%A")).toBeUndefined();
    expect(await resolveStaticFile(root, "/lights%00.html")).toBeUndefined();
  });
});
