import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { GET } from "../app/api/find/route.ts";
import { designDir } from "./content.ts";
import { getFindIndex, searchGame } from "./find.ts";

// The first search reads and indexes the whole real design folder, which can pass vitest's 5000 ms
// default on a loaded CI runner (#162). Build the index once in beforeAll, with a long hook
// timeout, so the tests below only hit the cache. Their assertions are unchanged.
describe("find on the real folder", () => {
  beforeAll(() => {
    getFindIndex();
  }, 60_000);

  it("resolves R-ENG-6 to the requirements line that starts | R-ENG-6 |", () => {
    const hit = searchGame("R-ENG-6")[0];
    const m = /^\/doc\/requirements#L(\d+)$/.exec(hit?.href ?? "");
    expect(m).not.toBeNull();
    const lines = readFileSync(path.join(designDir(), "requirements.md"), "utf8").split("\n");
    expect(lines[Number(m?.[1]) - 1]?.startsWith("| R-ENG-6 |")).toBe(true);
  });

  it("GET /api/find?q=MEC-012 returns /?focus=MEC-012 first", { timeout: 30_000 }, async () => {
    const res = GET(new Request("http://x/api/find?q=MEC-012"));
    const body = (await res.json()) as { hits: { href: string }[] };
    expect(body.hits[0]?.href).toBe("/?focus=MEC-012");
  });
});

describe("find index cache (#126)", () => {
  it("hands out the same index while the folders are unchanged", () => {
    expect(getFindIndex()).toBe(getFindIndex());
  });
});
