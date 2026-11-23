import { expect, type Page, test } from "@playwright/test";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  passChapterCard,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * D6 / 01-drop-counter-and-free-pick EV-12 (DEC-913, DEC-946): Fortunate's free pick on the iPad at
 * 0 moves, and the menu that stays open after it.
 *
 * A skull on a village removes Rest (DEC-093), so eval.md's village Rest-then-Cleanse cannot be
 * played. This spec uses the citadel Rally-then-Cleanse path from unit EV-06: spend the last real
 * move on Rally, then assert Cleanse is ENABLED at 0 moves and take it as the free pick. A UI that
 * greys Cleanse at 0 moves must fail. Buttons are found by their pick id, never by pack copy.
 */

const STORY_ID = "test";
const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const CITADEL = "N-radiant-mountains";
const SEED = `d6~test-event:none~test-virtue-ids:hero-a=fortunate~test-skulls:${CITADEL}=1~test-hp:hero-a=4/12,hero-b=4/12,hero-c=4/12,hero-d=4/12~test-gold:hero-a=40,hero-b=0,hero-c=0,hero-d=0~test-at:${CITADEL}~test-seat-together`;

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const pickOption = (pad: Page, pick: string) =>
  deviceMain(pad).locator(`[data-building-option][data-prompt-id$="--pick--${pick}"]`);

const boardBuilding = (board: Page) => board.locator("[data-building-board]");

test.describe("D6 Fortunate's free pick", { tag: "@ipad-only" }, () => {
  test("EV-12: Rally to 0 moves, then Cleanse is enabled as the free pick", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const session = await startAcceptanceHost(testInfo, {
      seed: SEED,
      lanHost: () => "192.0.2.10",
      seatTogether: true,
      fakeWait: true,
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
      await passChapterCard(pad, session.waitClock);
      await clickAct(pad, "continue");
      await expect(board.locator("#band [data-days-left]")).toBeVisible({ timeout: 20_000 });

      const enterMenu = async () => {
        await clickAct(pad, "enter");
        await expect(deviceMain(pad).locator('section[data-building="menu"]')).toBeVisible({
          timeout: 20_000,
        });
      };

      const waitMenu = async () => {
        session.waitClock?.advance(4_100);
        await expect(deviceMain(pad).locator('section[data-building="menu"]')).toBeVisible({
          timeout: 20_000,
        });
      };

      /** Rally spends one move. Four seated heroes share known hit points, so Rally asks who. */
      const rallyOnce = async () => {
        await expect(pickOption(pad, "rally")).toBeEnabled({ timeout: 20_000 });
        await pickOption(pad, "rally").click();
        const who = deviceMain(pad).locator(
          '[data-building-option][data-prompt-id$="--who--hero-a"]',
        );
        await expect(who).toBeVisible({ timeout: 20_000 });
        await who.click();
        await waitMenu();
      };

      await enterMenu();
      await expect(pickOption(pad, "cleanse")).toContainText("1 move");

      // Rally spends one move a time. Leave and re-enter so extra Rallies do not take the free pick.
      // The last Rally lands at 0 moves with the free pick pending (unit EV-06).
      for (let n = 0; n < 12; n++) {
        const left = Number((await boardBuilding(board).getAttribute("data-moves")) ?? "0");
        if (left <= 1) break;
        await rallyOnce();
        await pad.locator('button[data-action-id="leave"]').click();
        await expect(pad.locator('button[data-action-id="enter"]')).toBeEnabled({
          timeout: 20_000,
        });
        await enterMenu();
      }
      await expect(boardBuilding(board)).toHaveAttribute("data-moves", "1");
      await rallyOnce();
      await expect(boardBuilding(board)).toHaveAttribute("data-moves", "0");

      // The menu stays open at 0 moves; Cleanse is enabled with a 0-moves cost line.
      await expect(deviceMain(pad).locator('section[data-building="menu"]')).toBeVisible();
      await expect(pickOption(pad, "cleanse")).toBeEnabled();
      await expect(pickOption(pad, "cleanse")).toContainText("0 moves");

      await pickOption(pad, "cleanse").click();
      await expect(board.locator("[data-building-board-badge]")).toHaveText("−1 skull · +1 day", {
        timeout: 20_000,
      });
      await waitMenu();
      await expect(boardBuilding(board)).toHaveAttribute("data-skulls", "0");

      // The menu stays open: every pick greyed, Leave enabled.
      await expect(deviceMain(pad).locator('section[data-building="menu"]')).toBeVisible();
      await expect(pickOption(pad, "rally")).toBeDisabled();
      await expect(pickOption(pad, "cleanse")).toBeDisabled();
      await expect(pickOption(pad, "virtue-draw")).toBeDisabled();
      await expect(pad.locator('button[data-action-id="leave"]')).toBeEnabled();
    } finally {
      await context.close();
      await session.host.close();
    }
  });
});
