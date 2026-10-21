import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLogger } from "../lib/logger.ts";
import { LogEntries } from "./LogEntries.tsx";

describe("LogEntries", () => {
  it("lists logged entries with level, code and message", () => {
    const logger = createLogger({ sink: { debug() {}, info() {}, warn() {}, error() {} } });
    logger.info("started");
    logger.error("failed", new Error("inner"), "F1");
    const html = renderToStaticMarkup(<LogEntries entries={logger.getState().entries} />);
    expect(html).toContain("INFO");
    expect(html).toContain("[F1] failed");
    expect(html).toContain("inner");
  });

  it("says so when empty", () => {
    expect(renderToStaticMarkup(<LogEntries entries={[]} />)).toContain("No log entries");
  });
});
