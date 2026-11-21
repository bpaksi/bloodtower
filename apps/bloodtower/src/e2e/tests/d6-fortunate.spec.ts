import { expect, type Page, test } from "@playwright/test";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * D6 / 01-drop-counter-and-free-pick EV-12 (DEC-913, DEC-946): Fortunate's free pick on the iPad at
 * 0 moves, and the menu that stays open after it.
 *
 * Fixture note: a skull on a village removes its Rest (DEC-093), so the eval's order (Rest to 0
 * moves, then Cleanse at 1 skull) cannot be played on main. This spec plays the order main allows:
 * Cleanse first (the one move that is spent), then the free Rest, which waives one move. Buttons are
 * found by their pick or move number, never by pack copy.
 */

const STORY_ID = "test";
const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const VILLAGE = "N-egans-end";
const SEED = `d6~test-event:none~test-virtue-ids:hero-a=fortunate~test-skulls:${VILLAGE}=1~test-hp:hero-a=4/12~test-at:${VILLAGE}~test-seat-together`;

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const options = (pad: Page) => deviceMain(pad).locator("[data-building-option]");
const pickOption = (pad: Page, pick: string) =>
  deviceMain(pad).locator(`[data-building-option][data-prompt-id$="--pick--${pick}"]`);

test.describe("D6 Fortunate's free pick", () => {
  test.beforeEach(({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The menu is on the iPad.");
  });

  test("EV-12: the free Rest after the last move, then a menu with every pick greyed", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const session = await startAcceptanceHost(testInfo, {
      seed: SEED,
      lanHost: () => "192.0.2.10",
      seatTogether: true,
    });
    const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
    try {
      const pad = await context.newPage();
      const board = await context.newPage();
      await board.setViewportSize(BOARD_SIZE);
      await board.goto("/board");
      await installSessionSocketHook(pad);
      await pad.goto(`/join?code=${session.host.joinCode}`);
      await enterWithoutTower(pad);
      await clickAct(pad, "continue", `continue-pick-story-${STORY_ID}`);
      const size = pad.locator(
        `button[data-setting="party-size"][data-option="n-4"][data-action="set"]`,
      );
      await size.click();
      await expect(size).toHaveAttribute("aria-pressed", "true");
      await clickAct(pad, "continue", "continue-game-settings");
      await holdHeroesFromTest(pad, [...FOUR]);
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
      await clickAct(pad, "continue");
      await expect(board.locator("#band [data-days-left]")).toBeVisible({ timeout: 20_000 });

      // The village with one skull has no Rest; Cleanse costs one move.
      await clickAct(pad, "enter");
      await expect(deviceMain(pad).locator('section[data-building="menu"]')).toBeVisible({
        timeout: 20_000,
      });
      await expect(pickOption(pad, "rest")).toHaveCount(0);
      await expect(pickOption(pad, "cleanse")).toContainText("1 move");
      await pickOption(pad, "cleanse").click();
      await expect(board.locator("[data-building-board-badge]")).toHaveText("−1 skull · +1 day", {
        timeout: 20_000,
      });

      // The result moves on by itself. Fortunate's free pick is pending: Rest reads 0 moves and is
      // open, Cleanse is shut (once per building per turn).
      await expect(deviceMain(pad).locator('section[data-building="menu"]')).toBeVisible({
        timeout: 20_000,
      });
      await expect(pickOption(pad, "rest")).toBeEnabled();
      await expect(pickOption(pad, "rest")).toContainText("0 moves");
      await expect(pickOption(pad, "cleanse")).toBeDisabled();

      // Rest as long as the moves allow, plus the one the free pick waives: the last button.
      await pickOption(pad, "rest").click();
      // Four heroes share the group, so Rest asks who rests first: hero-a, who holds Fortunate.
      const who = deviceMain(pad).locator(
        '[data-building-option][data-prompt-id$="--who--hero-a"]',
      );
      await expect(who).toBeVisible({ timeout: 20_000 });
      await who.click();
      const lastMove = deviceMain(pad).locator(
        '[data-building-option][data-prompt-id*="--moves--"]',
      );
      await expect(lastMove.first()).toBeVisible({ timeout: 20_000 });
      await lastMove.last().click();
      await clickAct(pad, "build");

      // The menu stays open: every pick greyed, Leave enabled.
      await expect(deviceMain(pad).locator('section[data-building="menu"]')).toBeVisible({
        timeout: 20_000,
      });
      await expect(pickOption(pad, "rest")).toBeDisabled();
      await expect(pickOption(pad, "cleanse")).toBeDisabled();
      await expect(pickOption(pad, "quest")).toBeDisabled();
      await expect(pad.locator('button[data-action-id="leave"]')).toBeEnabled();
    } finally {
      await context.close();
      await session.host.close();
    }
  });
});
