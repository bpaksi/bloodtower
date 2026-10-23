import { describe, expect, it } from "vitest";
import { SETUP_SCREENS, type SetupScreen } from "../../protocols/v2/common.ts";
import { project } from "./project.ts";
import type { ViewState } from "./state.ts";

const fixture = (screen: SetupScreen): ViewState => ({
  screen,
  levels: [
    {
      id: screen,
      label: screen,
      shows: `Public line for ${screen}. Each hero has a private thought.`,
    },
  ],
  heroes: [
    {
      id: "alpha",
      name: "Alpha",
      deviceId: "device-a",
      lines: [{ id: `${screen}.private.alpha`, text: `Alpha secret on ${screen}` }],
    },
    {
      id: "gamma",
      name: "Gamma",
      deviceId: "device-a",
      lines: [{ id: `${screen}.private.gamma`, text: `Gamma secret on ${screen}` }],
    },
    {
      id: "beta",
      name: "Beta",
      deviceId: "device-b",
      lines: [{ id: `${screen}.private.beta`, text: `Beta secret on ${screen}` }],
    },
    {
      id: "delta",
      name: "Delta",
      deviceId: null,
      lines: [{ id: `${screen}.private.delta`, text: `Delta secret on ${screen}` }],
    },
  ],
  actions: [
    {
      promptId: `continue-${screen}`,
      actionId: "continue",
      label: "Continue",
      open: true,
      deviceId: null,
    },
    {
      promptId: `back-${screen}`,
      actionId: "back",
      label: "Back",
      open: false,
      reason: "Nothing to undo yet.",
      deviceId: "device-b",
    },
  ],
  narration: { lineId: `${screen}.line`, text: "The table hears this." },
});

describe("project setup screens", () => {
  it("gives each iPad only its own heroes' private lines, on every setup screen", () => {
    expect(SETUP_SCREENS.length).toBeGreaterThan(0);
    for (const screen of SETUP_SCREENS) {
      const state = fixture(screen);
      const board = project(state, { kind: "board" });
      const padA = project(state, { kind: "device", deviceId: "device-a" });
      const padB = project(state, { kind: "device", deviceId: "device-b" });
      const stranger = project(state, { kind: "device", deviceId: "device-z" });

      const boardJson = JSON.stringify(board);
      expect(boardJson, screen).not.toContain(".private.");
      expect(boardJson, screen).not.toContain("ipad:");
      expect(boardJson, screen).not.toContain("secret");
      expect(boardJson, screen).toContain("private thought");
      expect(board.screen, screen).toBe(screen);
      expect(board.heroes.map((hero) => [hero.id, hero.held])).toEqual([
        ["alpha", true],
        ["gamma", true],
        ["beta", true],
        ["delta", false],
      ]);

      expect(padA.screen, screen).toBe(screen);
      expect(padA.deviceId).toBe("device-a");
      expect(padA.heroes.map((hero) => hero.id)).toEqual(["alpha", "gamma"]);
      const padAJson = JSON.stringify(padA);
      expect(padAJson, screen).toContain(`Alpha secret on ${screen}`);
      expect(padAJson, screen).toContain(`Gamma secret on ${screen}`);
      expect(padAJson, screen).not.toContain(`Beta secret on ${screen}`);
      expect(padAJson, screen).not.toContain(`Delta secret on ${screen}`);
      expect(padAJson, screen).not.toContain(".private.beta");
      expect(padAJson, screen).not.toContain(".private.delta");

      expect(padB.heroes.map((hero) => hero.id)).toEqual(["beta"]);
      const padBJson = JSON.stringify(padB);
      expect(padBJson, screen).toContain(`Beta secret on ${screen}`);
      expect(padBJson, screen).not.toContain(`Alpha secret on ${screen}`);
      expect(padBJson, screen).not.toContain(`Gamma secret on ${screen}`);
      expect(padBJson, screen).not.toContain(".private.alpha");

      expect(stranger.heroes).toEqual([]);
      expect(JSON.stringify(stranger), screen).not.toContain(".private.");

      for (const view of [board, padA, padB]) {
        expect(view.actions.length, screen).toBeGreaterThan(0);
        for (const action of view.actions) {
          expect(action.promptId, screen).toBeTruthy();
          expect(action.actionId, screen).toBeTruthy();
          expect(action.label, screen).toBeTruthy();
          if (action.open) {
            expect(action, screen).not.toHaveProperty("reason");
          } else {
            expect(action.reason.length, screen).toBeGreaterThan(0);
          }
        }
      }

      expect(padA.actions.map((action) => action.actionId)).toEqual(["continue"]);
      expect(padB.actions.map((action) => action.open)).toEqual([true, false]);
      const closed = padB.actions.find((action) => !action.open);
      expect(closed && !closed.open ? closed.reason : "").toBe("Nothing to undo yet.");
    }
  });
});
