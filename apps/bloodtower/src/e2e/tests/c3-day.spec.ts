import { expect, type Page, test } from "@playwright/test";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * C3 feature 11, the day on the board. Only the evals this spec can drive with the real
 * host are live here. The rest are `fixme` with the missing piece named; none is weakened.
 */

const STORY_ID = "test";
const HERO_IDS = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const SETUP_IDS = ["seals-and-skulls", "place-heroes"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const HELP_LINE = "A new day begins. Move your heroes, then choose where to go.";
/** `<Group>: <total>` then optional `(+N virtue)` `(+N terrain)` `(−N corruption)` terms. */
const ROLL_LINE = /^.+: \d+( \(\+\d+ virtue\))?( \(\+\d+ terrain\))?( \(−\d+ corruption\))?$/;

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const expectToolbar = async (page: Page) => {
  const footer = page.locator("footer.bt-bar--bottom");
  await expect(footer).toBeVisible();
  const buttons = footer.locator("button");
  await expect(buttons.first()).toHaveText("?");
  await expect(buttons.last()).toHaveAttribute("data-action", "menu");
};

test.describe("C3/11 the day on the board", () => {
  test.beforeEach((_fixtures, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The approved mockup is iPad portrait.");
  });

  test("EV-01, EV-02, EV-07, EV-08, EV-11, EV-12, EV-13: roll, band, threat, corruptions, toolbar, help", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const session = await startAcceptanceHost(testInfo, { seed: "c3-day-1" });
    const context = await browser.newContext({ baseURL: session.baseURL, ...PORTRAIT });
    const pad = await context.newPage();
    const board = await context.newPage();
    await board.setViewportSize({ width: 1920, height: 1080 });
    try {
      await board.goto("/board");
      await installSessionSocketHook(pad);
      await pad.goto(`/join?code=${session.host.joinCode}`);
      await enterWithoutTower(pad);
      await clickAct(pad, "continue", `continue-pick-story-${STORY_ID}`);
      await clickAct(pad, "continue", "continue-game-settings");
      await holdHeroesFromTest(pad, [...HERO_IDS]);
      await clickAct(pad, "continue", "continue-claim-heroes");
      for (const id of SETUP_IDS) {
        await expect(deviceMain(pad)).toHaveAttribute("data-setup-step", id, { timeout: 20_000 });
        await clickAct(pad, "continue", `continue-setup-${id}`);
      }
      await clickAct(pad, "continue", "continue-begin");
      for (const id of OPENING_IDS) {
        await clickAct(pad, "continue", `continue-opening-${id.replace(".", "-")}`);
      }

      // Day roll (UI-021): "Day 1" and one line per group, in the spec's term format.
      const roll = board.locator("#roll");
      await expect(roll).toBeVisible({ timeout: 20_000 });
      await expect(roll.locator("[data-roll-day]")).toHaveText("Day 1");
      const lines = await roll.locator("li[data-roll]").allTextContents();
      expect(lines.length).toBeGreaterThanOrEqual(1);
      for (const line of lines) expect(line).toMatch(ROLL_LINE);
      for (const total of await roll
        .locator("li[data-roll]")
        .evaluateAll((els) => els.map((el) => Number(el.getAttribute("data-total"))))) {
        expect(total).toBeGreaterThanOrEqual(2);
      }
      await expectToolbar(pad);

      // Help matches this screen and sends nothing (EV-13).
      await pad.locator('footer.bt-bar--bottom [data-action="help"]').click();
      const sheet = pad.locator("[data-help]");
      await expect(sheet).toHaveAttribute("data-help-screen", "day-on-the-board");
      await expect(sheet.locator("p")).toHaveText(HELP_LINE);
      await sheet.getByRole("button", { name: "Close" }).click();
      await expect(sheet).toHaveCount(0);

      // Mid-turn: band, days left, threat bar (EV-02, EV-07 night 1, 4 heroes: drop 1).
      await clickAct(pad, "continue");
      const band = board.locator("#band");
      await expect(band.locator("[data-days-left]")).toBeVisible({ timeout: 20_000 });
      await expect(band.locator("[data-day]")).toHaveText("Day 1");
      // 4 heroes, 24 skulls, 1,2,1,2 pattern: 16 nights (Q-C3-04). Never "skulls".
      await expect(band.locator("[data-days-left]")).toHaveText("16 days left");
      await expect(board.locator("[data-threat]")).toHaveAttribute("data-threat", "1");
      await expect(board.locator("[data-threat-count]")).toHaveText("1 coming");
      await expectToolbar(pad);

      // No hero holds a corruption yet: nobody shows one (EV-08, negative half).
      await expect(board.locator("[data-hero-corruptions]")).toHaveCount(0);

      // The board takes no press (EV-05, board half).
      await expect(board.locator("main.bt-board button")).toHaveCount(0);

      // The happy path never opened the Menu or help sheet beyond the one EV-13 check (EV-12).
      await expect(board.locator("main.bt-board")).toHaveAttribute("data-gear-opens", "0");
    } finally {
      await context.close();
    }
  });

  const blocked: Array<[string, string]> = [
    [
      "EV-03, EV-04, EV-14, EV-17, EV-18",
      "The effects panel needs an effects step with auto-advance in the day loop (loops/day/loop.ts), which is outside this step's Touches (Hammer C3-05), and a Cleanse source in the event loop.",
    ],
    [
      "EV-05",
      "Regroup needs two heroes on one space at day 2 start; no seed hook places them yet.",
    ],
    [
      "EV-08 (names)",
      "The day clock stores corruption counts only; names such as Feral and Lost are not in engine state.",
    ],
    [
      "EV-09, EV-10",
      "Needs a hook that seeds a 3-skull building and a fixed kingdom draw; none exists inside Touches.",
    ],
    [
      "EV-15, EV-16, EV-20",
      "Gear split and use-item panels belong to C2 feature 04 and need a potion fixture; not in Touches.",
    ],
    ["EV-19", "Quit on day 3 needs a day-seeding hook; none exists inside Touches."],
    ["EV-06", "Screenshot comparison against mockup.html is a human/verifier step."],
  ];
  for (const [ids, reason] of blocked) {
    test.fixme(`${ids}: ${reason}`, async () => {});
  }
});
