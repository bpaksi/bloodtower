// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PANEL_SYNC, PANEL_TOGGLE } from "./Panels.tsx";
import { PanelToggle } from "./PanelToggle.tsx";

afterEach(cleanup);

describe("PanelToggle", () => {
  it("labels the left button for the sidebar", () => {
    render(<PanelToggle side="left" />);
    const b = screen.getByRole("button", { name: "Toggle sidebar" });
    expect(b.getAttribute("title")).toBe("Toggle sidebar ([)");
    expect(b.dataset.panelToggle).toBe("left");
  });

  it("labels the right button for the details panel", () => {
    render(<PanelToggle side="right" />);
    const b = screen.getByRole("button", { name: "Toggle details panel" });
    expect(b.getAttribute("title")).toBe("Toggle details panel (])");
  });

  it("announces itself with a sync event on mount", () => {
    const on = vi.fn();
    window.addEventListener(PANEL_SYNC, on);
    render(<PanelToggle side="left" />);
    window.removeEventListener(PANEL_SYNC, on);
    expect(on).toHaveBeenCalledTimes(1);
  });

  it("dispatches a toggle event carrying its side on click", () => {
    const on = vi.fn();
    window.addEventListener(PANEL_TOGGLE, on);
    render(<PanelToggle side="right" />);
    fireEvent.click(screen.getByRole("button"));
    window.removeEventListener(PANEL_TOGGLE, on);
    expect(on).toHaveBeenCalledTimes(1);
    const [event] = on.mock.calls[0] as [CustomEvent];
    expect(event.detail).toBe("right");
  });
});
