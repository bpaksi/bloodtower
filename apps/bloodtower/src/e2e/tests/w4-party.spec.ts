import { expect, type Page, test } from "@playwright/test";
import { DEVICE_TOKEN_KEY } from "../../web/lib/session.ts";
import {
  captureFrames,
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  setSoundAndKeep,
  startAcceptanceHost,
} from "./support/acceptance.ts";

const HEROES = ["hero-a", "hero-b", "hero-c", "hero-d", "hero-e", "hero-f"] as const;
const NAMES = ["Hero A", "Hero B", "Hero C", "Hero D", "Hero E", "Hero F"] as const;

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const sendTake = async (page: Page, heroId: string) => {
  await page.evaluate((id) => {
    const socket = (window as unknown as { __btSessionSocket?: WebSocket }).__btSessionSocket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Session socket is not open.");
    }
    socket.send(
      JSON.stringify({
        v: 2,
        type: "act",
        payload: { promptId: "hero-hold", actionId: "take", args: { heroId: id } },
      }),
    );
  }, heroId);
};

const toSettings = async (page: Page, joinCode: string) => {
  await installSessionSocketHook(page);
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/);
  await enterWithoutTower(page);
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-story");
  await clickAct(page, "continue", "continue-pick-story-test");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "game-settings");
};

/** The tower question is asked once, in the Enter, so Game settings goes straight to Party Join. */
const throughTowerToClaim = async (page: Page) => {
  await clickAct(page, "continue", "continue-game-settings");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "claim-heroes");
};

const backToGameSettings = async (page: Page) => {
  await clickAct(page, "back", "back-claim-heroes");
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "game-settings");
};

const SETUP_IDS = ["seals-and-skulls", "place-heroes"] as const;
const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;

/** Same walk as area-077: three setup steps, Begin, then the four opening moments. */
const finishSetup = async (page: Page) => {
  for (const id of SETUP_IDS) {
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "setup", { timeout: 20_000 });
    await expect(deviceMain(page)).toHaveAttribute("data-setup-step", id);
    await clickAct(page, "continue", `continue-setup-${id}`);
  }
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "begin", { timeout: 20_000 });
  await clickAct(page, "continue", "continue-begin");
  for (const id of OPENING_IDS) {
    await clickAct(page, "continue", `continue-opening-${id.replace(".", "-")}`);
  }
  await expect(deviceMain(page)).toHaveAttribute("data-screen", "play", { timeout: 20_000 });
};

const noClaimWords = async (page: Page) => {
  const text = (await deviceMain(page).innerText()).replaceAll("Party Join", "");
  expect(text).not.toMatch(/\bTake\b/);
  expect(text).not.toMatch(/\bClaim\b/);
  expect(text).not.toMatch(/\bHold\b/);
  expect(text.toLowerCase()).not.toContain("only this hero hears");
  expect(text).not.toContain("hears this");
  const names = await page.locator("main.bt-device button").allInnerTexts();
  for (const name of names) {
    expect(name).not.toMatch(/\bTake\b/);
    expect(name).not.toMatch(/\bClaim\b/);
    expect(name).not.toMatch(/\bHold\b/);
    expect(name.toLowerCase()).not.toContain("only this hero hears");
  }
};

test("W4 party size is n-1 through n-4 and defaults to 4", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "iPad check");
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w4-size" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const page = await context.newPage();
  const board = await context.newPage();
  try {
    await board.goto("/board");
    await toSettings(page, session.host.joinCode);
    for (const [option, label] of [
      ["n-1", "1"],
      ["n-2", "2"],
      ["n-3", "3"],
      ["n-4", "4"],
    ] as const) {
      const button = page.locator(
        `button[data-setting="party-size"][data-option="${option}"][data-action="set"]`,
      );
      await expect(button).toHaveText(label);
    }
    await expect(page.locator('button[data-option="n-4"]')).toHaveAttribute("aria-pressed", "true");
    await expect(deviceMain(page)).toContainText("Party size: 4");
    await expect(page.locator('button[data-prompt-id="continue-game-settings"]')).toBeEnabled();
    await expect(board.getByText("This story has nothing to set.")).toHaveCount(0);
    await expect(board.locator('[data-setting="party-size"] [data-setting-value]')).toHaveText("4");

    await page.locator('button[data-option="n-2"]').click();
    await expect(page.locator('button[data-option="n-2"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('button[data-option="n-4"]')).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(deviceMain(page)).toContainText("Party size: 2");
    await expect(board.locator('[data-setting="party-size"] [data-setting-value]')).toHaveText("2");
    await page.locator('button[data-option="n-2"]').click();
    await page.waitForTimeout(300);
    await expect(deviceMain(page)).toContainText("Party size: 2");
    await expect(board.locator('[data-setting="party-size"] [data-setting-value]')).toHaveText("2");
    await expect(page.locator("[data-presentation='banner']")).toHaveCount(0);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("W4 pick heroes uses Pick, a count, and help until N are seated", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "iPad check");
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w4-pick" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const page = await context.newPage();
  try {
    await toSettings(page, session.host.joinCode);
    await page.locator('button[data-option="n-2"]').click();
    await expect(deviceMain(page)).toContainText("Party size: 2");
    await throughTowerToClaim(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Party Join");
    await expect(page.locator("[data-pick-status]")).toHaveText("0 of 2 picked");
    await expect(page.locator("[data-pick-help]")).toHaveText(
      "Who this iPad speaks for at the table",
    );
    await expect(page.locator("[data-hero-panel] [data-pick-help]")).toHaveCount(0);
    await expect(page.locator('button[data-prompt-id="continue-claim-heroes"]')).toBeVisible();
    await expect(page.locator('button[data-prompt-id="continue-claim-heroes"]')).toBeDisabled();
    const ids = await page
      .locator("button[data-hunter]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-hunter")));
    expect(ids).toEqual([...HEROES]);
    for (const [index, heroId] of HEROES.entries()) {
      const button = page.locator(`button[data-hunter="${heroId}"]`);
      await expect(button).toHaveAttribute("data-action", "take");
      await expect(button).toHaveAccessibleName(`Pick ${NAMES[index]}`);
    }
    await expect(page.getByText(/hears this/)).toHaveCount(0);
    await noClaimWords(page);

    await page.locator('button[data-hunter="hero-a"]').click();
    await page.locator('button[data-hunter="hero-b"]').click();
    await expect(page.locator("[data-pick-status]")).toHaveText("2 of 2 picked");
    await expect(page.locator('button[data-prompt-id="continue-claim-heroes"]')).toBeEnabled();
    await expect(page.locator('button[data-hunter="hero-a"]')).toHaveAttribute(
      "data-claim",
      "yours",
    );
    await expect(page.locator('button[data-hunter="hero-b"]')).toHaveAttribute(
      "data-claim",
      "yours",
    );
    await expect(page.locator('button[data-hunter="hero-a"]')).toHaveAccessibleName("Pick Hero A");
    for (const heroId of ["hero-c", "hero-d", "hero-e", "hero-f"]) {
      const button = page.locator(`button[data-hunter="${heroId}"]`);
      await expect(button).toHaveAttribute("data-claim", "open");
      await expect(button).toBeDisabled();
    }
    await sendTake(page, "hero-c");
    await page.waitForTimeout(300);
    await expect(page.locator("[data-pick-status]")).toHaveText("2 of 2 picked");
    await expect(page.locator('button[data-hunter="hero-c"]')).toHaveAttribute(
      "data-claim",
      "open",
    );
    await expect(page.locator("[data-presentation='banner']")).toHaveCount(0);

    await page.locator('button[data-hunter="hero-a"]').click();
    await expect(page.locator("[data-pick-status]")).toHaveText("1 of 2 picked");
    await expect(page.locator('button[data-prompt-id="continue-claim-heroes"]')).toBeDisabled();
    await expect(page.locator('button[data-hunter="hero-c"]')).toBeEnabled();
    await expect(page.locator('button[data-hunter="hero-a"]')).toHaveAccessibleName("Pick Hero A");
    await expect(page.locator("[data-presentation='banner']")).toHaveCount(0);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("W4 another iPad sees a taken hero greyed out", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "iPad check");
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w4-grey" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const page = await context.newPage();
  const otherContext = await browser.newContext({ baseURL: session.baseURL });
  const other = await otherContext.newPage();
  try {
    await toSettings(page, session.host.joinCode);
    await throughTowerToClaim(page);
    await page.locator('button[data-hunter="hero-a"]').click();
    await expect(page.locator('button[data-hunter="hero-a"]')).toHaveAttribute(
      "data-claim",
      "yours",
    );
    await installSessionSocketHook(other);
    await other.goto(`/join?code=${session.host.joinCode}`);
    await expect(deviceMain(other)).toHaveAttribute("data-screen", "claim-heroes");
    const taken = other.locator('button[data-hunter="hero-a"]');
    await expect(taken).toBeVisible();
    await expect(taken).toBeDisabled();
    await expect(taken).toHaveAttribute("data-claim", "taken");
    await expect(taken).toHaveClass(/bt-claim-taken/);
    await expect(taken).toHaveAccessibleName("Pick Hero A");
    await expect(taken).not.toContainText("claimed");
    await expect(page.locator('button[data-hunter="hero-a"]')).toHaveAttribute(
      "data-claim",
      "yours",
    );
  } finally {
    await otherContext.close();
    await context.close();
    await session.host.close();
  }
});

test("W4 the story board party frame is display-only", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Story board check");
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w4-board" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const page = await context.newPage();
  const board = await context.newPage();
  try {
    await board.goto("/board");
    await toSettings(page, session.host.joinCode);
    await page.locator('button[data-option="n-2"]').click();
    await throughTowerToClaim(page);
    await expect(board.locator("main.bt-board")).toHaveAttribute("data-screen", "claim-heroes");
    await expect(board.locator("main :is(button, input, textarea, select, a)")).toHaveCount(0);
    await expect(board.locator("[data-next-prompt]")).toHaveText(
      /Waiting for an iPad to pick the party\./,
    );
    await expect(board.getByText("Who this iPad speaks for at the table")).toHaveCount(0);
    await page.locator('button[data-hunter="hero-a"]').click();
    await page.locator('button[data-hunter="hero-b"]').click();
    const frame = board.locator('[data-startup-panel="claim-heroes"]');
    await expect(frame.getByRole("heading", { level: 1 })).toHaveText("Party Join");
    await expect(frame.locator("[data-claim-count]")).toHaveText("2 of 2 picked");
    for (const heroId of HEROES) {
      await expect(frame.locator(`[data-hero="${heroId}"]`)).toHaveCount(1);
    }
    for (const heroId of ["hero-a", "hero-b"]) {
      const row = frame.locator(`[data-hero="${heroId}"]`);
      await expect(row).toHaveAttribute("data-held", "true");
      await expect(row.getByText("Picked", { exact: true })).toBeVisible();
    }
    for (const heroId of ["hero-c", "hero-d", "hero-e", "hero-f"]) {
      const row = frame.locator(`[data-hero="${heroId}"]`);
      await expect(row).toHaveAttribute("data-held", "false");
      await expect(row.getByText("Open", { exact: true })).toBeVisible();
    }
    await expect(frame.getByText("Claimed", { exact: true })).toHaveCount(0);
    await expect(frame.getByText("Unclaimed", { exact: true })).toHaveCount(0);
    await expect(frame.locator("[data-join-code]")).toBeVisible();
    await expect(board.locator("[data-next-prompt]")).toHaveText(
      /Waiting for an iPad to set up the board\./,
    );
    await expect(frame.locator("[data-suggested]")).toHaveCount(0);
    const boardText = await frame.innerText();
    expect(boardText).not.toMatch(/\bTake\b/);
    expect(boardText).not.toMatch(/\bClaim\b/);
    expect(boardText).not.toMatch(/\bHold\b/);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("W4 the default party sits one hero on each citadel", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w4-default" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const page = await context.newPage();
  const board = await context.newPage();
  try {
    await board.goto("/board");
    await toSettings(page, session.host.joinCode);
    await throughTowerToClaim(page);
    await expect(page.locator("[data-pick-status]")).toHaveText("0 of 4 picked");
    await expect(page.locator('button[data-prompt-id="continue-claim-heroes"]')).toBeDisabled();
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      await page.locator(`button[data-hunter="${heroId}"]`).click();
    }
    await expect(page.locator("[data-pick-status]")).toHaveText("4 of 4 picked");
    await expect(page.locator('button[data-hunter="hero-e"]')).toBeDisabled();
    await expect(page.locator('button[data-hunter="hero-f"]')).toBeDisabled();
    await clickAct(page, "continue", "continue-claim-heroes");
    await finishSetup(page);
    await expect(page.locator("[data-alone='true']")).toHaveCount(4);
    await expect(page.locator('[data-hero-place="hero-a"]')).toHaveAttribute(
      "data-kingdom",
      "Arisilon (N)",
    );
    await expect(page.locator('[data-hero-place="hero-b"]')).toHaveAttribute(
      "data-kingdom",
      "Brynthia (E)",
    );
    await expect(page.locator('[data-hero-place="hero-c"]')).toHaveAttribute(
      "data-kingdom",
      "Durnin (S)",
    );
    await expect(page.locator('[data-hero-place="hero-d"]')).toHaveAttribute(
      "data-kingdom",
      "Zenon (W)",
    );
    await expect(page.locator('[data-hero-place="hero-e"]')).toHaveCount(0);
    await expect(page.locator('[data-hero-place="hero-f"]')).toHaveCount(0);
    await expect(board.locator("main :is(button, input, textarea, select, a)")).toHaveCount(0);
    await expect(board.locator("[data-hero-place], [data-kingdom], [data-roster]")).toHaveCount(0);
    await expect(page.locator('button[data-action-id="split"]')).toHaveCount(0);
    await expect(page.locator('button[data-action-id="join"]')).toHaveCount(0);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("W4 N=2 seats hero-a on Arisilon and hero-e on Brynthia", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w4-two" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const page = await context.newPage();
  const board = await context.newPage();
  try {
    await board.goto("/board");
    await toSettings(page, session.host.joinCode);
    await page.locator('button[data-option="n-2"]').click();
    await expect(deviceMain(page)).toContainText("Party size: 2");
    await throughTowerToClaim(page);
    await page.locator('button[data-hunter="hero-e"]').click();
    await page.locator('button[data-hunter="hero-a"]').click();
    await expect(page.locator("[data-pick-status]")).toHaveText("2 of 2 picked");
    await clickAct(page, "continue", "continue-claim-heroes");
    await finishSetup(page);
    await expect(page.locator("[data-alone='true']")).toHaveCount(2);
    await expect(page.locator('[data-hero-place="hero-a"]')).toHaveAttribute(
      "data-kingdom",
      "Arisilon (N)",
    );
    await expect(page.locator('[data-hero-place="hero-e"]')).toHaveAttribute(
      "data-kingdom",
      "Brynthia (E)",
    );
    for (const heroId of ["hero-b", "hero-c", "hero-d", "hero-f"]) {
      await expect(page.locator(`[data-hero-place="${heroId}"]`)).toHaveCount(0);
    }
    await expect(board.locator("main :is(button, input, textarea, select, a)")).toHaveCount(0);
    await expect(board.locator("[data-hero-place], [data-kingdom], [data-roster]")).toHaveCount(0);
    await expect(page.locator('button[data-action-id="split"]')).toHaveCount(0);
    await expect(page.locator('button[data-action-id="join"]')).toHaveCount(0);
  } finally {
    await context.close();
    await session.host.close();
  }
});

test("W4 a restart keeps the party and backing out clears the setting", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "iPad check");
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w4-restart" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const page = await context.newPage();
  let token = "";
  try {
    await toSettings(page, session.host.joinCode);
    await throughTowerToClaim(page);
    await page.locator('button[data-hunter="hero-a"]').click();
    await expect(page.locator("[data-pick-status]")).toHaveText("1 of 4 picked");
    token = (await page.evaluate((key) => sessionStorage.getItem(key), DEVICE_TOKEN_KEY)) ?? "";
    expect(token).not.toBe("");
  } finally {
    await context.close();
    await session.host.close();
  }

  const restarted = await startAcceptanceHost(testInfo, {
    databasePath: session.databasePath,
    seed: "w4-restart",
  });
  const context2 = await browser.newContext({ baseURL: restarted.baseURL });
  const again = await context2.newPage();
  try {
    await installSessionSocketHook(again);
    await again.goto("/join");
    await again.getByLabel("Rejoin token").fill(token);
    await again.getByRole("button", { name: "Rejoin" }).click();
    await expect(again).toHaveURL(/\/device/);
    await expect(deviceMain(again)).toHaveAttribute("data-screen", "claim-heroes");
    await expect(again.getByRole("heading", { level: 1, name: "Pick a story" })).toHaveCount(0);
    await expect(again.locator("[data-pick-status]")).toHaveText("1 of 4 picked");
    await expect(again.locator('button[data-hunter="hero-a"]')).toHaveAttribute(
      "data-claim",
      "yours",
    );
    await expect(again.locator('button[data-prompt-id="continue-claim-heroes"]')).toBeDisabled();
    expect(restarted.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);

    await backToGameSettings(again);
    await expect(deviceMain(again)).toContainText("Party size: 4");
    await again.locator('button[data-option="n-2"]').click();
    await expect(deviceMain(again)).toContainText("Party size: 2");
    await throughTowerToClaim(again);
    await expect(again.locator("[data-pick-status]")).toHaveText("1 of 2 picked");
    await expect(again.locator('button[data-hunter="hero-a"]')).toHaveAttribute(
      "data-claim",
      "yours",
    );
    await expect(again.locator('button[data-prompt-id="continue-claim-heroes"]')).toBeDisabled();

    await backToGameSettings(again);
    await clickAct(again, "back", "back-game-settings");
    await expect(deviceMain(again)).toHaveAttribute("data-screen", "pick-story");
    // The rejoined iPad is a new browser session, so it unlocks its own sound first.
    await setSoundAndKeep(again);
    await clickAct(again, "continue", "continue-pick-story-test");
    await expect(deviceMain(again)).toHaveAttribute("data-screen", "game-settings");
    await expect(again.locator('button[data-option="n-4"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(deviceMain(again)).toContainText("Party size: 4");
  } finally {
    await context2.close();
    await restarted.host.close();
  }
});

test("W4 claim-heroes has no private line and Begin still does", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "iPad check");
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w4-private" });
  const contextA = await browser.newContext({ baseURL: session.baseURL });
  const contextB = await browser.newContext({ baseURL: session.baseURL });
  const boardContext = await browser.newContext({ baseURL: session.baseURL });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const board = await boardContext.newPage();
  const framesA = captureFrames(pageA);
  const framesB = captureFrames(pageB);
  const boardFrames = captureFrames(board);
  try {
    await board.goto("/board");
    await toSettings(pageA, session.host.joinCode);
    await throughTowerToClaim(pageA);
    await installSessionSocketHook(pageB);
    await pageB.goto(`/join?code=${session.host.joinCode}`);
    await expect(deviceMain(pageB)).toHaveAttribute("data-screen", "claim-heroes");
    await holdHeroesFromTest(pageA, ["hero-a"]);
    await expect(pageA.getByText(/hears this/)).toHaveCount(0);
    await expect(pageB.getByText(/hears this/)).toHaveCount(0);
    await expect(board.getByText(/hears this/)).toHaveCount(0);
    for (const frame of [...framesA, ...framesB, ...boardFrames]) {
      expect(frame).not.toContain("hears this");
      expect(frame).not.toContain(".private.");
    }
    await holdHeroesFromTest(pageA, ["hero-b", "hero-c", "hero-d"]);
    await clickAct(pageA, "continue", "continue-claim-heroes");
    await expect(deviceMain(pageA)).toHaveAttribute("data-screen", /^(setup|begin)$/);
    await expect(pageA.getByText("Only Hero A hears this.")).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
    await boardContext.close();
    await session.host.close();
  }
});

test("W4 Dracula stays not-playable and has no party size", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "iPad check");
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w4-dracula" });
  const context = await browser.newContext({ baseURL: session.baseURL });
  const page = await context.newPage();
  try {
    await installSessionSocketHook(page);
    await page.goto(`/join?code=${session.host.joinCode}`);
    await enterWithoutTower(page);
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-story");
    await page.evaluate(() => {
      const socket = (window as unknown as { __btSessionSocket?: WebSocket }).__btSessionSocket;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error("Session socket is not open.");
      }
      socket.send(
        JSON.stringify({
          v: 2,
          type: "act",
          payload: { promptId: "focus-story", actionId: "focus", args: { storyId: "dracula" } },
        }),
      );
    });
    await expect(
      page.locator('button[data-prompt-id="continue-pick-story-dracula"]'),
    ).toBeEnabled();
    await clickAct(page, "continue", "continue-pick-story-dracula");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "not-playable");
    await expect(page.locator("[data-setting]")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not playable yet");
    await clickAct(page, "back", "back-not-playable");
    await expect(deviceMain(page)).toHaveAttribute("data-screen", "pick-story");
  } finally {
    await context.close();
    await session.host.close();
  }
});
