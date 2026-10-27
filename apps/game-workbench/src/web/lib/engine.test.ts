import { describe, expect, it } from "vitest";
import { loadCards } from "./cards.ts";
import {
  compile,
  flatNodes,
  loadLoops,
  loopTree,
  parseRailroad,
  splitLabel,
  triggers,
} from "./engine.ts";

const BLOCK = `
enter
  .1  check   Continuing?                 DEC-283
    track no
      .2  change  Set up                  DEC-133 DEC-134
    track yes
body
  repeat
    .3  call    Day loop                  MEC-034
    .4  check   Done? No: again           DEC-041
end
`;

describe("splitLabel", () => {
  it("takes the trailing IDs, single- or double-spaced", () => {
    expect(splitLabel("Each group's moves, with modifiers DEC-108 DEC-079")).toEqual({
      label: "Each group's moves, with modifiers",
      ids: ["DEC-108", "DEC-079"],
    });
    expect(splitLabel("Done   SCR-011")).toEqual({ label: "Done", ids: ["SCR-011"] });
  });

  it("keeps an ID inside the label", () => {
    expect(splitLabel("One step (MEC-026 is the tomb) AREA-054").label).toBe(
      "One step (MEC-026 is the tomb)",
    );
  });
});

describe("parseRailroad", () => {
  const sections = parseRailroad(BLOCK);

  it("reads sections, tracks, an empty track and repeat", () => {
    expect(sections.map((s) => s.name)).toEqual(["enter", "body", "end"]);
    const check = sections[0]?.items[0];
    expect(check).toMatchObject({ t: "node", num: 1, kind: "check" });
    expect(check?.t === "node" && check.tracks.map((t) => [t.name, t.items.length])).toEqual([
      ["no", 1],
      ["yes", 0],
    ]);
    expect(sections[1]?.items[0]).toMatchObject({ t: "repeat" });
    expect(flatNodes(sections.flatMap((s) => s.items)).map((n) => n.num)).toEqual([1, 2, 3, 4]);
  });

  it("names the line it cannot read", () => {
    expect(() => parseRailroad("enter\n  nonsense here\n")).toThrow(/line 2/);
  });

  it("compiles to jumps and a loop-back", () => {
    const ops = compile(sections);
    const branch = ops.find((o) => o.op === "branch");
    expect(branch?.op === "branch" && branch.targets.map((t) => t.name)).toEqual(["no", "yes"]);
    const again = ops.find((o) => o.op === "again");
    expect(again?.op === "again" && again.node?.num).toBe(4);
    expect(again?.op === "again" && ops[again.start]).toMatchObject({ op: "node" });
  });
});

describe("the loop cards", () => {
  const { cards } = loadCards();
  const { loops, errors } = loadLoops(cards);
  const ids = loops.map((l) => l.id);

  it("all read", () => {
    expect(errors).toEqual([]);
    expect(ids).toEqual(expect.arrayContaining(["MEC-032", "MEC-034", "MEC-039", "MEC-071"]));
  });

  it("form a stack from the session down, with the interrupt diagram on its own", () => {
    const tree = loopTree(loops);
    expect(tree[0]).toMatchObject({ id: "MEC-039", depth: 0, via: null });
    expect(new Set(tree.map((r) => r.key)).size).toBe(tree.length);
    expect(tree.find((r) => r.id === "MEC-032")?.depth).toBe(1);
    expect(tree.find((r) => r.id === "MEC-071")?.depth).toBe(0);
  });

  it("carry the five story triggers", () => {
    const names = triggers(loops).map((t) => t.event);
    expect(new Set(names).size).toBe(5);
    expect(names).toContain("set-piece-ends");
  });
});
