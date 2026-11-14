import { cpSync, mkdtempSync, readFileSync, realpathSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { inflateSync } from "node:zlib";
import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";
import { runPack } from "../../assets/pack/index.ts";
import { runRender } from "../../assets/render/cli.ts";
import { loadConfig } from "../../server/config.ts";
import { DEMO_LINE_ENV, DEMO_PROMPT_ID } from "../../server/core/demoLine.ts";
import { type SessionHost, startSessionHost } from "../../server/hub/host.ts";
import { createMockTower } from "../../server/tower/mock.ts";
import { bloodtowerTowerFromMock } from "../../server/tower/testAdapter.ts";
import { installSessionSocketHook } from "./support/acceptance.ts";
import { copyToE2eArtifacts } from "./support/e2e-artifacts.ts";

/**
 * A1-8b-2 (CU/02, eval.md EV-01, EV-02, EV-05, EV-06, EV-11). A temp copy of `packs/test` is
 * rendered with asset-studio's fake providers and packed with `--drafts`; a host runs on it with
 * the mock tower never connected, and the controlled demo entry (a device `act` on the hidden
 * `demo-line` prompt, on only with BLOODTOWER_DEMO_LINE) plays the line on the Story board.
 * Nothing is written under the repo's `packs/test/assets/`. Mac (desktop) project only.
 */

const LINE_ID = "seal-break.01~vo-01";
// The Copy table row of the brief, locked by A1 Step 8b-2.
const CAPTION =
  "The roads are clear, and a seal breaks like an old oath giving way. Ahead stands the Ruined Keep.";
const WEB_ROOT = resolve(import.meta.dirname, "../../web/out");
const IPAD = { width: 820, height: 1180 };

type MediaEvent = { type: string; id: string };

test.describe.configure({ mode: "serial" });

let work = "";
let packed = "";
let noGlow = "";
let noAudio = "";

const tempDir = (label: string) =>
  realpathSync(mkdtempSync(join(tmpdir(), `bt-a1-demo-${label}-`)));

/** A copy of the packed packs folder; `drop` removes packed files named by the index. */
const variant = (label: string, drop: string[]) => {
  const root = tempDir(label);
  cpSync(packed, root, { recursive: true });
  const index = JSON.parse(readFileSync(join(root, "test/assets/index.json"), "utf8")) as {
    assets: Record<string, { file: string }>;
  };
  for (const id of drop) {
    const file = index.assets[id]?.file;
    if (!file) throw new Error(`${id} is not packed`);
    unlinkSync(join(root, "test/assets", file));
  }
  return root;
};

test.beforeAll(async ({ browser: _browser }, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  test.setTimeout(240_000);
  work = tempDir("work");
  packed = tempDir("packs");
  const repoPacks = loadConfig({ env: {} }).packsDir;
  cpSync(join(repoPacks, "test"), join(packed, "test"), { recursive: true });
  cpSync(join(repoPacks, "base"), join(packed, "base"), { recursive: true });
  let err = "";
  const io = () => ({
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      ASSET_STUDIO_FAKE_PROVIDERS: "1",
      ASSET_STUDIO_CONFIG_DIR: join(work, "config"),
    },
    cwd: work,
    out: () => {},
    err: (text: string) => {
      err += text;
    },
  });
  const common = ["test", "--packs-dir", packed, "--work-folder", join(work, "studio")];
  expect(await runRender([...common, "--ai"], io()), err).toBe(0);
  expect(await runPack([...common, "--drafts"], io()), err).toBe(0);
  noGlow = variant("no-glow", ["glow.cover"]);
  noAudio = variant("no-audio", [LINE_ID]);
});

test.afterAll(() => {
  for (const dir of [work, packed, noGlow, noAudio]) {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

/** The Story board runs on the Mac: this spec runs in the desktop project only. */
const desktopOnly = (testInfo: TestInfo) =>
  test.skip(testInfo.project.name !== "desktop", "The Story board runs on the Mac.");

/** A host on `packsDir` with the demo entry on and the mock tower never connected. */
const startDemoHost = async (packsDir: string, label: string) => {
  const tower = createMockTower();
  const previous = process.env[DEMO_LINE_ENV];
  process.env[DEMO_LINE_ENV] = LINE_ID;
  let host: SessionHost;
  try {
    host = await startSessionHost({
      port: 0,
      host: "127.0.0.1",
      webRoot: WEB_ROOT,
      packsDir,
      databasePath: join(work, `${label}.sqlite`),
      tower: bloodtowerTowerFromMock(tower),
      towerWatchMs: 50,
      sleep: async () => undefined,
      graceMs: 100,
    });
  } finally {
    if (previous === undefined) delete process.env[DEMO_LINE_ENV];
    else process.env[DEMO_LINE_ENV] = previous;
  }
  return { host, tower, baseURL: `http://127.0.0.1:${host.port}` };
};

const recordMediaEvents = async (page: Page) => {
  await page.addInitScript(() => {
    const win = window as unknown as { __packedEvents: { type: string; id: string }[] };
    win.__packedEvents = [];
    for (const type of ["play", "ended", "error"]) {
      document.addEventListener(
        type,
        (event) => {
          const target = event.target;
          if (target instanceof HTMLMediaElement) {
            win.__packedEvents.push({ type, id: target.dataset.packedAudio ?? "" });
          }
        },
        true,
      );
    }
  });
};

const mediaEvents = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __packedEvents?: MediaEvent[] }).__packedEvents ?? [],
  );

const openBoard = async (browser: Browser, baseURL: string, testInfo: TestInfo) => {
  const context = await browser.newContext({
    baseURL,
    viewport: testInfo.project.use.viewport ?? null,
  });
  const page = await context.newPage();
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  await recordMediaEvents(page);
  await page.goto("/board");
  await expectBoardReady(page);
  return { context, page, requests, errors };
};

/** The board has the host's first view, and the page has had a user gesture (audio may start). */
const expectBoardReady = async (page: Page) => {
  // The page's own placeholder is `splash`; any other screen came from the host.
  await expect(page.locator("main.bt-board")).toHaveAttribute("data-screen", /^(?!splash$)/u, {
    timeout: 20_000,
  });
  await page.mouse.click(4, 4);
};

const openPad = async (browser: Browser, baseURL: string, joinCode: string) => {
  const context = await browser.newContext({ baseURL, viewport: IPAD, hasTouch: true });
  const page = await context.newPage();
  await installSessionSocketHook(page);
  await page.goto(`/join?code=${joinCode}`);
  await expect(page).toHaveURL(/\/device/);
  return { context, page };
};

/** The controlled demo entry: one `act` on the hidden prompt. No button sends it. */
const sendDemo = async (pad: Page, actionId: "play" | "replay") => {
  await pad.waitForFunction(() => {
    const socket = (window as unknown as { __btSessionSocket?: WebSocket }).__btSessionSocket;
    return socket != null && socket.readyState === WebSocket.OPEN;
  });
  await pad.evaluate(
    ({ promptId, actionId: action }) => {
      const socket = (window as unknown as { __btSessionSocket?: WebSocket }).__btSessionSocket;
      if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("No open socket.");
      socket.send(
        JSON.stringify({ v: 2, type: "act", payload: { promptId, actionId: action, args: {} } }),
      );
    },
    { promptId: DEMO_PROMPT_ID, actionId },
  );
};

const imageLoaded = (page: Page, selector: string) =>
  expect
    .poll(
      () =>
        page
          .locator(selector)
          .evaluate(
            (node) =>
              (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0,
          ),
      { timeout: 15_000 },
    )
    .toBe(true);

const shot = async (page: Page, testInfo: TestInfo, name: string): Promise<Buffer> => {
  const path = testInfo.outputPath(`${name}.png`);
  const png = await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: "image/png" });
  copyToE2eArtifacts(testInfo, path, `${name}.png`);
  return png;
};

type Pixels = { width: number; height: number; channels: number; data: Uint8Array };

/** An 8-bit, non-interlaced RGB or RGBA PNG (what Chromium's screenshot writes), decoded. */
const decodePng = (png: Buffer): Pixels => {
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const body = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const depth = body[8];
      const color = body[9];
      if (depth !== 8 || body[12] !== 0 || (color !== 2 && color !== 6)) {
        throw new Error(`Unsupported PNG: depth ${depth}, colour ${color}, interlace ${body[12]}`);
      }
      channels = color === 6 ? 4 : 3;
    } else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const data = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x] ?? 0;
      const a = x >= channels ? (data[y * stride + x - channels] ?? 0) : 0;
      const b = y > 0 ? (data[(y - 1) * stride + x] ?? 0) : 0;
      const c = x >= channels && y > 0 ? (data[(y - 1) * stride + x - channels] ?? 0) : 0;
      let out = value;
      if (filter === 1) out = value + a;
      else if (filter === 2) out = value + b;
      else if (filter === 3) out = value + ((a + b) >> 1);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        out = value + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      data[y * stride + x] = out & 0xff;
    }
  }
  return { width, height, channels, data };
};

/** Share of near-white pixels and the spread of luma in a CSS-pixel box (the screenshot is 1:1). */
const sampleRegion = (
  image: Pixels,
  box: { x: number; y: number; width: number; height: number },
) => {
  const lumas: number[] = [];
  let white = 0;
  for (let y = Math.round(box.y); y < box.y + box.height; y += 6) {
    for (let x = Math.round(box.x); x < box.x + box.width; x += 6) {
      const i = (y * image.width + x) * image.channels;
      const [r = 0, g = 0, b = 0] = [image.data[i], image.data[i + 1], image.data[i + 2]];
      if (r >= 240 && g >= 240 && b >= 240) white += 1;
      lumas.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
    }
  }
  const mean = lumas.reduce((sum, v) => sum + v, 0) / lumas.length;
  const spread = Math.sqrt(lumas.reduce((sum, v) => sum + (v - mean) ** 2, 0) / lumas.length);
  return {
    samples: lumas.length,
    nearWhite: white / lumas.length,
    lumaMean: mean,
    lumaSpread: spread,
  };
};

const PORTRAIT_REQUEST = /portrait|mouth|avatar/iu;

test("EV-01, EV-02, EV-06: the packed line plays once with the locked caption over the cover and glow, tower off", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  desktopOnly(testInfo);
  const session = await startDemoHost(packed, "full");
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL, testInfo);
    contexts.push(board.context);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);

    await sendDemo(pad.page, "play");
    const scene = board.page.locator(`[data-packed-line="${LINE_ID}"]`);
    await expect(scene).toBeVisible();
    // EV-01: the caption equals the Copy table row exactly.
    expect(await board.page.locator("[data-packed-caption]").textContent()).toBe(CAPTION);
    await expect(board.page.locator(`audio[data-packed-audio="${LINE_ID}"]`)).toHaveCount(1);

    // EV-02: the cover with the glow over it in the same box.
    await imageLoaded(board.page, "[data-packed-painting]");
    await expect(board.page.locator('[data-packed-glow][data-glow-state="ready"]')).toHaveCount(1, {
      timeout: 15_000,
    });
    const paintingBox = await board.page.locator("[data-packed-painting]").boundingBox();
    const glowBox = await board.page.locator("[data-packed-glow]").boundingBox();
    expect(paintingBox).not.toBeNull();
    expect(glowBox).toEqual(paintingBox);
    expect(paintingBox?.width).toBeGreaterThan(0);
    // The painting is fitted with object-fit, the mask with mask-size: the same fit, the same place.
    const paintingFit = await board.page
      .locator("[data-packed-painting]")
      .evaluate(
        (node) => `${getComputedStyle(node).objectFit} ${getComputedStyle(node).objectPosition}`,
      );
    const glowFit = await board.page.locator("[data-packed-glow]").evaluate((node) => {
      const style = getComputedStyle(node);
      return `${style.maskSize || style.webkitMaskSize} ${style.maskPosition || style.webkitMaskPosition}`;
    });
    expect(glowFit).toBe(paintingFit);
    await board.page.waitForTimeout(300);
    const png = await shot(board.page, testInfo, "a1-8b-2-cover-and-glow");
    // The cover stays visible under the glow. asset-studio's fake mask is white over the left half,
    // so that half is where an opaque glow would hide the painting: sample it above the caption.
    if (!paintingBox) throw new Error("no painting box");
    const region = sampleRegion(decodePng(png), {
      x: paintingBox.x + paintingBox.width * 0.05,
      y: paintingBox.y + paintingBox.height * 0.05,
      width: paintingBox.width * 0.4,
      height: paintingBox.height * 0.55,
    });
    expect(region.nearWhite, JSON.stringify(region)).toBeLessThan(0.02);
    expect(region.lumaSpread, JSON.stringify(region)).toBeGreaterThan(12);

    // EV-01: the audio element for that id starts once and ends once.
    await expect
      .poll(() => mediaEvents(board.page), { timeout: 20_000 })
      .toEqual([
        { type: "play", id: LINE_ID },
        { type: "ended", id: LINE_ID },
      ]);
    await expect(scene).toHaveCount(0, { timeout: 20_000 });
    await board.page.waitForTimeout(1_000);
    expect(await mediaEvents(board.page)).toEqual([
      { type: "play", id: LINE_ID },
      { type: "ended", id: LINE_ID },
    ]);

    // Files came by asset id from the host; no portrait or mouth was asked for.
    const byId = board.requests.filter((url) => url.includes("/packs/test/by-id/"));
    // The mask is fetched twice (a load probe and the CSS mask), so compare the set of paths.
    expect(
      [...new Set(byId.map((url) => decodeURIComponent(new URL(url).pathname)))].sort(),
    ).toEqual(
      [
        "/packs/test/by-id/glow.cover",
        "/packs/test/by-id/painting.cover",
        `/packs/test/by-id/${LINE_ID}`,
      ].sort(),
    );
    expect(board.requests.filter((url) => PORTRAIT_REQUEST.test(url))).toEqual([]);
    expect(board.errors).toEqual([]);

    // EV-06: the tower was never connected and was sent nothing.
    expect(session.tower.snapshot().connection).not.toBe("connected");
    expect(session.tower.sent()).toEqual([]);
  } finally {
    for (const context of contexts) await context.close();
    await session.host.close();
  }
});

test("EV-11: a reload does not replay the line; the explicit replay plays it once", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  desktopOnly(testInfo);
  const session = await startDemoHost(packed, "reload");
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL, testInfo);
    contexts.push(board.context);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);

    await sendDemo(pad.page, "play");
    await expect
      .poll(() => mediaEvents(board.page), { timeout: 20_000 })
      .toEqual([
        { type: "play", id: LINE_ID },
        { type: "ended", id: LINE_ID },
      ]);

    // Restore: reload the board, wait 5 seconds. Nothing starts.
    await board.page.reload();
    await expectBoardReady(board.page);
    await board.page.waitForTimeout(5_000);
    expect(await mediaEvents(board.page)).toEqual([]);
    await expect(board.page.locator("[data-packed-line]")).toHaveCount(0);

    // A second `play` is refused (once only); the board stays silent.
    await sendDemo(pad.page, "play");
    await board.page.waitForTimeout(1_500);
    expect(await mediaEvents(board.page)).toEqual([]);

    // The explicit replay entry plays it once.
    await sendDemo(pad.page, "replay");
    await expect(board.page.locator(`[data-packed-line="${LINE_ID}"]`)).toBeVisible();
    await expect
      .poll(() => mediaEvents(board.page), { timeout: 20_000 })
      .toEqual([
        { type: "play", id: LINE_ID },
        { type: "ended", id: LINE_ID },
      ]);
    expect(board.errors).toEqual([]);
  } finally {
    for (const context of contexts) await context.close();
    await session.host.close();
  }
});

test("EV-02: with no glow packed the cover shows alone", async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  desktopOnly(testInfo);
  const session = await startDemoHost(noGlow, "no-glow");
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL, testInfo);
    contexts.push(board.context);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);

    await sendDemo(pad.page, "play");
    await expect(board.page.locator(`[data-packed-line="${LINE_ID}"]`)).toBeVisible();
    await imageLoaded(board.page, "[data-packed-painting]");
    await expect(board.page.locator("[data-packed-glow]")).toHaveCount(0);
    await shot(board.page, testInfo, "a1-8b-2-cover-no-glow");
    expect(board.requests.filter((url) => url.includes("glow.cover"))).toEqual([]);
    expect(board.requests.filter((url) => PORTRAIT_REQUEST.test(url))).toEqual([]);
  } finally {
    for (const context of contexts) await context.close();
    await session.host.close();
  }
});

test("EV-05: with the packed audio file missing the caption still shows, with no error", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  desktopOnly(testInfo);
  const session = await startDemoHost(noAudio, "no-audio");
  const contexts: BrowserContext[] = [];
  try {
    const board = await openBoard(browser, session.baseURL, testInfo);
    contexts.push(board.context);
    const pad = await openPad(browser, session.baseURL, session.host.joinCode);
    contexts.push(pad.context);

    await sendDemo(pad.page, "play");
    await expect(board.page.locator(`[data-packed-line="${LINE_ID}"]`)).toBeVisible();
    const caption = board.page.locator("[data-packed-caption]");
    await expect(caption).toBeVisible();
    expect(await caption.textContent()).toBe(CAPTION);
    await expect(board.page.locator("audio")).toHaveCount(0);
    await shot(board.page, testInfo, "a1-8b-2-caption-only");
    // Still on screen a moment later: the caption is held for a reading time.
    await board.page.waitForTimeout(2_000);
    await expect(caption).toBeVisible();
    await expect(board.page.getByText("The mists close in")).toHaveCount(0);
    expect(await mediaEvents(board.page)).toEqual([]);
    expect(board.requests.filter((url) => url.includes(encodeURIComponent(LINE_ID)))).toEqual([]);
    expect(board.errors).toEqual([]);
  } finally {
    for (const context of contexts) await context.close();
    await session.host.close();
  }
});
