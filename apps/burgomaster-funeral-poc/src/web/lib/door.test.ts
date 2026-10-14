import { describe, expect, it } from "vitest";
import { DOOR_LINE, DOOR_TITLE } from "./door.ts";

describe("door", () => {
  it("names the scene on the landing page", () => {
    expect(DOOR_TITLE).toBe("Burgomaster's Funeral POC");
    expect(DOOR_LINE.length).toBeGreaterThan(0);
  });
});
