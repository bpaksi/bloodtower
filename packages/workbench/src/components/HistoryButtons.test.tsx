// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryButtons } from "./HistoryButtons.tsx";

class FakeNav extends EventTarget {
  canGoBack = false;
  canGoForward = false;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const back = () => screen.getByRole("button", { name: "Back" }) as HTMLButtonElement;
const fwd = () => screen.getByRole("button", { name: "Forward" }) as HTMLButtonElement;

describe("HistoryButtons", () => {
  it("leaves both buttons enabled without the Navigation API", () => {
    vi.stubGlobal("navigation", undefined);
    render(<HistoryButtons />);
    expect(back().disabled).toBe(false);
    expect(fwd().disabled).toBe(false);
  });

  it("calls history.back and history.forward", () => {
    vi.stubGlobal("navigation", undefined);
    const b = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const f = vi.spyOn(window.history, "forward").mockImplementation(() => {});
    render(<HistoryButtons />);
    fireEvent.click(back());
    fireEvent.click(fwd());
    expect(b).toHaveBeenCalledTimes(1);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("reads canGoBack/canGoForward on mount", () => {
    const nav = new FakeNav();
    nav.canGoBack = true;
    vi.stubGlobal("navigation", nav);
    render(<HistoryButtons />);
    expect(back().disabled).toBe(false);
    expect(fwd().disabled).toBe(true);
  });

  it("re-reads one tick after currententrychange", async () => {
    const nav = new FakeNav();
    vi.stubGlobal("navigation", nav);
    render(<HistoryButtons />);
    expect(back().disabled).toBe(true);
    nav.canGoBack = true;
    nav.canGoForward = true;
    nav.dispatchEvent(new Event("currententrychange"));
    // not yet: the read is deferred past Next's insertion effect
    expect(back().disabled).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(back().disabled).toBe(false);
    expect(fwd().disabled).toBe(false);
  });

  it("stops listening on unmount", () => {
    const nav = new FakeNav();
    const remove = vi.spyOn(nav, "removeEventListener");
    vi.stubGlobal("navigation", nav);
    render(<HistoryButtons />).unmount();
    expect(remove).toHaveBeenCalledWith("currententrychange", expect.any(Function));
  });
});
