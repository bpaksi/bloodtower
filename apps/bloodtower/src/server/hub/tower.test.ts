import { describe, expect, it } from "vitest";
import { towerFromEnv } from "./tower.ts";

describe("towerFromEnv", () => {
  it("uses the mock when no sidecar url is set, and does not connect it", () => {
    const mock = towerFromEnv({});
    const blank = towerFromEnv({ TOWER_URL: "  ", DIAG_LOG: "/tmp/bloodtower-diag-unused" });
    try {
      expect(mock.mode).toBe("mock");
      expect(blank.mode).toBe("mock");
      expect(mock.tower.snapshot().connection).toBe("unavailable");
      expect(mock.tower.sent()).toEqual([]);
      expect(blank.tower.sent()).toEqual([]);
    } finally {
      mock.tower.close();
      blank.tower.close();
    }
  });

  it("builds a sidecar client without opening the socket", () => {
    const made = towerFromEnv({ TOWER_URL: "ws://127.0.0.1:9/ws" });
    try {
      expect(made.mode).toBe("sidecar");
      expect(made.url).toBe("ws://127.0.0.1:9/ws");
      expect(made.tower.snapshot().connection).toBe("unavailable");
      expect(made.tower.sent()).toEqual([]);
    } finally {
      made.tower.close();
    }
  });
});
