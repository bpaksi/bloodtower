// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PANEL_OPEN_DETAIL, Panels } from "./Panels.tsx";
import { PanelToggle } from "./PanelToggle.tsx";

function setWidth(w: number) {
  Object.defineProperty(window, "innerWidth", { value: w, configurable: true, writable: true });
}

function mount(withRight = true) {
  return render(
    <div className="shell">
      <PanelToggle side="left" />
      {withRight && <PanelToggle side="right" />}
      <Panels />
    </div>,
  );
}

const shell = () => document.querySelector<HTMLElement>(".shell") as HTMLElement;
const btn = (side: string) =>
  document.querySelector<HTMLElement>(`[data-panel-toggle="${side}"]`) as HTMLElement;

beforeEach(() => {
  window.localStorage.clear();
  setWidth(1600);
});
afterEach(cleanup);

describe("Panels", () => {
  it("leaves the shell alone until something is toggled or saved", () => {
    mount();
    expect(shell().dataset.left).toBeUndefined();
    expect(btn("left").getAttribute("aria-expanded")).toBe("true");
  });

  it("[ closes the sidebar, and a second [ opens it again", () => {
    mount();
    fireEvent.keyDown(window, { key: "[" });
    expect(shell().dataset.left).toBe("closed");
    expect(btn("left").getAttribute("aria-expanded")).toBe("false");
    fireEvent.keyDown(window, { key: "[" });
    expect(shell().dataset.left).toBe("open");
  });

  it("a button click toggles its panel and saves the choice", () => {
    mount();
    fireEvent.click(btn("right"));
    expect(shell().dataset.right).toBe("closed");
    expect(window.localStorage.length).toBe(1);
  });

  it("ignores ] when no right panel exists", () => {
    mount(false);
    fireEvent.keyDown(window, { key: "]" });
    expect(shell().dataset.right).toBeUndefined();
  });

  it("ignores keys while a field has focus", () => {
    const { container } = mount();
    const input = document.createElement("input");
    container.appendChild(input);
    input.focus();
    fireEvent.keyDown(window, { key: "[" });
    expect(shell().dataset.left).toBeUndefined();
  });

  it("ignores keys with a modifier", () => {
    mount();
    fireEvent.keyDown(window, { key: "[", ctrlKey: true });
    expect(shell().dataset.left).toBeUndefined();
  });

  it("opens the detail panel on request below the wide width, but not above it", () => {
    setWidth(900);
    mount();
    window.dispatchEvent(new Event(PANEL_OPEN_DETAIL));
    expect(shell().dataset.right).toBe("open");
    cleanup();
    setWidth(1920);
    mount();
    window.dispatchEvent(new Event(PANEL_OPEN_DETAIL));
    expect(shell().dataset.right).toBeUndefined();
  });

  it("a pick that opens the detail panel is not saved", () => {
    setWidth(900);
    mount();
    window.dispatchEvent(new Event(PANEL_OPEN_DETAIL));
    expect(window.localStorage.length).toBe(0);
  });

  it("removes its listeners on unmount", () => {
    const { unmount } = mount();
    unmount();
    document.body.insertAdjacentHTML("beforeend", '<div class="shell"></div>');
    fireEvent.keyDown(window, { key: "[" });
    expect(document.querySelector<HTMLElement>(".shell")?.dataset.left).toBeUndefined();
  });
});
