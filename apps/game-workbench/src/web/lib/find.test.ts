import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GET } from "../app/api/find/route.ts";
import { designDir } from "./content.ts";
import { searchGame } from "./find.ts";

describe("find on the real folder", () => {
  it("resolves R-ENG-6 to the requirements line that starts | R-ENG-6 |", () => {
    const hit = searchGame("R-ENG-6")[0];
    const m = /^\/doc\/requirements#L(\d+)$/.exec(hit?.href ?? "");
    expect(m).not.toBeNull();
    const lines = readFileSync(path.join(designDir(), "requirements.md"), "utf8").split("\n");
    expect(lines[Number(m?.[1]) - 1]?.startsWith("| R-ENG-6 |")).toBe(true);
  });

  it("GET /api/find?q=MEC-012 returns /?focus=MEC-012 first", async () => {
    const res = GET(new Request("http://x/api/find?q=MEC-012"));
    const body = (await res.json()) as { hits: { href: string }[] };
    expect(body.hits[0]?.href).toBe("/?focus=MEC-012");
  });
});
