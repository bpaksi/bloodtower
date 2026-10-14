import { loggedEventSchema } from "burgomaster-funeral-poc-protocols";
import { describe, expect, it } from "vitest";
import { appendEvent, openLog, readEvents } from "./log.ts";

describe("event log", () => {
  it("appends a row and reads it back", () => {
    const { db, close } = openLog(":memory:");
    try {
      appendEvent(
        db,
        loggedEventSchema.parse({
          id: "e1",
          at: "2026-10-14T18:00:00.000Z",
          type: "session_started",
          payload: { seed: "funeral-demo", packVersion: "assets", towerUsed: false },
        }),
      );
      expect(readEvents(db).map((event) => event.type)).toEqual(["session_started"]);
    } finally {
      close();
    }
  });
});
