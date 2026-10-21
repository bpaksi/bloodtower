import { describe, expect, it } from "vitest";
import { PROTOTYPES } from "./prototypes.ts";

describe("prototype list", () => {
  it("lists P-01, P-08 and P-02 to P-05 with their /p/ paths", () => {
    expect(PROTOTYPES.map((p) => p.id)).toEqual(["P-01", "P-08", "P-02", "P-03", "P-04", "P-05"]);
    expect(PROTOTYPES.map((p) => p.path)).toEqual([
      "/p/board",
      "/p/turn",
      "/p/tomb",
      "/p/cave",
      "/p/camp",
      "/p/fortress",
    ]);
  });
});
