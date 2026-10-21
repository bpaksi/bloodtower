import { describe, expect, it } from "vitest";
import { logger } from "../lib/logger.ts";
import { ErrorBoundary } from "./ErrorBoundary.tsx";

describe("ErrorBoundary", () => {
  it("logs a render error to the panel and the toast", () => {
    logger.clear();
    const err = new Error("render blew up");
    expect(ErrorBoundary.getDerivedStateFromError(err)).toEqual({ error: err });
    new ErrorBoundary({ children: null }).componentDidCatch(err, { componentStack: "at Page" });
    const { entries, toasts } = logger.getState();
    expect(entries[0]).toMatchObject({ code: "RENDER_ERROR", message: "render blew up" });
    expect(toasts[0]?.message).toBe("render blew up");
    logger.clear();
  });
});
