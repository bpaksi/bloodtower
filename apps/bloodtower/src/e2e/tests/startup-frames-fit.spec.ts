import { expect, type Locator, type Page, type TestInfo, test } from "@playwright/test";
import {
  enterWithoutTower,
  holdHeroesFromTest,
  installSessionSocketHook,
  startAcceptanceHost,
} from "./support/acceptance.ts";

// Brings back the Story board startup checks that left with the W6 weekend frames test (#410):
// the startup screens never scroll or clip (SCR-013), and the join QR shrinks to a corner after
// the first join and grows again on Claim heroes (DEC-274).

const STORY_ID = "test";
const BOARD_VIEW = { width: 1920, height: 1080 };
const DIALOG_FRAME = '[data-illusionist-asset="dialog-frame"]';

const projectViewport = (testInfo: TestInfo) => {
  const viewport = testInfo.project.use.viewport;
  if (viewport && typeof viewport === "object" && "width" in viewport && "height" in viewport) {
    return { width: viewport.width, height: viewport.height };
  }
  return { width: 1280, height: 720 };
};

const clickAct = async (page: Page, actionId: string, promptId: string) => {
  const button = page.locator(`button[data-prompt-id="${promptId}"][data-action-id="${actionId}"]`);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
};

/** Holds server frames on the board socket so the splash can be read before the join code arrives. */
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

/** SCR-013: no document scroll, nothing under `main` clipped, no own text outside the viewport. */
const assertFits = async (board: Page, screen: string) => {
  const report = await board.evaluate(() => {
    const scrolling = document.scrollingElement;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const root = document.querySelector("main");
    const clipped: string[] = [];
    const outside: string[] = [];
    if (root) {
      for (const node of [root, ...root.querySelectorAll("*")]) {
        const el = node as HTMLElement;
        const name = `${el.tagName}.${String(el.className)}`;
        if (el.scrollHeight > el.clientHeight + 1) {
          clipped.push(`${name} ${el.scrollHeight}>${el.clientHeight}`);
        }
        const ownText = [...el.childNodes].some(
          (child) =>
            child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").trim().length > 0,
        );
        if (!ownText) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 1 && rect.height < 1) continue;
        if (rect.top < -1 || rect.left < -1 || rect.bottom > vh + 1 || rect.right > vw + 1) {
          outside.push(`${name} ${Math.round(rect.left)},${Math.round(rect.top)}`);
        }
      }
    }
    return {
      hasMain: Boolean(root),
      scrollTop: scrolling?.scrollTop ?? 0,
      scrollWidth: scrolling?.scrollWidth ?? 0,
      scrollHeight: scrolling?.scrollHeight ?? 0,
      vw,
      vh,
      clipped: clipped.slice(0, 8),
      outside: outside.slice(0, 8),
    };
  });
  expect(report.hasMain, `${screen}: main`).toBe(true);
  expect(report.scrollTop, `${screen}: document scroll`).toBe(0);
  expect(report.scrollWidth, `${screen}: scroll width`).toBeLessThanOrEqual(report.vw + 1);
  expect(report.scrollHeight, `${screen}: scroll height`).toBeLessThanOrEqual(report.vh + 1);
  expect(report.clipped, `${screen}: clipped\n${report.clipped.join("\n")}`).toEqual([]);
  expect(report.outside, `${screen}: outside\n${report.outside.join("\n")}`).toEqual([]);
};

const assertBoxInside = async (board: Page, locator: Locator, label: string) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`${label}: no bounding box`);
  const size = board.viewportSize() ?? BOARD_VIEW;
  expect(box.x, `${label}: left`).toBeGreaterThanOrEqual(-1);
  expect(box.y, `${label}: top`).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width, `${label}: right`).toBeLessThanOrEqual(size.width + 1);
  expect(box.y + box.height, `${label}: bottom`).toBeLessThanOrEqual(size.height + 1);
};

const assertStartupFrame = async (board: Page, screen: string) => {
  await expect(board.locator("main")).toHaveAttribute("data-board-layer", "startup");
  await expect(board.locator(DIALOG_FRAME)).toHaveCount(1);
  await assertBoxInside(board, board.locator(DIALOG_FRAME), `${screen}: dialog frame`);
  await assertFits(board, screen);
};

const qrBox = async (locator: Locator, label: string) => {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  if (!box) throw new Error(`${label}: join QR has no bounding box`);
  return box;
};

test("Story board startup screens fit at 1920x1080 and the join QR resizes (SCR-013, DEC-274)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const session = await startAcceptanceHost(testInfo, { seed: "startup-frames-fit" });
  const boardContext = await browser.newContext({
    baseURL: session.baseURL,
    viewport: BOARD_VIEW,
  });
  const deviceContext = await browser.newContext({
    baseURL: session.baseURL,
    viewport: projectViewport(testInfo),
    hasTouch: Boolean(testInfo.project.use.hasTouch),
  });
  try {
    const board = await boardContext.newPage();
    const device = await deviceContext.newPage();
    const releaseBoard = await holdBoardServerFrames(board);

    await board.goto("/board");
    await expect(board.locator("main")).toHaveAttribute("data-screen", "splash");
    await expect(board.locator('[data-startup-panel="splash"]')).toHaveCount(1);
    await assertStartupFrame(board, "splash");

    releaseBoard();
    await expect(board.locator("main")).toHaveAttribute("data-screen", "table-join");
    await expect(board.locator("[data-join-code]")).toHaveAttribute("data-join-code", /^\d{6}$/);
    const tableQr = await qrBox(board.locator("[data-join-code] .bt-qr"), "table-join");
    await assertStartupFrame(board, "table-join");

    await installSessionSocketHook(device);
    await device.goto(`/join?code=${session.host.joinCode}`);
    await expect(board.locator("main")).toHaveAttribute("data-screen", "base-board");
    // The first join shrinks the QR to a corner (DEC-274).
    const cornerQr = await qrBox(board.locator("[data-join-corner] .bt-qr"), "corner");
    expect(cornerQr.height, "corner QR smaller than table-join QR").toBeLessThan(tableQr.height);

    await enterWithoutTower(device);
    await expect(board.locator("main")).toHaveAttribute("data-screen", "pick-story");
    await expect(board.locator("[data-join-corner]")).toHaveCount(1);
    await expect(board.locator('[data-startup-panel="pick-story"]')).toHaveCount(1);
    await expect(board.locator(`[data-story-focus="${STORY_ID}"]`)).toBeVisible();
    await assertStartupFrame(board, "pick-story");

    await clickAct(device, "continue", `continue-pick-story-${STORY_ID}`);
    await clickAct(device, "continue", "continue-game-settings");
    await expect(device.locator("main.bt-device")).toHaveAttribute("data-screen", "claim-heroes");
    await holdHeroesFromTest(device, ["hero-a"]);
    await expect(board.locator('[data-startup-panel="claim-heroes"]')).toHaveCount(1);
    // Claim heroes shows the full join QR again, larger than the corner one (DEC-274).
    const claimQr = await qrBox(board.locator("[data-join-code] .bt-qr"), "claim-heroes");
    expect(claimQr.height, "claim-heroes QR larger than corner QR").toBeGreaterThan(
      cornerQr.height,
    );
  } finally {
    await boardContext.close();
    await deviceContext.close();
    await session.host.close();
  }
});
