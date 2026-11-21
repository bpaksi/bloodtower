import { expect, type Page, test } from "@playwright/test";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * D5 / 01-pool-pays, EV-12 (DEC-911, DEC-944): a hero with no gold buys from the party.
 *
 * The heroes sit in separate groups (no `~test-seat-together`). The acting group is read from the
 * board, then the test-only live seed gives its hero 0 gold and one hero of another group 10. The
 * Rally row must be open and the press must take the 5 from the other group's hero. The gold is read
 * from the board's "Current party" panel (each hero's sheet gold). Buttons are found by data
 * attributes and option ids, never by pack copy.
 */

const STORY_ID = "test";
const FOUR = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const CITADEL = "N-radiant-mountains";
const SEED = `d5-pool~test-event:none~test-at:${CITADEL}~test-hp:hero-a=4/12,hero-b=4/12,hero-c=4/12,hero-d=4/12`;

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

/** The Rally row, found by its pick id in the prompt id (`--pick--rally`), not by its words. */
const rallyRow = (pad: Page) =>
  deviceMain(pad).locator('[data-building-option][data-prompt-id$="--pick--rally"]');

const heroRow = (board: Page, heroId: string) =>
  board.locator(`[data-panel="current-party"] [data-hero="${heroId}"]`);

test.describe("D5 the pool pays", () => {
  test.beforeEach(({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The menu is on the iPad.");
  });

  test("EV-12: a hero with no gold buys Rally from a hero in another group", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const session = await startAcceptanceHost(testInfo, {
      seed: SEED,
      lanHost: () => "192.0.2.10",
      seatTogether: false,
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

      // The acting group is one hero (the heroes sit apart). Read who it is from the board.
      const acting = board.locator("#band [data-acting]");
      await expect(acting).toHaveText(/^Hero [A-D]$/, { timeout: 20_000 });
      const actingId = `hero-${((await acting.innerText()).trim().slice(-1) || "").toLowerCase()}`;
      expect(FOUR).toContain(actingId);
      const rich = FOUR.find((id) => id !== actingId) as string;
      const gold = FOUR.map((id) => `${id}=${id === rich ? 10 : 0}`).join(",");
      await session.host.applyTestSeed(`~test-gold:${gold}`);

      // The citadel menu: Rally is open with no refusal, though the acting hero holds nothing.
      await clickAct(pad, "enter");
      await expect(deviceMain(pad).locator("section[data-building]")).toBeVisible({
        timeout: 20_000,
      });
      const rally = rallyRow(pad);
      await expect(rally).toBeEnabled({ timeout: 20_000 });
      await expect(deviceMain(pad)).not.toContainText("Not enough gold.");

      // The press is accepted: the result shows, and the heroes' gold moved only for the rich hero.
      await rally.click();
      await expect(deviceMain(pad).locator('[data-building="result"]')).toBeVisible({
        timeout: 20_000,
      });
      await pad.locator('[data-action="menu"]').click();
      const row = pad.locator('[data-menu] button[data-gear-item="current-party"]');
      await expect(row).toBeEnabled();
      await row.click();
      await expect(board.locator('[data-panel="current-party"]')).toBeVisible({ timeout: 20_000 });
      await expect(heroRow(board, rich)).toContainText("Gold 5", { timeout: 20_000 });
      for (const id of FOUR.filter((hero) => hero !== rich)) {
        await expect(heroRow(board, id)).toContainText("Gold 0");
      }
    } finally {
      await context.close();
      await session.host.close();
    }
  });
});
