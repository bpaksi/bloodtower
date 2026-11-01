import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChromeBar } from "./ChromeBar.tsx";
import { gearRows, HELP_LINES, menuContextFromOffers } from "./gearMenu.ts";

const markup = (props: Parameters<typeof ChromeBar>[0]) =>
  renderToStaticMarkup(createElement(ChromeBar, props));

describe("ChromeBar menu", () => {
  it("closing sends no act", () => {
    const onAct = vi.fn();
    const html = markup({ live: true, onAct, initialMenuOpen: true });
    expect(html).toContain("data-menu");
    expect(html).toContain("data-menu-scrim");
    expect(html).toContain(">Close<");
    expect(html).toContain('aria-expanded="true"');
    const closeAt = html.indexOf(">Close<");
    const close = html.slice(html.lastIndexOf("<button", closeAt), closeAt);
    expect(close).not.toContain("data-prompt-id");
    expect(close).not.toContain("data-action-id");
    expect(html).not.toMatch(/data-menu-scrim[^>]*data-prompt-id/);
    const gearAt = html.indexOf('data-action="menu"');
    const gear = html.slice(html.lastIndexOf("<button", gearAt), gearAt);
    expect(gear).not.toContain("data-prompt-id");
    expect(onAct).not.toHaveBeenCalled();
  });

  it("greys what it cannot offer", () => {
    const html = markup({ live: true, initialMenuOpen: true });
    expect(menuContextFromOffers(false, false).towerConnected).toBe(true);
    for (const heading of ["Look up", "Table", "Leave"]) {
      expect(html).toContain(`>${heading}<`);
    }
    const quitAt = html.indexOf("Save and quit");
    const towerAt = html.indexOf(">Tower<");
    const closeAt = html.lastIndexOf(">Close<");
    expect(quitAt).toBeGreaterThan(-1);
    expect(towerAt).toBeGreaterThan(-1);
    expect(closeAt).toBeGreaterThan(quitAt);
    expect(html.slice(quitAt, quitAt + 180)).toContain("Only in a game.");
    expect(html.slice(towerAt, towerAt + 220)).toContain("The tower is connected.");
    expect(html).toContain("bt-row--disabled");
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("opacity:0.5");
    expect(html).toContain('data-reason="true"');
    const close = html.slice(html.lastIndexOf("<button", closeAt), closeAt);
    expect(close).not.toContain("disabled");
    const rows = gearRows(menuContextFromOffers(false, false));
    const save = rows.find((item) => item.label === "Save and quit");
    const tower = rows.find((item) => item.label === "Tower");
    expect(save?.enabled).toBe(false);
    expect(save?.reason).toBe("Only in a game.");
    expect(tower?.enabled).toBe(false);
    expect(tower?.reason).toBe("The tower is connected.");
    expect(rows.filter((item) => !item.enabled).every((item) => item.reason)).toBe(true);
  });

  it("help lines cover every screen id in the spec", () => {
    expect(HELP_LINES["tower-choice"]).toBe(
      "Tap Connect Tower to play with the tower, or Play without Tower for tonight.",
    );
    expect(HELP_LINES.play).toContain("The game is on.");
    expect(Object.values(HELP_LINES).every((line) => line.length > 0)).toBe(true);
  });
});
