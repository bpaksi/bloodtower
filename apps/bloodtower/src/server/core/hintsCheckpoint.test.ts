import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hintsOn } from "../../engine/hints/flow.ts";
import { projectShellView } from "../../engine/loops/session/view.ts";
import { parseShellCheckpoint } from "./shellCheckpoint.ts";

describe("CU/09 an older checkpoint (EV-12)", () => {
  it("loads from before this feature with Hints on and nothing shown", () => {
    const fixture = JSON.parse(
      readFileSync(join(import.meta.dirname, "fixtures", "pre-c2-05-checkpoint.json"), "utf8"),
    ) as { engineVersion: string; state: Record<string, unknown> };
    expect(fixture.state).not.toHaveProperty("hintsShown");
    const state = parseShellCheckpoint({ ...fixture.state, version: fixture.engineVersion });
    expect(state.hintsShown).toEqual([]);
    expect(state.hint).toBeNull();
    expect(state.hintQueue).toEqual([]);
    expect(hintsOn(state)).toBe(true);
    // It projects without an error and shows no hint.
    expect(projectShellView(state).hint).toBeNull();
  });
});
