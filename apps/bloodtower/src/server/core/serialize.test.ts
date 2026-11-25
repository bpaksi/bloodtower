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

  it("drops an open gear panel and keeps the tower volume", () => {
    const state: ShellState = {
      ...initialShellState({ sessionId: "s1", seed: "checkpoint-seed" }),
      towerVolume: 2,
      gearPanel: "volume",
      gearPaused: true,
      gearOwner: "device-a",
      gearOpens: 3,
    };
    const restored = deserializeShellState(serializeShellState(state));
    expect(restored.gearPanel).toBeNull();
    expect(restored.gearPaused).toBe(false);
    expect(restored.gearOwner).toBeNull();
    expect(restored.gearOpens).toBe(0);
    expect(restored.towerVolume).toBe(2);
  });

  it("reads a pre-C2-11 checkpoint without drums as calibrated home (0, 0, 0)", () => {
    const state = initialShellState({ sessionId: "s1", seed: "old-save" });
    const serialized = serializeShellState(state) as Record<string, unknown>;
    delete serialized.drums;
    delete serialized.pieceCheck;
    delete serialized.unconfirmedPieces;
    const restored = deserializeShellState(
      serialized as unknown as ReturnType<typeof serializeShellState>,
    );
    expect(restored.drums).toEqual({ top: 0, middle: 0, bottom: 0 });
    expect(restored.pieceCheck).toBeNull();
    expect(restored.unconfirmedPieces).toEqual([]);
  });
});
