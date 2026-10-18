import { writeFileSync } from "node:fs";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { formatTimingReport, readRun } from "../../server/scripts/timingReport.ts";
import { joinQrSvg } from "../../web/lib/qr.ts";
import {
  captureFrames,
  gateControls,
  releaseTogether,
  startAcceptanceHost,
} from "./support/acceptance.ts";

// R1 step 10. One Story board and two devices play the test pack's first night with the mock tower.
// Each AC id below is a step. AC-1 and AC-2 are check, build, smoke and pack:lint (not repeated here).

const TOKEN_KEY = "bloodtower.deviceToken";

const device = (page: Page) => ({
  button: (action: string) => page.locator(`button[data-action="${action}"]`),
  hold: (hunter: string) => page.locator(`button[data-hunter="${hunter}"]`),
});

const boardStates = (frames: readonly string[]) =>
  frames
    .map((frame) => JSON.parse(frame) as { type: string; payload: Record<string, unknown> })
    .filter((message) => message.type === "storyboardState")
    .map((message) => message.payload);

/** Story-board camera tracks (desktop project only). */
const expectCameraTrackMoves = async (board: Page, momentId: string) => {
  const cameraStill = board.locator(`[data-camera-still] img[data-camera-track="${momentId}"]`);
  await expect(cameraStill).toBeVisible();
  const readTransform = () => cameraStill.evaluate((img) => getComputedStyle(img).transform);
  const atOneSecond = await readTransform();
  await board.waitForTimeout(2000);
  const atThreeSeconds = await readTransform();
  expect(atOneSecond).not.toBe(atThreeSeconds);
};

test("the test pack's first night, end to end, on one board and two devices", async ({
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  const session = await startAcceptanceHost(testInfo);
  const { baseURL, host, tower } = session;
  const viewport = testInfo.project.use.viewport ?? { width: 820, height: 1180 };
  const hasTouch = testInfo.project.use.hasTouch ?? false;
  const contexts: BrowserContext[] = [];
  const newPage = async (size = viewport, touch = hasTouch) => {
    const context = await browser.newContext({ baseURL, viewport: size, hasTouch: touch });
    contexts.push(context);
    return context.newPage();
  };

  try {
    const board = await newPage({ width: 1440, height: 900 }, false);
    const boardFrames = captureFrames(board);
    const pageA = await newPage();
    const pageB = await newPage();
    const gateA = await gateControls(pageA);
    const gateB = await gateControls(pageB);
    const a = device(pageA);
    const b = device(pageB);
    let joinUrl = "";
    // The page on this machine. The QR encodes the board's join URL, which is the LAN address when one exists.
    const joinPage = `${baseURL}/join?code=${host.joinCode}`;

    await test.step("AC-3: the board is display only and shows the QR and a six-digit code", async () => {
      await board.goto("/board?debug=1");
      await expect(board.locator("main.bt-board")).toBeVisible();
      await expect(board.getByText(host.joinCode, { exact: true })).toBeVisible();
      expect(host.joinCode).toMatch(/^\d{6}$/);
      await expect(board.getByText(/Battery unavailable/)).toBeVisible();
      // Counted once the live state (and its QR) has rendered.
      await expect(board.getByRole("img", { name: "Join code" })).toBeVisible();
      // The only board controls are the Sound dialog's own (R3-UI-03), and it is closed here.
      await expect(
        board.locator(
          "main :is(button, input, textarea, select, a, [onclick]):not([data-sound-dialog] *)",
        ),
      ).toHaveCount(0);

      await expect.poll(() => boardStates(boardFrames).length).toBeGreaterThan(0);
      const join = boardStates(boardFrames).at(-1)?.join as {
        code: string;
        url: string;
        reachable: boolean;
      };
      joinUrl = join.url;
      expect(join.code).toBe(host.joinCode);
      expect(join.url).toMatch(new RegExp(`/join\\?code=${host.joinCode}$`));
      expect(typeof join.reachable).toBe("boolean");

      // The QR on the page is the join URL's QR, cell for cell.
      const cells = await board
        .getByRole("img", { name: "Join code" })
        .evaluate((svg) =>
          [...svg.querySelectorAll("rect")].map(
            (rect) => `${rect.getAttribute("x")},${rect.getAttribute("y")}`,
          ),
        );
      const expected = [...joinQrSvg(joinUrl).matchAll(/<rect x="(\d+)" y="(\d+)"/g)].map(
        (match) => `${match[1]},${match[2]}`,
      );
      expect(cells).toEqual(expected);
    });

    await test.step("AC-4: join by the QR target, then Tower Connect", async () => {
      await pageA.goto(joinPage);
      await pageB.goto(joinPage);
      await expect(pageA).toHaveURL(/\/device/);
      await expect(pageB).toHaveURL(/\/device/);
      await expect(pageA.getByRole("heading", { name: "Tower Connect" })).toBeVisible();
      await expect(pageB.getByRole("heading", { name: "Tower Connect" })).toBeVisible();
      await expect(a.button("play-without-tower")).toBeVisible();
      await expect(a.button("continue")).toBeHidden();
    });

    await test.step("AC-9 (mock): connect from both devices at once, one wins, then calibrate", async () => {
      await expect(board.getByText(/Tower unavailable/)).toBeVisible();
      gateA.hold();
      gateB.hold();
      await a.button("tower-connect").click();
      await b.button("tower-connect").click();
      await gateA.held(1);
      await gateB.held(1);
      expect(releaseTogether(gateA, gateB)).toBe(2);

      await expect(board.getByText(/Tower connected/)).toBeVisible();
      await expect(board.locator("[data-status='tower']")).toContainText("calibrating");
      const statuses = [
        await pageA
          .getByText(/Your press counted|Locked\. Another player pressed first/)
          .first()
          .textContent(),
        await pageB
          .getByText(/Your press counted|Locked\. Another player pressed first/)
          .first()
          .textContent(),
      ].sort();
      expect(statuses).toEqual(["Locked. Another player pressed first.", "Your press counted."]);
      const connects = host.loadRun().presses.filter((press) => press.promptId === "tower-connect");
      expect(connects.map((press) => press.winner).sort()).toEqual([false, true]);

      // Either device may calibrate: both press, the first arrival wins, the other is locked out.
      await expect(a.button("tower-calibrate")).toBeEnabled();
      await expect(b.button("tower-calibrate")).toBeEnabled();
      gateA.hold();
      gateB.hold();
      await a.button("tower-calibrate").click();
      await b.button("tower-calibrate").click();
      await gateA.held(1);
      await gateB.held(1);
      expect(releaseTogether(gateA, gateB)).toBe(2);
      await expect(board.getByText(/Calibration calibrated/)).toBeVisible();
      await expect(board.locator("[data-status='tower']")).toContainText("connected");
      await expect(a.button("tower-calibrate")).toBeDisabled();
      await expect(b.button("tower-calibrate")).toBeDisabled();
      await expect
        .poll(
          () =>
            host.loadRun().presses.filter((press) => press.promptId === "tower-calibrate").length,
        )
        .toBe(2);
      const calibrates = host
        .loadRun()
        .presses.filter((press) => press.promptId === "tower-calibrate");
      expect(calibrates.map((press) => press.winner).sort()).toEqual([false, true]);
      // The losing presses did not reach the tower: one connect and one calibrate only.
      expect(tower.sent()).toEqual([{ type: "connect" }, { type: "calibrate" }]);

      tower.setBattery(76);
      await expect(board.getByText(/Battery 76%/)).toBeVisible();
      await expect(pageA.getByText(/Battery 76%/)).toBeVisible();
    });

    await test.step("AC-4: hold several hunters; Begin waits for all", async () => {
      await expect(a.button("continue")).toHaveText("Next: pick a story");
      await expect(pageA.locator('[data-primary="true"]')).toHaveCount(1);
      await expect(a.button("play-without-tower")).toHaveCount(0);
      await a.button("continue").click();
      await expect(a.button("continue")).toHaveText("Choose Proving ground");
      await a.button("continue").click();
      // Game settings (R3-UI-22): the pack's settings, each at its default, changed from an iPad.
      await expect(pageA.getByRole("heading", { name: "Game settings" })).toBeVisible();
      await expect(board.locator("main")).toHaveAttribute("data-screen", "game-settings");
      const length = board.locator('[data-setting="length"] [data-setting-value]');
      await expect(length).toHaveText("Standard");
      await expect(board.locator('[data-setting="difficulty"] [data-setting-value]')).toHaveText(
        "Standard",
      );
      await pageB.locator('[data-setting="length"] button[data-option="short"]').click();
      await expect(length).toHaveText("Short");
      await expect(
        pageA.locator('[data-setting="length"] button[data-option="short"]'),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(a.button("back")).toBeVisible();
      await expect(a.button("continue")).toHaveText("Continue");
      await a.button("continue").click();
      await expect(pageA.getByRole("heading", { name: "Party Join" })).toBeVisible();
      await a.hold("alpha").click();
      await expect(a.hold("alpha")).toHaveAttribute("data-action", "release");
      await a.hold("beta").click();
      await expect(a.hold("beta")).toHaveAttribute("data-action", "release");
      await b.hold("gamma").click();
      await expect(b.hold("gamma")).toHaveAttribute("data-action", "release");
      await expect(pageA.getByRole("heading", { name: "Agnes" })).toBeVisible();
      await expect(pageA.getByRole("heading", { name: "Tomas" })).toBeVisible();
      // Party join: the next step waits until every hunter is held.
      await expect(board.locator('.bt-cart[data-hunter="delta"] .bt-cart-st')).toHaveText(
        "waiting",
      );
      await expect(a.button("continue")).toBeDisabled();
      await expect(a.button("begin")).toBeDisabled();
      expect(boardStates(boardFrames).at(-1)?.gate).toEqual({ canBegin: false, unheld: ["delta"] });

      await b.hold("delta").click();
      await expect(b.hold("delta")).toHaveAttribute("data-action", "release");
      await expect(pageB.getByRole("heading", { name: "Party Join" })).toBeVisible();
      await expect(pageB.getByRole("heading", { name: "Emeric" })).toBeVisible();
      await expect(a.button("continue")).toHaveText("Next: set up the story");
      await expect(a.button("continue")).toBeEnabled();
      await a.button("continue").click();
      // The begin screen: any joined device may press Begin.
      await expect(a.button("begin")).toBeEnabled();
      await expect(b.button("begin")).toBeEnabled();
      await expect(board.getByText("Begin", { exact: true })).toBeVisible();
    });

    const holdings = host.loadRun().holdings;
    const idA = holdings.find((holding) => holding.hunter === "alpha")?.deviceId ?? "";
    const idB = holdings.find((holding) => holding.hunter === "delta")?.deviceId ?? "";
    expect(idA).not.toBe(idB);
    expect(holdings.find((holding) => holding.hunter === "beta")?.deviceId).toBe(idA);
    expect(holdings.find((holding) => holding.hunter === "gamma")?.deviceId).toBe(idB);
    const connects = host.loadRun().presses.filter((press) => press.promptId === "tower-connect");
    expect(new Set(connects.map((press) => press.deviceId))).toEqual(new Set([idA, idB]));
    const calibrates = host
      .loadRun()
      .presses.filter((press) => press.promptId === "tower-calibrate");
    expect(new Set(calibrates.map((press) => press.deviceId))).toEqual(new Set([idA, idB]));

    await test.step("Begin starts the night on the board", async () => {
      await a.button("begin").click();
      await expect(board.getByText("The proving ground is quiet.")).toBeVisible();
      await expect(a.button("continue")).toBeEnabled();
      await expect(b.button("continue")).toBeEnabled();
    });

    await test.step("AC-5: two Continue presses in one tick, exactly one wins", async () => {
      gateA.hold();
      gateB.hold();
      await a.button("continue").click();
      await b.button("continue").click();
      await gateA.held(1);
      await gateB.held(1);
      expect(releaseTogether(gateA, gateB)).toBe(2);

      await expect(board.getByText("Each hunter reads alone.")).toBeVisible();
      await expect(pageA.getByText("Only Agnes hears this.")).toBeVisible();
      await expect(pageB.getByText("Only Emeric hears this.")).toBeVisible();
      await expect
        .poll(
          () => host.loadRun().presses.filter((press) => press.promptId === "continue-0").length,
        )
        .toBe(2);
      const presses = host.loadRun().presses.filter((press) => press.promptId === "continue-0");
      expect(presses.filter((press) => press.winner)).toHaveLength(1);
      expect(new Set(presses.map((press) => press.deviceId))).toEqual(new Set([idA, idB]));
      for (const press of presses) {
        expect(press.action).toBe("continue");
        expect(press.atMonoMs).toBeGreaterThan(0);
        expect(press.atWall).toMatch(/Z$/);
      }
    });

    await test.step("AC-6: a private line reaches only the holder's device", async () => {
      await expect(pageA.getByText("Only Emeric hears this.")).toHaveCount(0);
      await expect(pageB.getByText("Only Agnes hears this.")).toHaveCount(0);
      await expect(board.getByText(/Only (Agnes|Emeric) hears this/)).toHaveCount(0);
      // Beta and Gamma have no private line in this moment.
      await expect(pageA.getByText("No private line.")).toBeVisible();
      await expect(pageB.getByText("No private line.")).toBeVisible();
      // On the wire, not just on screen: each device was sent only its own hunters' lines.
      expect(gateA.received.some((frame) => frame.includes("Only Agnes hears this."))).toBe(true);
      expect(gateB.received.some((frame) => frame.includes("Only Emeric hears this."))).toBe(true);
      for (const frame of gateA.received) {
        expect(frame).not.toContain("Only Emeric hears this.");
        expect(frame).not.toContain(".private.delta");
      }
      for (const frame of gateB.received) {
        expect(frame).not.toContain("Only Agnes hears this.");
        expect(frame).not.toContain(".private.alpha");
      }
    });

    await test.step("AC-7: losing the only holder pauses at once; rejoin by token resumes", async () => {
      const tokenB = await pageB.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY);
      expect(tokenB).toBeTruthy();
      await contexts[2]?.close();
      await expect(board.getByText("Waiting for someone to hold Wren.")).toBeVisible({
        timeout: 2_000,
      });
      await expect(a.button("continue")).toBeDisabled();
      await expect(a.button("pause")).toBeDisabled();

      const pageC = await newPage();
      await pageC.goto("/join");
      await pageC.getByLabel("Rejoin token").fill(tokenB ?? "");
      await pageC.getByRole("button", { name: "Rejoin" }).click();
      await expect(pageC).toHaveURL(/\/device/);
      await expect(pageC.locator("main")).toHaveAttribute("data-screen", "play");
      await expect(pageC.getByRole("heading", { name: "Emeric" })).toBeVisible();
      await expect(board.getByText("Waiting for someone to hold Wren.")).toHaveCount(0);
      await expect(a.button("continue")).toBeEnabled();

      const pauses = host.loadRun().marks.filter((mark) => mark.kind === "pause");
      expect(pauses).toHaveLength(1);
      expect(pauses[0]).toMatchObject({ cause: "disconnect", hunter: "gamma" });
      expect(pauses[0]?.endMonoMs).not.toBeNull();

      // A host pause and Resume. The rejoined page stays on /device so its holdings stay live.
      await a.button("pause").click();
      await expect(board.getByText("Paused.", { exact: true })).toBeVisible();
      await expect(a.button("continue")).toBeDisabled();
      await a.button("resume").click();
      await expect(board.getByText("Paused.", { exact: true })).toHaveCount(0);
      const hostPause = host.loadRun().marks.find((mark) => mark.cause === "host-pause");
      expect(hostPause).toMatchObject({ kind: "pause", hunter: null, deviceId: idA });
      expect(hostPause?.endMonoMs).not.toBeNull();
    });

    await test.step("The cue moment shows its screen half and fallback, then Grey Stair and the night ends", async () => {
      await a.button("continue").click();
      await expect(board.getByText("A bell marks the step.")).toBeVisible();
      await expect(board.locator('[data-fallback="sfx.bell"]')).toBeVisible();
      await expect(board.locator("main")).not.toContainText("Still fx.bell");
      await a.button("continue").click();
      await expect(
        board.getByText("A grey stair climbs into the dark. Someone has left the lamps unlit."),
      ).toBeVisible();
      await expect(board.locator("main")).not.toContainText("[pause");
      // Camera pan-and-zoom runs only on the Mac story board. Phone/iPad projects drive hunters, not board visuals.
      if (testInfo.project.name === "desktop") {
        await expectCameraTrackMoves(board, "grey-stair.01");
      }
      await a.button("continue").click();
      await expect(board.getByText(/At the top, a door/)).toBeVisible();
      await expect(board.locator("main")).not.toContainText("[pause");
      if (testInfo.project.name === "desktop") {
        await expectCameraTrackMoves(board, "grey-stair.02");
      }
      await a.button("continue").click();
      const keeperCaption = board.locator("[data-board-caption]");
      await expect(keeperCaption).toBeVisible();
      await expect(keeperCaption).toHaveAttribute("data-keeper-line", "ts-keeper-001");
      await expect(keeperCaption).toContainText(
        "The Keeper: Light them if you can. The key is at the bottom. It always is.",
      );
      await expect(board.locator('[data-talking-avatar="keeper"]')).toBeVisible();
      await expect(board.getByRole("img", { name: "The Keeper" })).toBeVisible();
      await expect(board.locator("main")).not.toContainText("[pause");
      // The Keeper's three lines take three Continue presses. The audio is paused here, so a line
      // cannot end on its own and skew the count; the door waits for the last press.
      const holdKeeperAudio = () =>
        board.evaluate(() => {
          for (const audio of document.querySelectorAll("audio")) audio.pause();
        });
      await holdKeeperAudio();
      await expect(a.button("continue")).toHaveAttribute("data-primary", "true");
      await a.button("continue").click();
      await holdKeeperAudio();
      await expect(board.getByText("Oil the hinge, or force it.")).toHaveCount(0);
      await a.button("continue").click();
      await holdKeeperAudio();
      await expect(board.getByText("Oil the hinge, or force it.")).toHaveCount(0);
      await expect(a.button("pick")).toHaveCount(0);
      await a.button("continue").click();
      // The last line is done, so the door choice comes up: one button per option, on the iPad.
      // The board shows the prompt twice (the prompt line and the moment), so match the moment.
      await expect(
        board.locator("[data-moment-caption]", { hasText: "Oil the hinge, or force it." }),
      ).toBeVisible();
      await expect(a.button("continue")).toBeDisabled();
      await expect(a.button("pick")).toHaveCount(2);
      await expect(a.button("pick").filter({ hasText: "Oil the hinge" })).toBeEnabled();
      await expect(a.button("pick").filter({ hasText: "Force it" })).toBeEnabled();
      // Tapping an option advances the flow to the next moment.
      await a.button("pick").filter({ hasText: "Oil the hinge" }).click();
      await expect(
        board.getByText("The lamps are lit, or they are not. The stair is quiet."),
      ).toBeVisible();
      if (testInfo.project.name === "desktop") {
        await expectCameraTrackMoves(board, "grey-stair.04");
      }
      await a.button("continue").click();
      await expect(board.getByText("Moment unavailable.")).toBeVisible();
      await expect(a.button("continue")).toBeDisabled();
    });

    await test.step("AC-8: every moment, press, pause and cue has a timing mark; the report rebuilds the run", async () => {
      const run = readRun(session.databasePath, host.loadRun().session.id);
      const subjects = (kind: string) =>
        run.marks.filter((mark) => mark.kind === kind).map((mark) => mark.subject);
      expect(subjects("phase")).toEqual(["night"]);
      expect(subjects("moment")).toEqual([
        "proving-ground.01",
        "proving-ground.02",
        "proving-ground.03",
        "grey-stair.01",
        "grey-stair.02",
        "grey-stair.03",
        "grey-stair.door-choice",
        "grey-stair.04",
      ]);
      expect(subjects("cue")).toEqual(["bell"]);
      expect(subjects("pause")).toEqual(["disconnect:gamma", "host-pause:1"]);
      for (const mark of run.marks) {
        expect(mark.endMonoMs, `${mark.kind} ${mark.subject} closed`).not.toBeNull();
        expect(mark.endMonoMs ?? -1).toBeGreaterThanOrEqual(mark.startMonoMs);
        expect(mark.startWall).toMatch(/Z$/);
        expect(mark.endWall).toMatch(/Z$/);
      }
      // Each flow step's winning press records the screen it was on and the one it moved to.
      const won = (promptId: string) => run.presses.find((press) => press.promptId === promptId);
      expect(won("continue-tower-connect")).toMatchObject({
        winner: true,
        screen: "tower-connect",
        nextScreen: "pick-story",
      });
      expect(won("continue-pick-story-test")).toMatchObject({
        winner: true,
        screen: "pick-story",
        nextScreen: "game-settings",
      });
      expect(won("set-0")).toMatchObject({
        winner: true,
        action: "set",
        screen: "game-settings",
        nextScreen: null,
      });
      expect(won("continue-game-settings")).toMatchObject({
        winner: true,
        screen: "game-settings",
        nextScreen: "party-join",
      });
      // The settings locked at Begin, and the chosen length is in the timing log.
      expect(subjects("setting")).toEqual(["length:short", "difficulty:standard"]);
      expect(won("continue-party-join")).toMatchObject({
        winner: true,
        screen: "party-join",
        nextScreen: "begin",
      });
      expect(won("begin")).toMatchObject({ winner: true, screen: "begin", nextScreen: "play" });
      expect(run.presses.map((press) => `${press.promptId}:${press.winner}`)).toEqual([
        "tower-connect:true",
        "tower-connect:false",
        "tower-calibrate:true",
        "tower-calibrate:false",
        "continue-tower-connect:true",
        "continue-pick-story-test:true",
        "set-0:true",
        "continue-game-settings:true",
        "continue-party-join:true",
        "begin:true",
        "continue-0:true",
        "continue-0:false",
        "pause-1:true",
        "resume-1:true",
        "continue-1:true",
        "continue-2:true",
        "continue-3:true",
        "continue-4:true",
        "continue-5-0:true",
        "continue-5-1:true",
        "continue-5-2:true",
        "pick-6:true",
        "continue-7:true",
      ]);
      let previous = -1;
      for (const press of run.presses) {
        expect(press.atMonoMs, `${press.promptId} monotonic`).toBeGreaterThanOrEqual(previous);
        expect(press.atWall, `${press.promptId} wall`).toMatch(/^\d{4}-\d\d-\d\dT.*Z$/);
        previous = press.atMonoMs;
      }

      const report = formatTimingReport(run);
      const path = testInfo.outputPath("timing-report.txt");
      writeFileSync(path, `${report.join("\n")}\n`);
      await testInfo.attach("timing-report", { path, contentType: "text/plain" });
      const body = report.join("\n");
      for (const line of [
        "press won       begin begin",
        "moment start    proving-ground.01",
        "cue start       bell",
        "cue end         bell",
        "pause start     disconnect:gamma  cause disconnect  hunter gamma",
        "pause start     host-pause:1",
        "phase end       night",
        "Open marks none.",
      ]) {
        expect(body).toContain(line);
      }
      expect(report.at(-1)).toMatch(
        /^Lobby \d+ ms\. Night \d+ ms\. Paused \d+ ms\. Active \d+ ms\.$/,
      );
    });

    await test.step("AC-9 (mock): only connect and calibrate reached the tower", async () => {
      expect(tower.sent()).toEqual([{ type: "connect" }, { type: "calibrate" }]);
    });

    await test.step("AC-3: no board frame carried a private line or an ipad: payload", async () => {
      expect(boardFrames.length).toBeGreaterThan(5);
      const types = new Set(
        boardFrames.map((frame) => (JSON.parse(frame) as { type: string }).type),
      );
      expect([...types].sort()).toEqual(["storyboardState", "welcome"]);
      for (const frame of boardFrames) {
        expect(frame).not.toContain("ipad:");
        expect(frame).not.toContain(".private.");
        expect(frame).not.toMatch(/Only (Agnes|Emeric) hears this/);
        expect(frame).not.toContain("privateMoment");
      }
      // The board saw the private moment's shared placeholder, so it was connected throughout.
      expect(boardFrames.some((frame) => frame.includes("Each hunter reads alone."))).toBe(true);
    });

    await board.screenshot({ path: testInfo.outputPath("board-end.png"), fullPage: true });
  } finally {
    for (const context of contexts) await context.close().catch(() => undefined);
    await host.close();
  }
});
