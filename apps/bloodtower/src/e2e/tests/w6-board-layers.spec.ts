import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Browser, expect, type Page, type TestInfo, test } from "@playwright/test";
import { openDatabase } from "../../server/db/client.ts";
import { createEventStore } from "../../server/events/store.ts";
import {
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

const STORY_ID = "test";
const HERO_IDS = ["hero-a", "hero-b", "hero-c", "hero-d"] as const;
const HERO_NAMES = ["Hero A", "Hero B", "Hero C", "Hero D"] as const;
const PLACE_TYPES = ["village", "bazaar", "citadel", "sanctuary"] as const;
const KINGDOMS = ["Arisilon", "Brynthia", "Durnin", "Zenon"] as const;
const CITADELS = [
  "Radiant Mountains",
  "Inner Kinghills",
  "Howling Desert",
  "Hissing Groves",
] as const;

const CAPTION: Record<(typeof PLACE_TYPES)[number], string> = {
  village: "Quiet roofs. A well, a few doors. Nothing stirs.",
  bazaar: "Stalls stand empty. The cloth still smells of spice.",
  citadel: "Stone walls, a closed gate. The kingdom\u2019s mark above the door.",
  sanctuary: "A low stone sanctuary. The door is shut, but the threshold is dry.",
};

type Space = { id: string; name: string; building?: string; adjacent: string[] };

const spaces = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../../../../packs/base/board/spaces.json"), "utf8"),
) as { spaces: Space[] };

const spaceById = new Map(spaces.spaces.map((space) => [space.id, space]));

const BOARD_VIEW = { width: 1920, height: 1080 };

const projectViewport = (testInfo: TestInfo) => {
  const viewport = testInfo.project.use.viewport;
  if (viewport && typeof viewport === "object" && "width" in viewport && "height" in viewport) {
    return { width: viewport.width, height: viewport.height };
  }
  return { width: 1280, height: 720 };
};

const deviceMain = (page: Page) => page.locator("main.bt-device");

const clickAct = async (page: Page, actionId: string, promptId?: string) => {
  const button = promptId
    ? page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`)
    : page.locator(`button[data-action-id="${actionId}"]`).first();
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

const OPENING_IDS = ["grey-stair.01", "grey-stair.02", "grey-stair.03", "grey-stair.04"] as const;

/** W5 grey-stair moments sit on the play screen before the move band. */
const passOpening = async (device: Page, board: Page) => {
  for (const id of OPENING_IDS) {
    const promptId = `continue-opening-${id.replace(".", "-")}`;
    await expect(board.locator("main")).toHaveAttribute("data-moment", id);
    await expect(board.locator("main")).toHaveAttribute("data-board-layer", "move");
    await expect(board.locator("[data-band]")).toHaveCount(0);
    await clickAct(device, "continue", promptId);
  }
  await expect(board.locator("main")).not.toHaveAttribute("data-moment", /.+/);
};

const readStatus = async (page: Page) => {
  const line = deviceMain(page).locator("p").first();
  return {
    day: await line.getAttribute("data-day"),
    moves: await line.getAttribute("data-moves"),
    space: await line.getAttribute("data-space"),
    inside: await line.getAttribute("data-inside"),
    building: await line.getAttribute("data-building"),
    hero: await line.getAttribute("data-acting-hero"),
    spaceName: await line.getAttribute("data-space-name"),
  };
};

const offerIds = async (page: Page) =>
  page.locator("main button[data-prompt-id]").evaluateAll((nodes) =>
    nodes
      .map((node) => node.getAttribute("data-prompt-id"))
      .filter((id): id is string => id != null)
      .sort()
      .join("|"),
  );

const marker = async (page: Page) => {
  const now = await readStatus(page);
  return `${now.hero}|${now.space}|${now.inside}|${now.moves}|${now.day}|${await offerIds(page)}`;
};

const settle = async (page: Page, before: string) => {
  await expect.poll(async () => marker(page), { timeout: 15_000 }).not.toBe(before);
};

const nearestMissing = (start: string, seen: Set<string>): string[] | null => {
  const queue: string[][] = [[start]];
  const visited = new Set([start]);
  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) break;
    const here = path.at(-1);
    const space = here ? spaceById.get(here) : undefined;
    if (!space) continue;
    if (path.length > 1 && space.building && !seen.has(space.building)) return path;
    for (const next of space.adjacent) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push([...path, next]);
    }
  }
  return null;
};

const checkpointSeed = (databasePath: string): string => {
  const opened = openDatabase(databasePath);
  try {
    const store = createEventStore(opened.db);
    const autosave = store.getAutosave();
    if (!autosave) throw new Error("No autosave.");
    const checkpoint = store.lastCheckpoint(autosave.gameId);
    if (!checkpoint) throw new Error("No checkpoint.");
    return checkpoint.seed;
  } finally {
    opened.close();
  }
};

/** Holds server frames on the board socket so the opening splash can be read before join. */
const holdBoardServerFrames = async (board: Page) => {
  let pass = false;
  const queued: Array<{ send: (message: string | Buffer) => void; message: string | Buffer }> = [];
  await board.routeWebSocket(/\/ws$/, (socket) => {
    const server = socket.connectToServer();
    server.onMessage((message) => {
      if (pass) socket.send(message);
      else queued.push({ send: (frame) => socket.send(frame), message });
    });
    socket.onMessage((message) => server.send(message));
  });
  return () => {
    pass = true;
    for (const frame of queued) frame.send(frame.message);
  };
};

const assertDisplayOnly = async (board: Page) => {
  await expect(board.locator("main :is(button, input, textarea, select, a)")).toHaveCount(0);
  await expect(board.locator("[data-waiting-dialog]")).toHaveCount(0);
  await expect(board.locator("[data-visual-layer]")).toHaveCount(0);
  await expect(board.locator("canvas")).toHaveCount(0);
};

const assertNoMapImage = async (board: Page) => {
  const images = await board
    .locator("main img")
    .evaluateAll((nodes) => nodes.map((node) => (node as HTMLImageElement).src));
  for (const src of images) expect(src.toLowerCase()).not.toMatch(/map/);
  const washes = await board.evaluate(() =>
    [...document.querySelectorAll("main, main *")]
      .map((node) => getComputedStyle(node).backgroundImage)
      .filter((image) => /map/i.test(image)),
  );
  expect(washes).toEqual([]);
};

const assertFits = async (board: Page) => {
  const report = await board.evaluate(() => {
    const scrolling = document.scrollingElement;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const root = document.querySelector("main");
    const clipped: string[] = [];
    const outside: string[] = [];
    if (root) {
      const nodes = [root, ...root.querySelectorAll("*")];
      for (const node of nodes) {
        const el = node as HTMLElement;
        if (el.scrollHeight > el.clientHeight + 1) {
          const data = [...el.attributes]
            .filter((attr) => attr.name.startsWith("data-"))
            .slice(0, 2)
            .map((attr) => `${attr.name}=${attr.value}`)
            .join(" ");
          const parent = el.parentElement?.className ? String(el.parentElement.className) : "";
          clipped.push(
            `${el.tagName}.${String(el.className)} ${data} parent=${parent} ${el.scrollHeight}>${el.clientHeight}`,
          );
        }
        const ownText = [...el.childNodes].some(
          (child) =>
            child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").trim().length > 0,
        );
        if (!ownText) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 1 && rect.height < 1) continue;
        if (rect.top < -1 || rect.left < -1 || rect.bottom > vh + 1 || rect.right > vw + 1) {
          outside.push(
            `${el.tagName}.${String(el.className)} ${Math.round(rect.left)},${Math.round(rect.top)}`,
          );
        }
      }
    }
    return {
      scrollTop: scrolling?.scrollTop ?? 0,
      scrollWidth: scrolling?.scrollWidth ?? 0,
      scrollHeight: scrolling?.scrollHeight ?? 0,
      vw,
      vh,
      clipped: clipped.slice(0, 8),
      outside: outside.slice(0, 8),
    };
  });
  expect(report.scrollTop, "document scroll").toBe(0);
  expect(report.scrollWidth, "scroll width").toBeLessThanOrEqual(report.vw + 1);
  expect(report.scrollHeight, "scroll height").toBeLessThanOrEqual(report.vh + 1);
  expect(report.clipped, report.clipped.join("\n")).toEqual([]);
  expect(report.outside, report.outside.join("\n")).toEqual([]);
};

const assertBoxInside = async (
  board: Page,
  locator: ReturnType<Page["locator"]>,
  frame?: ReturnType<Page["locator"]>,
) => {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  const size = board.viewportSize() ?? BOARD_VIEW;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
  if (!frame) return;
  const parent = await frame.boundingBox();
  expect(parent).toBeTruthy();
  if (!parent) return;
  expect(box.x).toBeGreaterThanOrEqual(parent.x - 1);
  expect(box.y).toBeGreaterThanOrEqual(parent.y - 1);
  expect(box.x + box.width).toBeLessThanOrEqual(parent.x + parent.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(parent.y + parent.height + 1);
};

const assertStartupChrome = async (board: Page) => {
  const main = board.locator("main");
  await expect(main).toHaveAttribute("data-board-mode", "startup");
  await expect(main).toHaveAttribute("data-board-layer", "startup");
  await expect(board.locator('[data-illusionist-asset="dialog-frame"]')).toHaveCount(1);
  const backdrop = await board.locator(".bt-board-backdrop").evaluate((node) => {
    return getComputedStyle(node).backgroundImage;
  });
  expect(backdrop).toContain("/landing/hero.webp");
  await assertBoxInside(board, board.locator('[data-illusionist-asset="dialog-frame"]'));
  await expect(board.locator("[data-band]")).toHaveCount(0);
  await expect(board.locator("[data-place]")).toHaveCount(0);
  await expect(board.locator("[data-still]")).toHaveCount(0);
  await expect(board.locator("[data-roster]")).toHaveCount(0);
  await expect(board.locator("[data-hero-place]")).toHaveCount(0);
  await assertDisplayOnly(board);
  await assertNoMapImage(board);
  await assertFits(board);
};

const assertPlaceFrame = async (
  board: Page,
  device: Page,
  building: (typeof PLACE_TYPES)[number],
) => {
  await expect(board.locator("main")).toHaveAttribute("data-board-layer", "place");
  await expect(board.locator("[data-band]")).toHaveCount(0);
  await expect(board.locator("[data-waiting]")).toHaveCount(0);
  await expect(board.locator("[data-place]")).toHaveCount(1);
  await expect(board.locator("[data-still]")).toHaveAttribute("data-still", `place.${building}`);
  await expect(board.locator("[data-place] figcaption")).toHaveText(CAPTION[building]);
  const src = await board.locator("[data-place] img").getAttribute("src");
  expect(src).toBeTruthy();
  expect((await board.request.get(src ?? "")).status()).toBe(200);
  const figure = await board.locator("[data-place]").boundingBox();
  const size = board.viewportSize() ?? BOARD_VIEW;
  expect(figure).toBeTruthy();
  if (figure) {
    expect(figure.width).toBeGreaterThanOrEqual(size.width * 0.7 - 1);
    expect(figure.x).toBeGreaterThanOrEqual(-1);
    expect(figure.y).toBeGreaterThanOrEqual(-1);
    expect(figure.x + figure.width).toBeLessThanOrEqual(size.width + 1);
    expect(figure.y + figure.height).toBeLessThanOrEqual(size.height + 1);
  }
  await assertBoxInside(board, board.locator("[data-place] figcaption"));
  const paintingBehind = await board.locator("[data-place] img").evaluate((img) => {
    const rect = img.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === img || Boolean(img.contains(hit));
  });
  expect(paintingBehind).toBe(true);
  await expect(device.locator("main img")).toHaveCount(0);
  await expect(device.locator("[data-place]")).toHaveCount(0);
  await expect(device.locator("[data-still]")).toHaveCount(0);
  await expect(device.locator('[data-illusionist-asset="dialog-frame"]')).toHaveCount(0);
  await expect(device.getByText(CAPTION[building])).toHaveCount(0);
  await expect(device.locator('main button[data-action-id="leave"]')).toBeVisible();
  await expect(device.locator('button[data-action-id="enter"]')).toHaveCount(0);
  await expect(device.locator('button[data-action-id="walk"]')).toHaveCount(0);
  await assertDisplayOnly(board);
  await assertFits(board);
};

const openPair = async (
  browser: Browser,
  testInfo: TestInfo,
  baseURL: string,
  reducedMotion?: "reduce",
) => {
  const boardContext = await browser.newContext({
    baseURL,
    viewport: BOARD_VIEW,
    reducedMotion,
  });
  const deviceContext = await browser.newContext({
    baseURL,
    viewport: projectViewport(testInfo),
    hasTouch: Boolean(testInfo.project.use.hasTouch),
  });
  const board = await boardContext.newPage();
  const device = await deviceContext.newPage();
  return { boardContext, deviceContext, board, device };
};

test("W6 weekend frames fit the Story board and the place still stays off the iPad", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w6-frames" });
  const { boardContext, deviceContext, board, device } = await openPair(
    browser,
    testInfo,
    session.baseURL,
  );
  const releaseBoard = await holdBoardServerFrames(board);
  try {
    await board.goto("/board");
    await expect(board.locator("main")).toHaveAttribute("data-screen", "splash");
    await expect(board.locator('[data-startup-panel="splash"]')).toHaveCount(1);
    await expect(board.locator("h1")).toHaveText("Blood Tower");
    await expect(board.locator('[data-startup-panel="splash"]')).toContainText("hall is opening");
    await expect(board.locator("[data-join-code]")).toHaveCount(0);
    await expect(board.locator("[data-story-focus]")).toHaveCount(0);
    await expect(board.locator('[data-startup-panel="claim-heroes"]')).toHaveCount(0);
    await expect(board.locator("[data-setup-progress]")).toHaveCount(0);
    await assertStartupChrome(board);

    releaseBoard();
    await expect(board.locator("[data-join-code]")).toHaveAttribute("data-join-code", /^\d{6}$/);
    await expect(board.locator('[data-startup-panel="splash"]')).toHaveCount(1);
    await expect(board.locator("main")).toHaveAttribute("data-screen", "splash");
    const dialog = board.locator('[data-illusionist-asset="dialog-frame"]');
    await assertBoxInside(board, board.locator("[data-join-code] svg"), dialog);
    await expect(board.locator("[data-story-focus]")).toHaveCount(0);
    await expect(board.locator("[data-setup-progress]")).toHaveCount(0);
    const splashQr = await board.locator("[data-join-code] .bt-qr").boundingBox();
    expect(splashQr).toBeTruthy();
    await assertStartupChrome(board);

    await installSessionSocketHook(device);
    await device.goto(`/join?code=${session.host.joinCode}`);
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "splash");
    await clickAct(device, "continue", "splash-play");
    await expect(board.locator("main")).toHaveAttribute("data-screen", "pick-story");
    await expect(board.locator('[data-startup-panel="pick-story"]')).toHaveCount(1);
    await expect(board.locator('[data-story-focus="test"]')).toBeVisible();
    await expect(board.locator("[data-story-focus] h2")).toHaveText("Proving Grounds");
    await expect(board.locator(".bt-door-motif")).toHaveCount(0);
    const focusCover = board.locator("[data-story-focus] img");
    if ((await focusCover.count()) === 1) await assertBoxInside(board, focusCover, dialog);
    await assertBoxInside(board, board.locator("[data-story-focus]"), dialog);
    await assertBoxInside(board, board.locator("[data-story-focus] h2"), dialog);
    await assertBoxInside(board, board.locator("[data-story-focus] .bt-carousel-plate"), dialog);
    const peeks = board.locator("[data-carousel-side]");
    expect(await peeks.count()).toBeLessThanOrEqual(1);
    if ((await peeks.count()) === 1) await assertBoxInside(board, peeks, dialog);
    await assertStartupChrome(board);

    await clickAct(device, "continue", `continue-pick-story-${STORY_ID}`);
    await clickAct(device, "continue", "continue-game-settings");
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "tower-connect");
    await device.locator('button[data-action="play-without-tower"]').click();
    await expect(deviceMain(device)).toHaveAttribute("data-screen", "claim-heroes");
    await holdHeroesFromTest(device, ["hero-a"]);
    await expect(board.locator('[data-startup-panel="claim-heroes"]')).toHaveCount(1);
    await expect(board.locator("[data-join-code]")).toBeVisible();
    const partyQr = await board.locator("[data-join-code] .bt-qr").boundingBox();
    if (!splashQr || !partyQr) throw new Error("join QR missing");
    expect(partyQr.height).toBeGreaterThan(splashQr.height);
    const claimText = await board.locator('[data-startup-panel="claim-heroes"]').innerText();
    for (const name of HERO_NAMES) expect(claimText.split(name).length - 1).toBe(1);
    for (const name of [...KINGDOMS, ...CITADELS]) expect(claimText).not.toContain(name);
    await assertStartupChrome(board);

    await holdHeroesFromTest(device, [...HERO_IDS]);
    await clickAct(device, "continue", "continue-claim-heroes");
    await expect(board.locator("main")).toHaveAttribute("data-screen", "setup");
    await expect(board.locator('[data-startup-panel="setup"]')).toHaveCount(1);
    await expect(board.locator("[data-setup-progress]")).toHaveCount(1);
    await expect(board.locator("[data-setup-instruction]")).toHaveCount(1);
    const firstStep = await board.locator("[data-setup-instruction]").innerText();
    expect(firstStep.length).toBeGreaterThan(0);
    await expect(board.locator("[data-portrait-card]")).toHaveCount(0);
    await expect(board.locator("canvas")).toHaveCount(0);
    await assertStartupChrome(board);
    await clickAct(device, "continue");
    await expect(board.locator("[data-setup-instruction]")).not.toHaveText(firstStep);
    await expect(board.locator("main")).not.toContainText(firstStep);
    await expect(board.locator("[data-setup-instruction]")).toHaveCount(1);
    await expect(board.locator('[data-startup-panel="setup"]')).toHaveCount(1);
    await assertStartupChrome(board);

    const setupDeadline = Date.now() + 30_000;
    while ((await deviceMain(device).getAttribute("data-screen")) === "setup") {
      if (Date.now() > setupDeadline) throw new Error("Setup did not reach begin.");
      const step = device.locator(
        'button[data-prompt-id^="continue-setup-"][data-action-id="continue"]',
      );
      await expect(step).toBeEnabled({ timeout: 20_000 });
      const promptId = await step.getAttribute("data-prompt-id");
      await step.click();
      if (promptId) {
        await expect(device.locator(`button[data-prompt-id="${promptId}"]`)).toHaveCount(0);
      }
    }
    await expect(board.locator("main")).toHaveAttribute("data-screen", "begin");
    await expect(board.locator("main")).toHaveAttribute("data-board-layer", "startup");
    await expect(board.locator("[data-band]")).toHaveCount(0);
    await expect(board.locator("[data-place]")).toHaveCount(0);
    await expect(board.locator("[data-still]")).toHaveCount(0);
    await assertStartupChrome(board);
    await clickAct(device, "continue", "continue-begin");
    await passOpening(device, board);

    await expect(board.locator("main")).toHaveAttribute("data-screen", "play");
    await expect(board.locator("main")).toHaveAttribute("data-board-mode", "play");
    await expect(board.locator("main")).toHaveAttribute("data-board-layer", "move");
    const moveBackdrop = await board.locator(".bt-board-backdrop").evaluate((node) => {
      return getComputedStyle(node).backgroundImage;
    });
    expect(moveBackdrop).toContain("/landing/hero.webp");
    const bandBox = await board.locator("[data-band]").boundingBox();
    expect(bandBox).toBeTruthy();
    if (bandBox) {
      expect(bandBox.y).toBeLessThanOrEqual(8);
      expect(bandBox.height).toBeLessThanOrEqual(72);
    }
    const bandOrder = await board.locator("[data-band]").evaluate((node) =>
      [...node.children].map((child) => {
        if (child.hasAttribute("data-health")) return "health";
        if (child.hasAttribute("data-purse")) return "purse";
        if (child.hasAttribute("data-chapter")) return "chapter";
        if (child.hasAttribute("data-day")) return "day";
        if (child.hasAttribute("data-acting")) return "acting";
        if (child.hasAttribute("data-moves")) return "moves";
        return child.tagName;
      }),
    );
    expect(bandOrder.filter((item) => item === "health")).toHaveLength(HERO_IDS.length);
    expect(bandOrder).toEqual([
      ...HERO_IDS.map(() => "health"),
      "purse",
      "chapter",
      "day",
      "acting",
      "moves",
    ]);
    const marks = board.locator("[data-band] :is([data-health], [data-purse], [data-moves])");
    for (const text of await marks.allTextContents()) {
      expect(text).toMatch(/unavailable/);
      expect(text).not.toMatch(/\b0\b/);
    }
    await expect(board.locator("[data-chapter]")).toHaveText("Proving Grounds");
    await expect(board.locator("[data-day]")).toHaveText(/^Day \d+$/);
    const acting = await board.locator("[data-acting]").innerText();
    await expect(board.locator("[data-waiting]")).toHaveCount(1);
    await expect(board.locator("[data-waiting]")).toHaveText(/is choosing/);
    await expect(board.locator("[data-waiting]")).toContainText(acting);
    const waitingBox = await board.locator("[data-waiting]").boundingBox();
    const size = board.viewportSize() ?? BOARD_VIEW;
    expect(waitingBox).toBeTruthy();
    if (waitingBox) {
      const cx = waitingBox.x + waitingBox.width / 2;
      const cy = waitingBox.y + waitingBox.height / 2;
      expect(cx).toBeGreaterThan(size.width / 3);
      expect(cx).toBeLessThan((size.width * 2) / 3);
      expect(cy).toBeGreaterThan(size.height / 3);
      expect(cy).toBeLessThan((size.height * 2) / 3);
    }
    const pulse = await board.locator("[data-waiting]").evaluate((node) => {
      const style = getComputedStyle(node);
      return { name: style.animationName, duration: style.animationDuration };
    });
    expect(pulse.name).toBe("bt-waiting-pulse");
    expect(Number.parseFloat(pulse.duration)).toBeGreaterThanOrEqual(1);
    await expect(board.locator("[data-place]")).toHaveCount(0);
    await expect(board.locator("[data-still]")).toHaveCount(0);
    await expect(
      board.locator("[data-roster], [data-hero-place], [data-kingdom], [data-space-name]"),
    ).toHaveCount(0);
    const moveText = await board.locator("main").innerText();
    for (const name of [...KINGDOMS, ...CITADELS]) expect(moveText).not.toContain(name);
    await expect(board.locator("main img")).toHaveCount(0);
    await expect(device.locator("[data-roster]")).toContainText("Arisilon (N)");
    await expect(device.locator("[data-roster]")).toContainText("Radiant Mountains");
    await expect(board.locator("[data-band]")).not.toContainText(/modifier/i);
    await assertDisplayOnly(board);
    await assertNoMapImage(board);
    await assertFits(board);

    const roll = device.locator('button[data-prompt-id*="roll-done"]');
    await expect(roll).toBeVisible();
    await roll.click();
    await expect(roll).toHaveCount(0);
    await expect(board.locator("main")).toHaveAttribute("data-board-layer", "move");
    await expect(board.locator("[data-band]")).toBeVisible();
    if ((await board.locator("[data-waiting]").count()) === 1) {
      await expect(board.locator("[data-waiting]")).toHaveText(/is choosing/);
      await expect(
        device.locator('button[data-action-id="walk"], button[data-action-id="end-turn"]').first(),
      ).toBeVisible();
    }

    const seen = new Set<string>();
    const tourHero = (await readStatus(device)).hero;
    expect(tourHero).toBeTruthy();
    let steps = 0;
    while (seen.size < PLACE_TYPES.length && steps < 90) {
      steps += 1;
      const now = await readStatus(device);
      const before = await marker(device);
      const rollButton = device.locator('button[data-prompt-id*="roll-done"]');
      if ((await rollButton.count()) > 0) {
        await rollButton.click();
        await settle(device, before);
        continue;
      }
      const skull = device.locator('button[data-prompt-id*="skull-drop"]');
      if ((await skull.count()) > 0) {
        await skull.click();
        await settle(device, before);
        continue;
      }
      const record = device.locator('button[data-action-id="record"]');
      if ((await record.count()) > 0) {
        const inside = device.locator('button[data-prompt-id$="--inside"]');
        if ((await inside.count()) > 0) await inside.click();
        else await record.first().click();
        await settle(device, before);
        continue;
      }
      if (now.hero && now.hero !== tourHero) {
        await clickAct(device, "end-turn");
        await settle(device, before);
        continue;
      }
      if (now.inside === "true" && now.building && now.building in CAPTION) {
        const building = now.building as (typeof PLACE_TYPES)[number];
        const moves = now.moves;
        await assertPlaceFrame(board, device, building);
        await clickAct(device, "leave");
        await settle(device, before);
        const after = await readStatus(device);
        expect(after.moves).toBe(moves);
        await expect(board.locator("main")).toHaveAttribute("data-board-layer", "move");
        await expect(board.locator("[data-still]")).toHaveCount(0);
        await expect(board.locator("[data-band]")).toBeVisible();
        seen.add(building);
        continue;
      }
      if (now.building && !seen.has(now.building) && now.building in CAPTION) {
        await expect(board.locator("main")).toHaveAttribute("data-board-layer", "move");
        await expect(board.locator("[data-place]")).toHaveCount(0);
        await expect(device.locator('button[data-action-id="walk"]').first()).toBeVisible();
        const moves = now.moves;
        await clickAct(device, "enter");
        await settle(device, before);
        expect((await readStatus(device)).moves).toBe(moves);
        continue;
      }
      if (!now.moves || Number(now.moves) < 1) {
        const end = device.locator('button[data-action-id="end-turn"]');
        if ((await end.count()) > 0) {
          await end.click();
          await settle(device, before);
        } else await device.waitForTimeout(50);
        continue;
      }
      const path = now.space ? nearestMissing(now.space, seen) : null;
      const nextId = path?.[1];
      const here = now.space ? spaceById.get(now.space) : undefined;
      if (!nextId || !here?.adjacent.includes(nextId)) {
        await clickAct(device, "end-turn");
        await settle(device, before);
        continue;
      }
      const next = spaceById.get(nextId);
      const walk = device.locator(`button[data-prompt-id="walk--${tourHero}--${nextId}"]`);
      await expect(walk).toContainText(next?.name ?? nextId);
      await walk.click();
      await settle(device, before);
    }
    expect([...seen].sort()).toEqual([...PLACE_TYPES].sort());
    expect(session.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
  } finally {
    await boardContext.close();
    await deviceContext.close();
    await session.host.close();
  }
});

test("W6 waiting line honours reduced motion", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w6-motion" });
  const { boardContext, deviceContext, board, device } = await openPair(
    browser,
    testInfo,
    session.baseURL,
    "reduce",
  );
  try {
    await board.goto("/board");
    await installSessionSocketHook(device);
    await device.goto(`/join?code=${session.host.joinCode}`);
    await clickAct(device, "continue", "splash-play");
    await clickAct(device, "continue", `continue-pick-story-${STORY_ID}`);
    await clickAct(device, "continue", "continue-game-settings");
    await device.locator('button[data-action="play-without-tower"]').click();
    await holdHeroesFromTest(device, [...HERO_IDS]);
    await clickAct(device, "continue", "continue-claim-heroes");
    const deadline = Date.now() + 30_000;
    while ((await deviceMain(device).getAttribute("data-screen")) !== "play") {
      if (Date.now() > deadline) throw new Error("Did not reach play.");
      const screen = await deviceMain(device).getAttribute("data-screen");
      if (screen === "tower-connect") {
        await device.locator('button[data-action="play-without-tower"]').click();
      } else if (screen === "setup" || screen === "begin") await clickAct(device, "continue");
      else await device.waitForTimeout(50);
    }
    await passOpening(device, board);
    await expect(board.locator("[data-waiting]")).toBeVisible();
    await expect(board.locator("[data-waiting]")).toHaveText(/is choosing/);
    const pulse = await board.locator("[data-waiting]").evaluate((node) => {
      return getComputedStyle(node).animationName;
    });
    expect(pulse).toBe("none");
  } finally {
    await boardContext.close();
    await deviceContext.close();
    await session.host.close();
  }
});

test("W6 continue keeps the place still, then the move layer after Leave", async ({
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const session = await startAcceptanceHost(testInfo, { seed: "w6-continue" });
  const { databasePath } = session;
  const first = await openPair(browser, testInfo, session.baseURL);
  let snapshot: Awaited<ReturnType<typeof readStatus>> | null = null;
  let still = "";
  try {
    await first.board.goto("/board");
    await installSessionSocketHook(first.device);
    await first.device.goto(`/join?code=${session.host.joinCode}`);
    await clickAct(first.device, "continue", "splash-play");
    await clickAct(first.device, "continue", `continue-pick-story-${STORY_ID}`);
    await clickAct(first.device, "continue", "continue-game-settings");
    await first.device.locator('button[data-action="play-without-tower"]').click();
    await holdHeroesFromTest(first.device, [...HERO_IDS]);
    await clickAct(first.device, "continue", "continue-claim-heroes");
    const deadline = Date.now() + 40_000;
    while ((await deviceMain(first.device).getAttribute("data-screen")) !== "play") {
      if (Date.now() > deadline) throw new Error("Did not reach play.");
      const screen = await deviceMain(first.device).getAttribute("data-screen");
      if (screen === "tower-connect") {
        await first.device.locator('button[data-action="play-without-tower"]').click();
      } else if (screen === "setup" || screen === "begin") await clickAct(first.device, "continue");
      else await first.device.waitForTimeout(50);
    }
    await passOpening(first.device, first.board);
    const roll = first.device.locator('button[data-prompt-id*="roll-done"]');
    if ((await roll.count()) > 0) await roll.click();
    await expect(first.device.locator('button[data-action-id="enter"]')).toBeVisible({
      timeout: 20_000,
    });
    const beforeEnter = await readStatus(first.device);
    await clickAct(first.device, "enter");
    await expect.poll(async () => (await readStatus(first.device)).inside).toBe("true");
    snapshot = await readStatus(first.device);
    expect(snapshot.moves).toBe(beforeEnter.moves);
    still = (await first.board.locator("[data-still]").getAttribute("data-still")) ?? "";
    expect(still).toBe(`place.${snapshot.building}`);
    expect(checkpointSeed(databasePath)).toBe("w6-continue");
    expect(session.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
  } finally {
    await first.boardContext.close();
    await first.deviceContext.close();
    await session.host.close();
  }

  const restarted = await startAcceptanceHost(testInfo, {
    databasePath,
    seed: "w6-continue",
  });
  const second = await openPair(browser, testInfo, restarted.baseURL);
  let outside: Awaited<ReturnType<typeof readStatus>> | null = null;
  try {
    await second.board.goto("/board");
    await installSessionSocketHook(second.device);
    await second.device.goto(`/join?code=${restarted.host.joinCode}`);
    await clickAct(second.device, "continue", "splash-play");
    await expect(deviceMain(second.device)).toHaveAttribute("data-screen", "pick-game");
    await clickAct(second.device, "continue", "continue-pick-game");
    await expect(deviceMain(second.device)).toHaveAttribute("data-screen", "play");
    await expect(second.board.locator("main")).toHaveAttribute("data-board-layer", "place");
    await expect(second.board.locator("[data-still]")).toHaveAttribute("data-still", still);
    await holdHeroesFromTest(second.device, [...HERO_IDS]);
    const restored = await readStatus(second.device);
    expect(restored.inside).toBe("true");
    expect(restored.moves).toBe(snapshot?.moves);
    expect(restored.day).toBe(snapshot?.day);
    expect(restored.building).toBe(snapshot?.building);
    for (const name of HERO_NAMES) {
      await expect(second.device.locator("[data-roster]")).toContainText(name);
    }
    expect(checkpointSeed(databasePath)).toBe("w6-continue");
    expect(restarted.tower.sent().filter((item) => item.type === "connect")).toHaveLength(0);
    await expect(deviceMain(second.device)).not.toHaveAttribute("data-screen", "pause");
    await clickAct(second.device, "leave");
    await expect.poll(async () => (await readStatus(second.device)).inside).toBe("false");
    await expect(second.board.locator("main")).toHaveAttribute("data-board-layer", "move");
    await expect(second.board.locator("[data-chapter]")).toHaveText("Proving Grounds");
    outside = await readStatus(second.device);
  } finally {
    await second.boardContext.close();
    await second.deviceContext.close();
    await restarted.host.close();
  }

  const again = await startAcceptanceHost(testInfo, { databasePath, seed: "w6-continue" });
  const third = await openPair(browser, testInfo, again.baseURL);
  try {
    await third.board.goto("/board");
    await installSessionSocketHook(third.device);
    await third.device.goto(`/join?code=${again.host.joinCode}`);
    await clickAct(third.device, "continue", "splash-play");
    await clickAct(third.device, "continue", "continue-pick-game");
    await expect(deviceMain(third.device)).toHaveAttribute("data-screen", "play");
    await holdHeroesFromTest(third.device, [...HERO_IDS]);
    await expect(third.board.locator("main")).toHaveAttribute("data-board-layer", "move");
    await expect(third.board.locator("[data-still]")).toHaveCount(0);
    await expect(third.board.locator("[data-band]")).toBeVisible();
    const restored = await readStatus(third.device);
    expect(restored.inside).toBe("false");
    expect(restored.space).toBe(outside?.space);
    await expect(third.device.locator("[data-roster]")).toContainText(outside?.spaceName ?? "");
  } finally {
    await third.boardContext.close();
    await third.deviceContext.close();
    await again.host.close();
  }
});
