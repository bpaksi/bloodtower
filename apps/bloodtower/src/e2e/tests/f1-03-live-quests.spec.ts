import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

/**
 * F1/03 EV-10 (DEC-949, DEC-948, DEC-821, C3-19): a real Ruined Keep game, with no `~test-quest:`,
 * `~test-at:`, `~test-skulls:` or `~test-gold:` marker. The Herald is open at Egan's End from the
 * story pack, so a group that walks there finds the Quest row and the pack's own labels.
 *
 * Party and seed: one hero (hero-a), seed `f103-e2e-2`. Hero A starts at the Arisilon citadel
 * (N-radiant-mountains), Egan's End is 4 steps away, and day 1's roll for this seed is 5 moves,
 * so the group stands in the village with 1 move left (a unit probe over seeds 1 to 30 found it).
 */

const STORY_ID = "test";
const SEED = "f103-e2e-2~test-event:none";
const HERO = "hero-a";
const PORTRAIT = { viewport: { width: 768, height: 1024 }, hasTouch: true as const };
const BOARD_SIZE = { width: 1920, height: 1080 };
const SETUP_IDS = ["seals-and-skulls", "place-heroes", "starting-purse"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;
const START = "N-radiant-mountains";
const VILLAGE = "N-egans-end";
const TAKE = "[COPY: Take the job]";
const PAY = "[COPY: Ask for pay first]";

type Space = { id: string; adjacent: string[] };
const spaces = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../../../../packs/base/board/spaces.json"), "utf8"),
) as { spaces: Space[] };

/** The shortest path of space ids from `from` to `to`, `from` left out. */
const pathTo = (from: string, to: string): string[] => {
  const byId = new Map(spaces.spaces.map((space) => [space.id, space]));
  const before = new Map<string, string>([[from, from]]);
  const queue = [from];
  while (queue.length > 0) {
    const here = queue.shift() as string;
    if (here === to) break;
    for (const next of byId.get(here)?.adjacent ?? []) {
      if (before.has(next)) continue;
      before.set(next, here);
      queue.push(next);
    }
  }
  const path: string[] = [];
  for (let at = to; at !== from; at = before.get(at) as string) path.unshift(at);
  return path;
};

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
  options(pad).filter({ hasText: new RegExp(`^${label.replace(/[[\]]/g, "\\$&")}`) });

const startGame = async (pad: Page, board: Page) => {
  await enterWithoutTower(pad);
  await clickAct(pad, "continue", `continue-pick-story-${STORY_ID}`);
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
  await clickAct(pad, "continue");
  await expect(board.locator("#band [data-days-left]")).toBeVisible({ timeout: 20_000 });
};

const openBoard = async (browser: import("@playwright/test").Browser, baseURL: string) => {
  const context = await browser.newContext({ baseURL, ...PORTRAIT });
  const pad = await context.newPage();
  const board = await context.newPage();
  await board.setViewportSize(BOARD_SIZE);
  await board.goto("/board");
  await installSessionSocketHook(pad);
  return { context, pad, board };
};

test.describe("F1/03 a real game's Herald, from the story pack", () => {
  test.beforeEach(({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== "ipad", "The menu is on the iPad.");
  });

  test("EV-10: walk to Egan's End, the Quest row, the pack's labels, the turn spent, and Continue", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const first = await startAcceptanceHost(testInfo, { seed: SEED });
    const { databasePath } = first;
    let closed = false;
    const one = await openBoard(browser, first.baseURL);
    try {
      expect(SEED).not.toMatch(/~test-(quest|at|skulls|gold):/);
      await one.pad.goto(`/join?code=${first.host.joinCode}`);
      await startGame(one.pad, one.board);

      // Walk the 4 steps to Egan's End; one move is left.
      for (const step of pathTo(START, VILLAGE)) {
        await one.pad.locator(`button[data-prompt-id="walk--${HERO}--${step}"]`).click();
        await expect(deviceMain(one.pad).locator("p").first()).toHaveAttribute("data-space", step, {
          timeout: 20_000,
        });
      }
      await expect(deviceMain(one.pad).locator("p").first()).toHaveAttribute("data-moves", "1");

      await clickAct(one.pad, "enter");
      await expect(deviceMain(one.pad).locator("section[data-building]")).toBeVisible({
        timeout: 20_000,
      });
      expect((await labelsOf(one.pad))[0]).toBe("Quest");
      const quest = optionByLabel(one.pad, "Quest");
      await expect(quest).toBeEnabled();
      await expect(quest).toContainText("1 move");

      await quest.click();
      await expect(deviceMain(one.pad).locator('[data-building="quest"]')).toBeVisible();
      expect(await labelsOf(one.pad)).toEqual([TAKE, PAY, "Leave"]);

      await optionByLabel(one.pad, PAY).click();
      await expect(deviceMain(one.pad).locator('[data-building="menu"]')).toBeVisible();
      expect(await labelsOf(one.pad)).toEqual(["Rest", "Cleanse"]);
      await expect(optionByLabel(one.pad, "Rest")).toBeDisabled();
      await expect(optionByLabel(one.pad, "Cleanse")).toBeDisabled();
      await expect(deviceMain(one.pad).locator("[data-building-reason]").first()).toContainText(
        "No moves left.",
      );
      await expect(one.pad.locator('button[data-action-id="leave"]')).toBeEnabled();
      await one.pad.locator('button[data-action-id="leave"]').click();
      await expect(deviceMain(one.pad).locator("section[data-building]")).toHaveCount(0, {
        timeout: 20_000,
      });

      // Save and quit, restart the host, Continue.
      await one.pad.locator('[data-action="menu"]').click();
      await one.pad.locator('button[data-gear-item="save-and-quit"]').click();
      await one.pad.locator("[data-menu]").getByRole("button", { name: "Save and quit" }).click();
      await expect(deviceMain(one.pad)).toHaveAttribute("data-screen", "session", {
        timeout: 30_000,
      });
      await one.context.close();
      await first.host.close();
      closed = true;
    } finally {
      if (!closed) {
        await one.context.close();
        await first.host.close();
      }
    }

    const restarted = await startAcceptanceHost(testInfo, { databasePath, seed: SEED });
    const two = await openBoard(browser, restarted.baseURL);
    try {
      await two.pad.goto(`/join?code=${restarted.host.joinCode}`);
      await clickAct(two.pad, "continue", "continue-saved-game");
      await expect(deviceMain(two.pad)).toHaveAttribute("data-screen", "play", {
        timeout: 30_000,
      });
      await holdHeroesFromTest(two.pad, [HERO]);

      // Play on, as a table does, to the group's next turn at Egan's End; then Enter.
      const enter = two.pad.locator('button[data-action-id="enter"]');
      await test.step("play on to the next turn", async () => {
        for (let guard = 0; guard < 60 && (await enter.count()) === 0; guard += 1) {
          const next = two.pad
            .locator(
              'button[data-action-id="continue"]:enabled, button[data-action-id="record"]:enabled, button[data-action-id="done"]:enabled',
            )
            .first();
          // The roll panel animates, so its button is never "stable": press it without waiting.
          if ((await next.count()) > 0) await next.click({ force: true, timeout: 10_000 });
          else await two.pad.waitForTimeout(250);
        }
      });
      await test.step("press Enter at Egan's End", async () => {
        await enter.click({ timeout: 10_000 });
        await expect(deviceMain(two.pad).locator("section[data-building]")).toBeVisible({
          timeout: 20_000,
        });
      });
      const labels = await labelsOf(two.pad);
      expect(labels).not.toContain("Quest");
      expect(labels).toEqual(expect.arrayContaining(["Rest", "Cleanse"]));
    } finally {
      await two.context.close();
      await restarted.host.close();
    }
  });
});
