import { describe, expect, it, vi } from "vitest";
import { createLogger } from "./logger.ts";

function setup() {
  const sink = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const logger = createLogger({ sink, now: () => new Date("2026-10-21T10:00:00Z") });
  return { sink, logger };
}

describe("logger", () => {
  it("writes to the console and the panel's entries", () => {
    const { sink, logger } = setup();
    logger.info("hello");
    logger.error("bad", new Error("why"), "X1");
    expect(sink.info).toHaveBeenCalledWith("[INFO] hello");
    expect(sink.error).toHaveBeenCalled();
    const { entries } = logger.getState();
    expect(entries.map((e) => e.level)).toEqual(["info", "error"]);
    expect(entries[1]).toMatchObject({
      code: "X1",
      message: "bad",
      time: "2026-10-21T10:00:00.000Z",
    });
    expect(entries[1]?.detail).toContain("why");
  });

  it("shows only errors as toasts", () => {
    const { logger } = setup();
    logger.debug("d");
    logger.warn("w");
    expect(logger.getState().toasts).toHaveLength(0);
    logger.error("e");
    expect(logger.getState().toasts).toHaveLength(1);
  });

  it("collapses repeats into one toast with a count, and keeps different errors apart", () => {
    const { logger } = setup();
    for (let i = 0; i < 3; i++) logger.error("same", undefined, "C");
    logger.error("other", undefined, "C");
    const { toasts, entries } = logger.getState();
    expect(entries).toHaveLength(4);
    expect(toasts.map((t) => [t.message, t.count])).toEqual([
      ["same", 3],
      ["other", 1],
    ]);
  });

  it("starts a fresh toast after the old one is dismissed", () => {
    const { logger } = setup();
    logger.error("same");
    logger.dismissToast(logger.getState().toasts[0]?.id ?? -1);
    expect(logger.getState().toasts).toHaveLength(0);
    logger.error("same");
    expect(logger.getState().toasts[0]?.count).toBe(1);
  });

  it("an error thrown in a page reaches the panel and the toast", () => {
    const { logger } = setup();
    const target = new EventTarget();
    logger.installGlobalHandlers(target);
    const boom = new Error("page exploded");
    target.dispatchEvent(Object.assign(new Event("error"), { error: boom, message: boom.message }));
    const { entries, toasts } = logger.getState();
    expect(entries[0]).toMatchObject({
      level: "error",
      code: "UNCAUGHT_ERROR",
      message: "page exploded",
    });
    expect(toasts[0]).toMatchObject({ message: "page exploded", count: 1 });
  });

  it("an unhandled rejection reaches the panel and the toast", () => {
    const { logger } = setup();
    const target = new EventTarget();
    logger.installGlobalHandlers(target);
    target.dispatchEvent(
      Object.assign(new Event("unhandledrejection"), { reason: new Error("nope") }),
    );
    const { entries, toasts } = logger.getState();
    expect(entries[0]).toMatchObject({ level: "error", code: "UNHANDLED_REJECTION" });
    expect(entries[0]?.message).toContain("nope");
    expect(toasts[0]?.code).toBe("UNHANDLED_REJECTION");
  });

  it("stops listening when uninstalled", () => {
    const { logger } = setup();
    const target = new EventTarget();
    const off = logger.installGlobalHandlers(target);
    off();
    target.dispatchEvent(Object.assign(new Event("error"), { message: "x" }));
    expect(logger.getState().entries).toHaveLength(0);
  });

  it("exports the log as JSON and tells subscribers about changes", () => {
    const { logger } = setup();
    const seen = vi.fn();
    const off = logger.subscribe(seen);
    logger.info("a");
    off();
    logger.info("b");
    expect(seen).toHaveBeenCalledTimes(1);
    expect(JSON.parse(logger.exportText()).map((e: { message: string }) => e.message)).toEqual([
      "a",
      "b",
    ]);
  });

  it("describes non-Error throws", () => {
    const { logger } = setup();
    logger.error(undefined, { code: 5 });
    logger.error(undefined, "plain");
    expect(logger.getState().entries.map((e) => e.message)).toEqual(['{"code":5}', "plain"]);
  });

  it("an error event with an empty message uses the error's message, then 'Unknown error'", () => {
    const { logger } = setup();
    const target = new EventTarget();
    logger.installGlobalHandlers(target);
    target.dispatchEvent(
      Object.assign(new Event("error"), { error: new Error("inner"), message: "" }),
    );
    target.dispatchEvent(Object.assign(new Event("error"), { message: "" }));
    expect(logger.getState().entries.map((e) => e.message)).toEqual(["inner", "Unknown error"]);
  });
});
