// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FindBox } from "./FindBox.tsx";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/cards",
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
});
