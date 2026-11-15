import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChromeBar } from "./ChromeBar.tsx";
import { gearRows, HELP_LINES, menuContextFromOffers } from "./gearMenu.ts";

// Hooks run outside a renderer here: state stays at its first value and setters are spies,
// so the component can be called as a function and its buttons clicked in the element tree.
const setters: ReturnType<typeof vi.fn>[] = [];
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const set = vi.fn();
      setters.push(set);
      return [initial, set];
    },
    useEffect: () => undefined,
  };
});

const findButtons = (node: ReactNode, out: ReactElement<Record<string, unknown>>[] = []) => {
  if (Array.isArray(node)) {
    for (const child of node) findButtons(child, out);
  } else if (node && typeof node === "object" && "props" in node) {
    const element = node as ReactElement<Record<string, unknown>>;
    if (element.type === "button") out.push(element);
    findButtons(element.props.children as ReactNode, out);
  }
  return out;
};

const click = (
  props: Parameters<typeof ChromeBar>[0],
  match: (button: ReactElement<Record<string, unknown>>) => boolean,
) => {
  const button = findButtons(ChromeBar(props)).find(match);
  if (!button) throw new Error("No such button.");
  (button.props.onClick as () => void)();
};

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
    expect(menuContextFromOffers(false).towerConnected).toBe(true);
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
    const rows = gearRows(menuContextFromOffers(false));
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

describe("session over (C2/06 EV-17)", () => {
  it("disables every gear item with the reason The session is over.", () => {
    const rows = gearRows({
      inGame: false,
      beforeBegin: false,
      sessionScreen: true,
      towerConnected: false,
      partySplit: false,
      blockedItem: null,
      sessionOver: true,
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((item) => !item.enabled)).toBe(true);
    expect(rows.every((item) => item.reason === "The session is over.")).toBe(true);
  });

  it("leaves the list alone while the session goes on", () => {
    const rows = gearRows(menuContextFromOffers(false));
    expect(rows.some((item) => item.enabled)).toBe(true);
  });
});

describe("ChromeBar toolbar order (CU/06)", () => {
  const back = { promptId: "prompt-back", actionId: "back", label: "Back" };

  it("EV-04: Back sends only its own act; Close, ? and the gear send none", () => {
    const onAct = vi.fn();
    click({ live: true, onAct, back }, (b) => b.props["data-action"] === "back");
    expect(onAct).toHaveBeenCalledTimes(1);
    expect(onAct).toHaveBeenCalledWith("prompt-back", "back");

    const quiet = vi.fn();
    click({ live: true, onAct: quiet, back }, (b) => b.props["data-action"] === "help");
    click({ live: true, onAct: quiet, back }, (b) => b.props["data-action"] === "menu");
    click(
      { live: true, onAct: quiet, back, initialMenuOpen: true },
      (b) => b.props["data-action"] === "menu",
    );
    click(
      { live: true, onAct: quiet, back, initialMenuOpen: true },
      (b) => b.props.className === "bt-secondary bt-menu-close",
    );
    expect(quiet).not.toHaveBeenCalled();
  });

  it("EV-04: Back and Replay stay in the bar, never in the Menu dialog", () => {
    const html = markup({ live: true, back, initialMenuOpen: true });
    const dialog = html.slice(html.indexOf("data-menu"), html.indexOf("data-bottom-bar"));
    expect(dialog).not.toContain('data-action="back"');
    expect(dialog).not.toContain('data-action="replay"');
    const bar = html.slice(html.indexOf("data-bottom-bar"));
    const at = (name: string) => bar.indexOf(`data-action="${name}"`);
    expect(at("help")).toBeGreaterThan(-1);
    expect(at("help")).toBeLessThan(at("back"));
    expect(at("back")).toBeLessThan(at("replay"));
    expect(at("replay")).toBeLessThan(at("menu"));
  });

  it("EV-08: Replay is disabled and aria-disabled with or without a Back offer", () => {
    for (const props of [{ live: true }, { live: true, back }] as const) {
      const html = markup(props);
      const at = html.indexOf('data-action="replay"');
      const replay = html.slice(html.lastIndexOf("<button", at), html.indexOf("</button>", at));
      expect(replay).toContain("disabled");
      expect(replay).toContain('aria-disabled="true"');
      expect(replay).not.toContain("data-prompt-id");
    }
  });

  it("EV-06: the e2e spec pins the new order and the centre rule, not a centred gear", () => {
    const source = readFileSync(
      join(import.meta.dirname, "../../../e2e/tests/w1-chrome.spec.ts"),
      "utf8",
    );
    expect(source).toContain("expect(help.x).toBeLessThan(back.x)");
    expect(source).toContain("expect(back.x).toBeLessThan(replay.x)");
    expect(source).toContain("expect(replay.x).toBeLessThan(menu.x)");
    expect(source).toContain("expectCentred");
    expect(source).toContain("CENTRE_TOLERANCE = 8");
    expect(source).toContain("END_GAP_TOLERANCE = 12");
    expect(source).not.toMatch(/centre third|centre-third|menu\.x[^\n]*view\.width\s*\/\s*3/);
    expect(source).not.toMatch(/menu[^\n]*(centred|centered)/i);
  });
});
