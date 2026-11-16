import { describe, expect, it } from "vitest";
import { initialShellState } from "../../engine/loops/session/state.ts";
import { parseShellCheckpoint, shellCheckpointFromState } from "./shellCheckpoint.ts";

// CU/15 survival invariant: a purse already set is not re-spun, and no cue survives a restart.
describe("a save and the starting purse", () => {
  it("keeps the set purse and clears the coin cue, so nothing plays after Continue (EV-14, EV-15)", () => {
    const base = initialShellState({ sessionId: "s1", seed: "cu-15-save" });
    const saved = JSON.parse(
      JSON.stringify(shellCheckpointFromState({ ...base, startingPurse: 30, purseCue: 1 })),
    );
    const restored = parseShellCheckpoint(saved);
    expect(restored.startingPurse).toBe(30);
    expect(restored.purseCue).toBe(0);
  });

  it("reads a save from before CU/15 as never spun", () => {
    const base = initialShellState({ sessionId: "s1", seed: "cu-15-old" });
    const saved = JSON.parse(JSON.stringify(shellCheckpointFromState(base)));
    delete saved.startingPurse;
    delete saved.purseCue;
    expect(parseShellCheckpoint(saved).startingPurse).toBeNull();
  });
});
