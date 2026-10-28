// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PANEL_OPEN_CANCEL, PANEL_OPEN_DETAIL, PANEL_SYNC, Panels } from "./Panels.tsx";
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
afterEach(() => {
  cleanup();
  // The unmount test adds a bare .shell by hand; drop it so later tests find their own.
  document.body.innerHTML = "";
});

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

  describe("Esc", () => {
    const addDetail = () =>
      document.body.insertAdjacentHTML("beforeend", '<aside class="detail"></aside>');
    const esc = () => fireEvent.keyDown(window, { key: "Escape" });

    afterEach(() => {
      for (const el of document.querySelectorAll("aside.detail, dialog")) el.remove();
    });

    it("closes the open right panel when narrow with a graph detail", () => {
      setWidth(900);
      mount();
      addDetail();
      window.dispatchEvent(new Event(PANEL_OPEN_DETAIL));
      expect(shell().dataset.right).toBe("open");
      esc();
      expect(shell().dataset.right).toBe("closed");
    });

    it("does nothing at the wide width", () => {
      setWidth(1600);
      window.localStorage.setItem("workbench.panels", '{"left":true,"right":true}');
      mount();
      addDetail();
      esc();
      expect(shell().dataset.right).toBe("open");
    });

    it("does nothing without a graph detail", () => {
      setWidth(900);
      mount();
      window.dispatchEvent(new Event(PANEL_OPEN_DETAIL));
      esc();
      expect(shell().dataset.right).toBe("open");
    });

    it("does nothing while a dialog is open", () => {
      setWidth(900);
      mount();
      addDetail();
      window.dispatchEvent(new Event(PANEL_OPEN_DETAIL));
      document.body.insertAdjacentHTML("beforeend", "<dialog open></dialog>");
      esc();
      expect(shell().dataset.right).toBe("open");
    });
  });

  it("restores a saved choice on mount", () => {
    window.localStorage.setItem("workbench.panels", '{"left":false,"right":true}');
    mount();
    expect(shell().dataset.left).toBe("closed");
    expect(shell().dataset.right).toBe("open");
    expect(btn("left").getAttribute("aria-expanded")).toBe("false");
    expect(btn("right").getAttribute("aria-expanded")).toBe("true");
  });

  it("a saved choice survives a remount", () => {
    const first = mount();
    fireEvent.keyDown(window, { key: "[" });
    expect(shell().dataset.left).toBe("closed");
    first.unmount();
    cleanup();
    mount();
    expect(shell().dataset.left).toBe("closed");
  });

  it("] toggles the right panel when it exists", () => {
    mount();
    fireEvent.keyDown(window, { key: "]" });
    expect(shell().dataset.right).toBe("closed");
    fireEvent.keyDown(window, { key: "]" });
    expect(shell().dataset.right).toBe("open");
  });

  it("holds an open request until the right toggle appears, without saving it", () => {
    setWidth(900);
    mount(false);
    window.dispatchEvent(new Event(PANEL_OPEN_DETAIL));
    expect(shell().dataset.right).toBeUndefined();
    shell().insertAdjacentHTML("beforeend", '<button data-panel-toggle="right"></button>');
    window.dispatchEvent(new Event(PANEL_SYNC));
    expect(shell().dataset.right).toBe("open");
    expect(window.localStorage.length).toBe(0);
  });

  it("PANEL_OPEN_CANCEL drops a pending open", () => {
    setWidth(900);
    mount(false);
    window.dispatchEvent(new Event(PANEL_OPEN_DETAIL));
    window.dispatchEvent(new Event(PANEL_OPEN_CANCEL));
    shell().insertAdjacentHTML("beforeend", '<button data-panel-toggle="right"></button>');
    window.dispatchEvent(new Event(PANEL_SYNC));
    expect(shell().dataset.right).toBeUndefined();
  });
});
