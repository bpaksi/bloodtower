import { readFileSync } from "node:fs";
import { join } from "node:path";
import { errors, expect, type Page, test } from "@playwright/test";
import { openDatabase } from "../../server/db/client.ts";
import { projectGameRecords } from "../../server/events/gameStats.ts";
import { createEventStore } from "../../server/events/store.ts";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * C3/10 EV-06 (DEC-214, SCR-021): a game that ends shows on tonight's games as won or lost, never
 * quit. A real Ruined Keep game (its chapters load from the pack, F1/03) is lost on night 1: three
 * E buildings start fallen and the fourth at 3 skulls, and the night's one skull is sent to E, so
 * the fourth falls (four fallen anywhere, PT-02). Runs at the phone, iPad and desktop viewports.
 */

const HERO = "hero-a";
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;

type Space = { id: string; kingdom: string; building: string | null };
const east = (
  JSON.parse(
    readFileSync(join(import.meta.dirname, "../../../../../packs/base/board/spaces.json"), "utf8"),
  ) as { spaces: Space[] }
).spaces.filter((space) => space.kingdom === "E" && space.building);
if (east.length < 4) throw new Error("The base board needs four buildings in E.");
const SKULLS = east
  .slice(0, 4)
  .map((space, index) => `${space.id}=${index < 3 ? 4 : 3}`)
  .join(",");
const SEED = `c3-end-1~test-event:none~test-skulls:${SKULLS}~test-kingdom:E`;

type HookWindow = {
  __btSessionSocket?: WebSocket;
  __btLastDeviceView?: { actions: { promptId: string; actionId: string; open: boolean }[] };
};

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

/** Sends the next press a table makes between turns; never Quit, a move or a regroup. */
const pressOnce = (pad: Page) =>
  pad.evaluate(() => {
    const win = window as unknown as HookWindow;
    const socket = win.__btSessionSocket;
    const view = win.__btLastDeviceView;
    if (!socket || socket.readyState !== WebSocket.OPEN || !view) return false;
    const open = view.actions.filter((action) => action.open);
    const prefer = ["continue", "end-turn", "record", "done", "leave"];
    const pick =
      open.find((action) => action.promptId === "regroup-done") ??
      prefer.map((id) => open.find((action) => action.actionId === id)).find(Boolean) ??
      null;
    if (!pick) return false;
    socket.send(
      JSON.stringify({
        v: 2,
        type: "act",
        payload: { promptId: pick.promptId, actionId: pick.actionId, args: {} },
      }),
    );
    return true;
  });

const playToSession = async (pad: Page) => {
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    if ((await deviceMain(pad).getAttribute("data-screen")) === "session") return;
    if (!(await pressOnce(pad))) {
      await pad.waitForTimeout(100);
      continue;
    }
    try {
      await pad.waitForTimeout(150);
    } catch (error) {
      if (!(error instanceof errors.TimeoutError)) throw error;
    }
  }
  throw new Error("Timed out before the session screen.");
};

const recordsIn = (databasePath: string) => {
  const opened = openDatabase(databasePath);
  try {
    return projectGameRecords(createEventStore(opened.db));
  } finally {
    opened.close();
  }
};

test.describe("C3/10 tonight's games shows how a game ended", () => {
  test("EV-06: a lost game's row reads lost, not quit, on the iPad and the board", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const { host, baseURL, databasePath } = await startAcceptanceHost(testInfo, { seed: SEED });
    const { viewport, hasTouch } = testInfo.project.use;
    const context = await browser.newContext({ baseURL, viewport, hasTouch });
    const pad = await context.newPage();
    const board = await context.newPage();
    await board.setViewportSize({ width: 1920, height: 1080 });
    await board.goto("/board");
    await installSessionSocketHook(pad);
    try {
      await pad.goto(`/join?code=${host.joinCode}`);
      await enterWithoutTower(pad);
      await clickAct(pad, "continue", "continue-pick-story-test");
      const size = pad.locator(
        `button[data-setting="party-size"][data-option="n-1"][data-action="set"]`,
      );
      await size.click();
      await expect(size).toHaveAttribute("aria-pressed", "true");
      await clickAct(pad, "continue", "continue-game-settings");
      await holdHeroesFromTest(pad, [HERO]);
      await clickAct(pad, "continue", "continue-claim-heroes");
      for (const id of SETUP_IDS) {
        await expect(deviceMain(pad)).toHaveAttribute("data-setup-step", id, { timeout: 20_000 });
        if (id === "starting-purse") await clickAct(pad, "spin", "spin-setup-starting-purse");
        await clickAct(pad, "continue", `continue-setup-${id}`);
      }
      await clickAct(pad, "continue", "continue-begin");
      for (const id of OPENING_IDS) {
        await clickAct(pad, "continue", `continue-opening-${id.replace(".", "-")}`);
      }

      await playToSession(pad);
      // C3/16 lands on Game stats for the finished game; Back shows Tonight's games on the session screen.
      if ((await pad.locator("[data-game-stats]").count()) > 0) {
        await clickAct(pad, "back", "stats-back");
        await expect(pad.locator("[data-session-buttons]")).toBeVisible({ timeout: 20_000 });
      }

      // The record is the loss, once.
      const records = recordsIn(databasePath);
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({ outcome: "lost" });

      // The iPad: one row, "Game 1 lost", and no quit mark or Continue.
      const labels = (await deviceMain(pad).locator(".bt-scroll button").allInnerTexts()).map(
        (text) => text.trim().replace(/\s+/g, " "),
      );
      expect(labels).toContain("Game 1 lost");
      expect(labels.some((label) => /quit/i.test(label))).toBe(false);
      expect(labels).not.toContain("Continue");

      // The board: the same row, marked lost.
      const rows = board.locator("[data-session-row='game']");
      await expect(rows).toHaveCount(1, { timeout: 20_000 });
      await expect(rows.first()).toContainText(/lost/i);
      await expect(rows.first()).not.toContainText(/quit/i);
    } finally {
      await context.close();
      await host.close();
    }
  });
});
