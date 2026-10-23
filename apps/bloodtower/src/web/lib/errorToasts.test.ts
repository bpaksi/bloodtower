import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StoryToasts } from "../components/board/StoryToasts.tsx";
import { pushErrorToast, visibleErrorToasts } from "./errorToasts.ts";

describe("story board toasts", () => {
  it("collapses repeats of the same code and keeps a different code", () => {
    const now = 1_000;
    const once = pushErrorToast([], { code: "page-error", message: "first" }, now);
    const twice = pushErrorToast(once, { code: "page-error", message: "second" }, now + 10);
    const both = pushErrorToast(twice, { code: "window-error", message: "other" }, now + 20);
    expect(both).toEqual([
      { code: "page-error", count: 2, message: "second", until: now + 10 + 6_000 },
      { code: "window-error", count: 1, message: "other", until: now + 20 + 6_000 },
    ]);
    expect(visibleErrorToasts(both, now + 10 + 6_000)).toEqual([both[1]]);
    expect(visibleErrorToasts(both, now + 20 + 6_000)).toEqual([]);

    const html = renderToStaticMarkup(createElement(StoryToasts, { toasts: both }));
    expect(html).toContain("page-error");
    expect(html).toContain("×2");
    expect(html).toContain("window-error");
    expect(html).not.toContain("×1");
    expect(html).not.toContain("<button");
    expect(html).toContain('data-presentation="toasts"');
  });
});
