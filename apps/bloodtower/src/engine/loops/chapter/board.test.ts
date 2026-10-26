import { describe, expect, it } from "vitest";
import { buildBoardGraph, slottedNeighborsOf } from "./board.ts";

const kingdoms = [{ id: "N" as const, name: "North", label: "N" }];
const sp = (id: string, extra: object = {}) => ({
  id,
  name: id,
  kingdom: "N" as const,
  terrain: "grasslands",
  ...extra,
});
const slots = (board: ReturnType<typeof buildBoardGraph>) =>
  slottedNeighborsOf(board, "N-a").map((n) => [n.space.id, n.slot]);

describe("slottedNeighborsOf", () => {
  it("fills null slots in list order from N", () => {
    const board = buildBoardGraph({
      kingdoms,
      spaces: [sp("N-a", { adjacent: ["N-b", "N-c"] }), sp("N-b"), sp("N-c")],
    });
    expect(slots(board)).toEqual([
      ["N-b", "N"],
      ["N-c", "NE"],
    ]);
  });

  it("keeps set slots and fills the rest, skipping taken ones", () => {
    const board = buildBoardGraph({
      kingdoms,
      spaces: [
        sp("N-a", {
          neighbours: [{ to: "N-b", slot: null }, { to: "N-c", slot: "N" }, { to: "N-d" }],
        }),
        sp("N-b"),
        sp("N-c"),
        sp("N-d"),
      ],
    });
    expect(slots(board)).toEqual([
      ["N-b", "NE"],
      ["N-c", "N"],
      ["N-d", "E"],
    ]);
  });

  it("throws when two neighbours claim one slot", () => {
    const board = buildBoardGraph({
      kingdoms,
      spaces: [
        sp("N-a", {
          neighbours: [
            { to: "N-b", slot: "S" },
            { to: "N-c", slot: "S" },
          ],
        }),
        sp("N-b"),
        sp("N-c"),
      ],
    });
    expect(() => slots(board)).toThrow(/both claim slot S/);
  });
});
