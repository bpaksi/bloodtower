import { describe, expect, it } from "vitest";
import {
  captionFromLine,
  KEEPER_LINE_IDS,
  keeperCaption,
  nextKeeperLineIndex,
} from "./keeperLines.ts";

describe("keeper lines", () => {
  it("plays ts-keeper-001 then 002 then 003, and strips pause markup", () => {
    expect([...KEEPER_LINE_IDS]).toEqual(["ts-keeper-001", "ts-keeper-002", "ts-keeper-003"]);
    expect(nextKeeperLineIndex(0)).toBe(1);
    expect(nextKeeperLineIndex(1)).toBe(2);
    expect(nextKeeperLineIndex(2)).toBeNull();
    expect(keeperCaption("ts-keeper-001")).toBe(
      "Light them if you can. The key is at the bottom. It always is.",
    );
    expect(captionFromLine("Go on. [pause 0.5] I'll wait.")).toBe("Go on. I'll wait.");
  });
});
