import { expect, type Page, test } from "@playwright/test";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * F1/02 EV-10 (EE-01, DEC-948): the Quest row on the iPad, a quest won, the turn spent.
 * The quest is opened with the TEST ONLY marker `~test-quest:<space>=<quest>`. After F1/03, that
 * marker loads the pack's Herald, so the buttons are found by option id, not by label (the pack
 * copy may still be a placeholder). The group stands in the village; every hero sits in one group.
 */

const STORY_ID = "test";
const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const VILLAGE = "N-egans-end";
const SEED = `ee01~test-event:none~test-at:${VILLAGE}~test-quest:${VILLAGE}=herald~test-hp:hero-a=4/12~test-seat-together`;

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const options = (pad: Page) => deviceMain(pad).locator("[data-building-option]");
const labelsOf = async (pad: Page) => {
  await expect(options(pad).first()).toBeVisible({ timeout: 20_000 });
  return (await options(pad).allInnerTexts()).map((text) => text.split("\n")[0]?.trim() ?? "");
};
const optionByLabel = (pad: Page, label: string) =>
  options(pad).filter({ hasText: new RegExp(`^${label}`) });

test.describe("F1/02 the Quest row and the quest pick", { tag: "@ipad-only" }, () => {
  test("EV-10: Quest on the iPad, won, the turn spent", async ({ browser }, testInfo) => {
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

      // The group's menu at the village: Quest first, with its cost.
      await clickAct(pad, "enter");
      await expect(deviceMain(pad).locator("section[data-building]")).toBeVisible({
        timeout: 20_000,
      });
      expect((await labelsOf(pad))[0]).toBe("Quest");
      const quest = optionByLabel(pad, "Quest");
      await expect(quest).toBeEnabled();
      await expect(quest).toContainText("1 move");

      // Quest: the quest's own buttons, found by option id (stable across pack copy).
      await quest.click();
      await expect(deviceMain(pad).locator('[data-building="quest"]')).toBeVisible();
      await expect(options(pad)).toHaveCount(3);
      const takeTheJob = deviceMain(pad).locator(
        '[data-building-option][data-prompt-id$="--qopt--take-the-job"]',
      );
      const askForPay = deviceMain(pad).locator(
        '[data-building-option][data-prompt-id$="--qopt--ask-pay-first"]',
      );
      const leaveQuest = deviceMain(pad).locator(
        '[data-building-option][data-prompt-id$="--qleave"]',
      );
      await expect(takeTheJob).toBeEnabled();
      await expect(askForPay).toBeEnabled();
      await expect(leaveQuest).toBeEnabled();

      // Ask for pay: the turn is spent, the menu has no Quest and every pick is greyed.
      // C3/14: the rewards step and the end hook (4 s each, no audio) come before the menu.
      await askForPay.click();
      await expect(deviceMain(pad).locator('[data-building="menu"]')).toBeVisible({
        timeout: 20_000,
      });
      expect(await labelsOf(pad)).toEqual(["Rest", "Cleanse"]);
      await expect(optionByLabel(pad, "Rest")).toBeDisabled();
      await expect(optionByLabel(pad, "Cleanse")).toBeDisabled();
      await expect(deviceMain(pad).locator("[data-building-reason]").first()).toContainText(
        "No moves left.",
      );
      await expect(pad.locator('button[data-action-id="leave"]')).toBeEnabled();

      // Leave: the group does not get a move map again this day.
      await pad.locator('button[data-action-id="leave"]').click();
      await expect(deviceMain(pad).locator("section[data-building]")).toHaveCount(0, {
        timeout: 20_000,
      });
      await expect(pad.locator('button[data-action-id="walk"]')).toHaveCount(0);
    } finally {
      await context.close();
      await session.host.close();
    }
  });
});
