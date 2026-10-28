// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FindBox } from "./FindBox.tsx";
import { PANEL_OPEN_DETAIL } from "./Panels.tsx";

const { push, nav } = vi.hoisted(() => ({ push: vi.fn(), nav: { pathname: "/cards" } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => nav.pathname,
}));

const hit = (id: string) => ({
  id,
  title: `Title ${id}`,
  snippet: `snippet ${id}`,
  href: `/cards/${id}`,
});

function mockFetch(hits: unknown[], ok = true) {
  const f = vi.fn(async (_url: string) => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => ({ hits }),
  }));
  vi.stubGlobal("fetch", f);
  return f;
}

async function typeQuery(text: string) {
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: text } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(150);
  });
  return input;
}

beforeEach(() => {
  vi.useFakeTimers();
  push.mockReset();
  nav.pathname = "/cards";
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("FindBox", () => {
  it("renders a collapsed combobox and does not fetch for empty text", () => {
    const f = mockFetch([]);
    render(<FindBox />);
    expect(screen.getByRole("combobox").getAttribute("aria-expanded")).toBe("false");
    expect(f).not.toHaveBeenCalled();
  });

  it("fetches after the debounce and lists the hits", async () => {
    const f = mockFetch([hit("A-1"), hit("A-2")]);
    render(<FindBox endpoint="/api/x" />);
    await typeQuery("a b");
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0]?.[0]).toBe("/api/x?q=a%20b");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("combobox").getAttribute("aria-expanded")).toBe("true");
  });

  it("shows 'No matches.' when nothing matches", async () => {
    mockFetch([]);
    render(<FindBox />);
    await typeQuery("zzz");
    expect(screen.getByText("No matches.")).toBeTruthy();
  });

  it("shows 'Search is unavailable.' when the server fails", async () => {
    mockFetch([], false);
    render(<FindBox />);
    await typeQuery("zzz");
    expect(screen.getByText("Search is unavailable.")).toBeTruthy();
  });

  it("arrow keys move the active hit and wrap around", async () => {
    mockFetch([hit("A-1"), hit("A-2")]);
    render(<FindBox />);
    const input = await typeQuery("a");
    const selected = () =>
      screen.getAllByRole("option").findIndex((o) => o.getAttribute("aria-selected") === "true");
    expect(selected()).toBe(0);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(selected()).toBe(1);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(selected()).toBe(0);
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(selected()).toBe(1);
  });

  it("Enter opens the active hit through the router", async () => {
    mockFetch([hit("A-1"), hit("A-2")]);
    render(<FindBox />);
    const input = await typeQuery("a");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/cards/A-2");
  });

  it("clicking a hit opens it and closes the list", async () => {
    mockFetch([hit("A-1")]);
    render(<FindBox />);
    await typeQuery("a");
    fireEvent.click(screen.getByRole("option"));
    expect(push).toHaveBeenCalledWith("/cards/A-1");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("Esc closes the list", async () => {
    mockFetch([hit("A-1")]);
    render(<FindBox />);
    const input = await typeQuery("a");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("a mousedown outside closes the list", async () => {
    mockFetch([hit("A-1")]);
    render(<FindBox />);
    await typeQuery("a");
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("/ focuses the box, but not while typing in another field", () => {
    mockFetch([]);
    render(
      <>
        <FindBox />
        <textarea data-testid="other" />
      </>,
    );
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(window, { key: "/" });
    expect(document.activeElement).toBe(input);
    screen.getByTestId("other").focus();
    fireEvent.keyDown(window, { key: "/" });
    expect(document.activeElement).toBe(screen.getByTestId("other"));
  });

  it("Ctrl+K focuses the box even from another field", () => {
    mockFetch([]);
    render(
      <>
        <FindBox />
        <textarea data-testid="other" />
      </>,
    );
    screen.getByTestId("other").focus();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(document.activeElement).toBe(screen.getByRole("combobox"));
  });

  it("Meta+K focuses and selects the box", () => {
    mockFetch([]);
    render(<FindBox />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.keyDown(window, { key: "K", metaKey: true });
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(3);
  });

  it("focusing the box again reopens the list after Esc", async () => {
    mockFetch([hit("A-1")]);
    render(<FindBox />);
    const input = await typeQuery("a");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.focus(input);
    expect(screen.getByRole("listbox")).toBeTruthy();
  });

  it("Enter with stale hits fetches for the typed text and opens its first hit", async () => {
    const f = mockFetch([hit("A-1")]);
    render(<FindBox />);
    const input = await typeQuery("a");
    f.mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ hits: [hit("B-9"), hit("B-8")] }),
    }));
    fireEvent.change(input, { target: { value: "b" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(f.mock.calls.at(-1)?.[0]).toBe("/api/find?q=b");
    expect(push).toHaveBeenCalledWith("/cards/B-9");
    expect(push).not.toHaveBeenCalledWith("/cards/A-1");
  });

  it("Enter does nothing while the list is closed", async () => {
    mockFetch([hit("A-1")]);
    render(<FindBox />);
    const input = await typeQuery("a");
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).not.toHaveBeenCalled();
  });

  it("a focus= hit navigates through the router and asks to open the detail panel", async () => {
    mockFetch([{ ...hit("A-1"), href: "/?focus=A-1" }]);
    const opened = vi.fn();
    window.addEventListener(PANEL_OPEN_DETAIL, opened);
    render(<FindBox />);
    const input = await typeQuery("a");
    fireEvent.keyDown(input, { key: "Enter" });
    window.removeEventListener(PANEL_OPEN_DETAIL, opened);
    expect(push).toHaveBeenCalledWith("/?focus=A-1");
    expect(opened).toHaveBeenCalledTimes(1);
  });

  it("a plain hit does not ask to open the detail panel", async () => {
    mockFetch([hit("A-1")]);
    const opened = vi.fn();
    window.addEventListener(PANEL_OPEN_DETAIL, opened);
    render(<FindBox />);
    await typeQuery("a");
    fireEvent.click(screen.getByRole("option"));
    window.removeEventListener(PANEL_OPEN_DETAIL, opened);
    expect(opened).not.toHaveBeenCalled();
  });

  it("a hit on the current page sets the hash instead of navigating", async () => {
    nav.pathname = "/doc/reqs";
    window.location.hash = "";
    mockFetch([{ ...hit("R-1"), href: "/doc/reqs#L7" }]);
    render(<FindBox />);
    await typeQuery("r");
    fireEvent.click(screen.getByRole("option"));
    expect(window.location.hash).toBe("#L7");
    expect(push).not.toHaveBeenCalled();
  });

  it("re-picking the same hash dispatches hashchange instead of setting it", async () => {
    nav.pathname = "/doc/reqs";
    window.location.hash = "#L7";
    mockFetch([{ ...hit("R-1"), href: "/doc/reqs#L7" }]);
    const changed = vi.fn();
    window.addEventListener("hashchange", changed);
    render(<FindBox />);
    await typeQuery("r");
    changed.mockClear();
    fireEvent.click(screen.getByRole("option"));
    window.removeEventListener("hashchange", changed);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    window.location.hash = "";
  });

  it("clearing the query closes the list", async () => {
    mockFetch([hit("A-1")]);
    render(<FindBox />);
    const input = await typeQuery("a");
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.change(input, { target: { value: "  " } });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });

  it("hovering a hit makes it the selected option", async () => {
    mockFetch([hit("A-1"), hit("A-2")]);
    render(<FindBox />);
    await typeQuery("a");
    const options = screen.getAllByRole("option");
    fireEvent.mouseEnter(options[1] as HTMLElement);
    expect(screen.getAllByRole("option")[1]?.getAttribute("aria-selected")).toBe("true");
    expect(screen.getAllByRole("option")[0]?.getAttribute("aria-selected")).toBe("false");
  });

  it("/ is ignored while a select has focus", () => {
    mockFetch([]);
    render(
      <>
        <FindBox />
        <select data-testid="sel">
          <option>x</option>
        </select>
      </>,
    );
    screen.getByTestId("sel").focus();
    fireEvent.keyDown(window, { key: "/" });
    expect(document.activeElement).toBe(screen.getByTestId("sel"));
  });

  it("/ is ignored while a contentEditable element has focus", () => {
    mockFetch([]);
    render(
      <>
        <FindBox />
        <div data-testid="ce" contentEditable suppressContentEditableWarning />
      </>,
    );
    const ce = screen.getByTestId("ce");
    // jsdom does not implement isContentEditable, so define it on the element.
    Object.defineProperty(ce, "isContentEditable", { value: true });
    ce.setAttribute("tabindex", "0");
    ce.focus();
    fireEvent.keyDown(window, { key: "/" });
    expect(document.activeElement).toBe(ce);
  });

  it("queries /api/find by default", async () => {
    const f = mockFetch([]);
    render(<FindBox />);
    await typeQuery("a&b");
    expect(f.mock.calls[0]?.[0]).toBe("/api/find?q=a%26b");
  });
});
