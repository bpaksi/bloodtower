import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BASE_COMMIT, FIXTURE_REL, type MainPickStoryFixture } from "./captureMainPickStory.ts";

const repoRoot = resolve(import.meta.dirname, "../../../../..");
const fixture = JSON.parse(
  readFileSync(join(repoRoot, FIXTURE_REL), "utf8"),
) as MainPickStoryFixture;

// The EV-03 fixture is generated, never typed. These checks need no git: re-deriving it from the
// base commit is `captureMainPickStory.ts --check`.
describe("EV-03 fixture provenance", () => {
  it("names the base commit and the script that generated it", () => {
    expect(fixture.source.commit).toBe(BASE_COMMIT);
    expect(BASE_COMMIT).toMatch(/^[0-9a-f]{40}$/);
    expect(existsSync(join(repoRoot, fixture.source.script))).toBe(true);
  });

  it("is the catalog's raw order, sorted by pack id as the base loader sorted it", () => {
    const ids = fixture.stories.map((story) => story.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
  });

  it("is exactly the script's output format", () => {
    expect(readFileSync(join(repoRoot, FIXTURE_REL), "utf8")).toBe(
      `${JSON.stringify(fixture, null, 2)}\n`,
    );
  });
});
