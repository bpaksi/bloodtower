import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "../..");
const SKIP = new Set(["node_modules", ".next", "out", "test-results", "playwright-report"]);

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });

describe("Goodbye and Pick Game are gone (C2/06 EV-14, EV-03)", () => {
  it("has no Goodbye component, helper or idle module", () => {
    expect(existsSync(join(SRC, "web/components/GoodbyeTeardown.tsx"))).toBe(false);
    expect(existsSync(join(SRC, "web/lib/goodbye.ts"))).toBe(false);
    const idle = readdirSync(join(SRC, "server/core")).filter((name) =>
      name.startsWith("goodbyeIdle"),
    );
    expect(idle).toEqual([]);
  });

  it("names neither screen id anywhere in the source", () => {
    const quoted = /["'`](goodbye|pick-game)["'`]/;
    const hits = files(SRC)
      .filter((path) => /\.(ts|tsx|css|json)$/.test(path))
      .filter((path) => !path.endsWith("cutover.test.ts"))
      .filter((path) => quoted.test(readFileSync(path, "utf8")));
    expect(hits).toEqual([]);
  });
});
