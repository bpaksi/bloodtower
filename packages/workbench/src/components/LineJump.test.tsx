// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LineJump } from "./LineJump.tsx";

const sections = [
  { anchor: "outer", start: 1, end: 50 },
  { anchor: "inner", start: 10, end: 20 },
];
let scroll: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll as never;
  document.body.innerHTML = '<h2 id="outer">o</h2><h3 id="inner">i</h3>';
  window.location.hash = "";
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.innerHTML = "";
  window.location.hash = "";
});

const hashTo = (h: string) => {
  window.location.hash = h;
  act(() => {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
};

describe("LineJump", () => {
  it("renders nothing", () => {
    const { container } = render(<LineJump sections={sections} />);
    expect(container.innerHTML).toBe("");
  });

  it("does nothing without an #L<n> hash", () => {
    window.location.hash = "#intro";
    render(<LineJump sections={sections} />);
    expect(scroll).not.toHaveBeenCalled();
  });

  it("jumps on mount to the innermost section holding the line and flashes it", () => {
    window.location.hash = "#L15";
    render(<LineJump sections={sections} />);
    const inner = document.getElementById("inner") as HTMLElement;
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.contexts[0]).toBe(inner);
    expect(scroll).toHaveBeenCalledWith({ block: "start" });
    expect(inner.classList.contains("flash")).toBe(true);
    vi.advanceTimersByTime(1599);
    expect(inner.classList.contains("flash")).toBe(true);
    vi.advanceTimersByTime(2);
    expect(inner.classList.contains("flash")).toBe(false);
  });

  it("uses the outer section when the line is outside the inner one", () => {
    window.location.hash = "#L30";
    render(<LineJump sections={sections} />);
    expect(document.getElementById("outer")?.classList.contains("flash")).toBe(true);
    expect(document.getElementById("inner")?.classList.contains("flash")).toBe(false);
  });

  it("includes both boundary lines", () => {
    window.location.hash = "#L20";
    render(<LineJump sections={sections} />);
    expect(scroll.mock.contexts[0]).toBe(document.getElementById("inner"));
  });

  it("does nothing when no section holds the line or the anchor is missing", () => {
    window.location.hash = "#L99";
    render(<LineJump sections={sections} />);
    expect(scroll).not.toHaveBeenCalled();
    render(<LineJump sections={[{ anchor: "ghost", start: 1, end: 200 }]} />);
    expect(scroll).not.toHaveBeenCalled();
  });

  it("ignores malformed hashes like #L, #L1x and #xL5", () => {
    render(<LineJump sections={sections} />);
    for (const h of ["#L", "#L1x", "#xL5"]) hashTo(h);
    expect(scroll).not.toHaveBeenCalled();
  });

  it("jumps again on hashchange and stops after unmount", () => {
    const view = render(<LineJump sections={sections} />);
    hashTo("#L12");
    expect(scroll).toHaveBeenCalledTimes(1);
    view.unmount();
    hashTo("#L13");
    expect(scroll).toHaveBeenCalledTimes(1);
  });
});
