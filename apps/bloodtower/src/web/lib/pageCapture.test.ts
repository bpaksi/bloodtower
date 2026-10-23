import { describe, expect, it } from "vitest";
import { PageErrorBoundary } from "../components/errors/PageErrorBoundary.tsx";
import {
  captureRejection,
  captureRenderError,
  captureWindowError,
  installPageCapture,
  isDuplicateRenderReport,
  noteBoundaryCatch,
} from "./pageCapture.ts";
import { PAGE_ERROR_CODE, UNHANDLED_REJECTION_CODE, WINDOW_ERROR_CODE } from "./pageLogCodes.ts";

describe("page capture", () => {
  it("logs a render error, window.onerror and an unhandled rejection", () => {
    expect(captureRenderError(new Error("render broke")).code).toBe(PAGE_ERROR_CODE);
    expect(
      captureWindowError({ message: "Script error.", error: new Error("window broke") }),
    ).toEqual({
      code: WINDOW_ERROR_CODE,
      message: "window broke",
    });
    expect(captureRejection({ reason: new Error("promise broke") })).toEqual({
      code: UNHANDLED_REJECTION_CODE,
      message: "promise broke",
    });
    expect(captureRejection({})).toEqual({
      code: UNHANDLED_REJECTION_CODE,
      message: "A promise was rejected with no reason.",
    });

    const seen: string[] = [];
    const target = new EventTarget();
    const stop = installPageCapture(target, (captured) => seen.push(captured.code));
    target.dispatchEvent(Object.assign(new Event("error"), { message: "plain", error: undefined }));
    target.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: "lost" }));
    expect(seen).toEqual([WINDOW_ERROR_CODE, UNHANDLED_REJECTION_CODE]);
    stop();
    target.dispatchEvent(Object.assign(new Event("error"), { message: "again" }));
    expect(seen).toEqual([WINDOW_ERROR_CODE, UNHANDLED_REJECTION_CODE]);
  });

  it("does not log the window report of a render error the boundary already caught", () => {
    const error = new Error("render broke");
    const captured = captureRenderError(error, "\nat Device");
    noteBoundaryCatch(captured.message);
    expect(isDuplicateRenderReport(captured.message)).toBe(true);
    const seen: string[] = [];
    const target = new EventTarget();
    installPageCapture(target, (next) => seen.push(next.code));
    target.dispatchEvent(Object.assign(new Event("error"), { message: captured.message, error }));
    expect(seen).toEqual([]);
    target.dispatchEvent(Object.assign(new Event("error"), { message: "a different failure" }));
    expect(seen).toEqual([WINDOW_ERROR_CODE]);
  });

  it("shows the mist code from the error boundary", () => {
    const seen: string[] = [];
    const boundary = new PageErrorBoundary({
      children: null,
      onError: (captured) => seen.push(`${captured.code}:${captured.message}`),
    });
    const state = PageErrorBoundary.getDerivedStateFromError(new Error("render broke"));
    expect(state.captured?.code).toBe(PAGE_ERROR_CODE);
    boundary.componentDidCatch(new Error("render broke"), { componentStack: "\nat Board" });
    expect(seen).toEqual([`${PAGE_ERROR_CODE}:render broke\nat Board`]);
  });
});
