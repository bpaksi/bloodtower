import { expect, type Page, test } from "@playwright/test";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * D4/01 EV-11 (DEC-910, DEC-943): a fallen village that holds an open quest still shows Enter and
 * no fallen note; the menu is Quest, then Leave; Quest opens the quest's first step. The pack's
 * Herald sits at the village; `~test-skulls:` fells it and `~test-at:` stands the group on it.
 */

const STORY_ID = "test";
const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const VILLAGE = "N-egans-end";
const SEED = `d4~test-event:none~test-at:${VILLAGE}~test-skulls:${VILLAGE}=4~test-seat-together`;

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

test.describe("D4/01 a fallen building keeps its quest", () => {
  test.beforeEach(({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The menu is on the iPad.");
  });

  test("EV-11: Enter, then Quest and Leave, on a fallen village", async ({ browser }, testInfo) => {
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

      // The move map: Enter is there and the fallen note is not.
      await expect(pad.locator('button[data-action-id="enter"]')).toBeVisible({ timeout: 20_000 });
      await expect(deviceMain(pad).locator("[data-fallen-box]")).toHaveCount(0);

      // Enter: exactly two rows, Quest then Leave. Leave is the toolbar button, not a row.
      await clickAct(pad, "enter");
      await expect(deviceMain(pad).locator("section[data-building]")).toBeVisible({
        timeout: 20_000,
      });
      expect(await labelsOf(pad)).toEqual(["Quest"]);
      await expect(pad.locator('button[data-action-id="leave"]')).toBeEnabled();

      // Quest opens the herald's first step.
      await optionByLabel(pad, "Quest").click();
      await expect(deviceMain(pad).locator('[data-building="quest"]')).toBeVisible();
      await expect(
        deviceMain(pad).locator('[data-building-option][data-prompt-id$="--qopt--take-the-job"]'),
      ).toBeEnabled();
    } finally {
      await context.close();
      await session.host.close();
    }
  });
});
