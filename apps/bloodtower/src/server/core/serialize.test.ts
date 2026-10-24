import { describe, expect, it } from "vitest";
import { initPlayState } from "../../engine/loops/chapter/playState.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { initialShellState, type ShellState } from "../../engine/loops/session/state.ts";
import { deserializeShellState, serializeShellState } from "./serialize.ts";

describe("serializeShellState", () => {
  it("rehydrates the board graph after checkpoint JSON round-trip", () => {
    const state: ShellState = {
      ...initialShellState({ sessionId: "s1", seed: "checkpoint-seed" }),
      play: initPlayState("checkpoint-seed", PROVING_GROUNDS_PLAY),
    };
    const spaceId = state.play?.groups[0]?.spaceId;
    expect(spaceId).toBeTruthy();
    expect(state.play?.content.board.spaceById.size).toBeGreaterThan(10);

    const json = JSON.stringify(serializeShellState(state));
    expect(json).not.toContain('"spaceById":{}');

    const restored = deserializeShellState(
      JSON.parse(json) as ReturnType<typeof serializeShellState>,
    );
    expect(restored.play?.content.board.spaceById.size).toBe(
      state.play?.content.board.spaceById.size,
    );
    expect(restored.play?.content.board.spaceById.get(spaceId ?? "")).toMatchObject({
      id: spaceId,
    });
  });
});
