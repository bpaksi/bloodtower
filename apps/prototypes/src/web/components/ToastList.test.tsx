import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLogger } from "../lib/logger.ts";
import { ToastList } from "./ToastList.tsx";

describe("ToastList", () => {
  it("shows one toast with a count for repeated errors", () => {
    const logger = createLogger({ sink: { debug() {}, info() {}, warn() {}, error() {} } });
    logger.error("twice", undefined, "E1");
    logger.error("twice", undefined, "E1");
    const html = renderToStaticMarkup(
      <ToastList toasts={logger.getState().toasts} onDismiss={() => {}} />,
    );
    expect(html.match(/data-toast(?!-)/g)).toHaveLength(1);
    expect(html).toContain("E1");
    expect(html).toContain("×2");
  });

  it("shows no count for a single error", () => {
    const logger = createLogger({ sink: { debug() {}, info() {}, warn() {}, error() {} } });
    logger.error("once");
    expect(
      renderToStaticMarkup(<ToastList toasts={logger.getState().toasts} onDismiss={() => {}} />),
    ).not.toContain("data-toast-count");
  });
});
