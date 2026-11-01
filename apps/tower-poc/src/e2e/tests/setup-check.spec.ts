import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { expect, type Page, test } from "@playwright/test";

// Evals EV-01, EV-03, EV-04, EV-06 and EV-11. The tower project is not used: this file sits next
// to the other page specs, so each project runs it. They share one mock tower, so the tests take
// a lock. Commands are read from the frames this page sends, which is the list the mock receives
// from it.

const LOCK = join(tmpdir(), "tower-poc-setup-check.lock");

interface Sent {
  type: string;
  payload?: unknown;
}

const watchSent = (page: Page) => {
  const sent: Sent[] = [];
  page.on("websocket", (socket) => {
    socket.on("framesent", (frame) => {
      const text = typeof frame.payload === "string" ? frame.payload : frame.payload.toString();
      const message = JSON.parse(text) as { type?: string; payload?: unknown };
      if (message.type && message.type !== "hello") {
        sent.push({ type: message.type, payload: message.payload });
      }
    });
  });
  return sent;
};

const physical = (sent: readonly Sent[]) =>
  sent.filter((message) =>
    ["connect", "reconnect", "disconnect", "calibrate", "command"].includes(message.type),
  );

const commands = (sent: readonly Sent[]) => sent.filter((message) => message.type === "command");

const acquire = async () => {
  for (;;) {
    try {
      const fd = openSync(LOCK, "wx");
      writeFileSync(fd, String(process.pid));
      return fd;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw error;
      // A crashed worker leaves the file. Steal it only when that pid is gone.
      try {
        const pid = Number(readFileSync(LOCK, "utf8"));
        if (Number.isInteger(pid) && pid > 0) {
          try {
            process.kill(pid, 0);
          } catch (alive) {
            if ((alive as NodeJS.ErrnoException).code === "ESRCH") {
              try {
                unlinkSync(LOCK);
              } catch (unlinkError) {
                if ((unlinkError as NodeJS.ErrnoException).code !== "ENOENT") throw unlinkError;
              }
            }
          }
        }
      } catch (readError) {
        if ((readError as NodeJS.ErrnoException).code !== "ENOENT") throw readError;
      }
      await delay(200);
    }
  }
};

const release = (fd: number) => {
  closeSync(fd);
  try {
    unlinkSync(LOCK);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
};

/** Leaves the shared mock disconnected. Waits until this page knows the tower's state first. */
const disconnectTower = async (page: Page) => {
  await page.goto("/");
  const tower = page.locator("header dd").first();
  await expect(tower).toHaveText(/^(Connected|Not connected)$/, { timeout: 10_000 });
  if ((await tower.textContent()) === "Connected") {
    const disconnect = page.getByRole("button", { name: "Disconnect", exact: true });
    await expect(disconnect).toBeEnabled();
    await disconnect.click();
    await expect(tower).toHaveText("Not connected", { timeout: 10_000 });
  }
};

const withTower = async (page: Page, body: () => Promise<void>) => {
  const fd = await acquire();
  try {
    await disconnectTower(page);
    await page.goto("/setup-check");
    await body();
  } finally {
    try {
      await disconnectTower(page);
    } finally {
      release(fd);
    }
  }
};

const towerState = (page: Page) => page.getByRole("region", { name: "Tower state" });

const connect = async (page: Page) => {
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByRole("button", { name: "Calibrate", exact: true })).toBeEnabled({
    timeout: 10_000,
  });
};

const calibrate = async (page: Page) => {
  await page.getByRole("button", { name: "Calibrate", exact: true }).click();
  await expect(towerState(page)).toContainText("Calibrated", { timeout: 15_000 });
  await expect(towerState(page)).toContainText("Calibrate: done");
};

const pageErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    // WebKit logs a cut-off prefetch of another page as a page error. It is not this page.
    if (/access control checks/.test(error.message)) return;
    errors.push(error.message);
  });
  return errors;
};

test("nothing moves without a press", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = pageErrors(page);
  const sent = watchSent(page);

  await withTower(page, async () => {
    await expect(page.getByRole("heading", { name: "Setup check" })).toBeVisible();
    const opened = sent.length;
    // EV-01: a quiet page sends nothing, including no calibrate on load.
    await page.waitForTimeout(10_000);
    expect(physical(sent.slice(opened))).toEqual([]);

    await connect(page);
    expect(commands(sent)).toEqual([]);
    expect(sent.filter((message) => message.type === "calibrate")).toEqual([]);

    await calibrate(page);
    // Calibrate must not light a side or turn a drum on its own.
    await page.waitForTimeout(1_000);
    expect(commands(sent)).toEqual([]);

    await page.getByLabel("Top north").selectOption("cleanse");
    await page.waitForTimeout(500);
    expect(commands(sent)).toEqual([]);

    await page.getByRole("button", { name: "Light north side" }).click();
    await expect
      .poll(() => commands(sent))
      .toEqual([
        {
          type: "command",
          payload: {
            capabilityId: "lighting.set",
            params: { doorway: [{ position: "north", level: "top", style: "on" }] },
          },
        },
      ]);

    await page
      .getByRole("group", { name: "Kingdom" })
      .getByRole("button", { name: "North" })
      .click();
    await expect(page.getByText("north → North")).toBeVisible();
    await page.waitForTimeout(500);
    expect(commands(sent)).toHaveLength(1);

    await page.getByRole("button", { name: "Turn top drum to east" }).click();
    await expect.poll(() => commands(sent)).toHaveLength(2);
    expect(commands(sent)[1]).toEqual({
      type: "command",
      payload: {
        capabilityId: "mechanics.rotate-drum",
        params: { drumIndex: 0, position: 1 },
      },
    });

    await page
      .getByRole("group", { name: "Where the top drum landed" })
      .getByRole("button", { name: "east" })
      .click();
    await page.getByLabel("Dropped").fill("1");
    await page.getByLabel("Stayed inside").fill("1");
    await page.getByRole("button", { name: "Record try" }).click();
    await page.waitForTimeout(500);
    expect(commands(sent)).toHaveLength(2);
    expect(sent.filter((message) => message.type === "calibrate")).toHaveLength(1);
  });
  expect(errors).toEqual([]);
});

test("lights the north side and records the kingdom", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = pageErrors(page);
  const sent = watchSent(page);
  await withTower(page, async () => {
    await connect(page);
    await calibrate(page);
    await page.getByRole("button", { name: "Light north side" }).click();
    await expect.poll(() => commands(sent)).toHaveLength(1);
    const light = commands(sent)[0];
    if (!light) throw new Error("Light north side sent no command");
    expect(light.payload).toEqual({
      capabilityId: "lighting.set",
      params: { doorway: [{ position: "north", level: "top", style: "on" }] },
    });
    const payload = light.payload as { params: { doorway: { position: string }[] } };
    expect(payload.params.doorway.map((entry) => entry.position)).toEqual(["north"]);

    await page
      .getByRole("group", { name: "Kingdom" })
      .getByRole("button", { name: "East" })
      .click();
    await expect(page.getByText("north → East")).toBeVisible();
    await page.waitForTimeout(500);
    expect(commands(sent)).toHaveLength(1);
  });
  expect(errors).toEqual([]);
});

test("turns the top drum to east only after calibrate", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = pageErrors(page);
  const sent = watchSent(page);
  await withTower(page, async () => {
    const turn = page.getByRole("button", { name: "Turn top drum to east" });
    await expect(turn).toBeDisabled();
    expect(commands(sent)).toEqual([]);

    await connect(page);
    await expect(turn).toBeDisabled();
    expect(commands(sent)).toEqual([]);

    await calibrate(page);
    await turn.click();
    await expect
      .poll(() => commands(sent))
      .toEqual([
        {
          type: "command",
          payload: {
            capabilityId: "mechanics.rotate-drum",
            params: { drumIndex: 0, position: 1 },
          },
        },
      ]);
    const payload = commands(sent)[0]?.payload as { capabilityId?: string; params?: object };
    expect(payload.capabilityId).toBe("mechanics.rotate-drum");
    expect(payload.params).toEqual({ drumIndex: 0, position: 1 });
    expect(JSON.stringify(payload)).not.toMatch(/packet|bytes|raw/i);
  });
  expect(errors).toEqual([]);
});

test("shows the calibrate error code and leaves the step undone", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = pageErrors(page);
  // A routed socket does not show up on page.on("websocket"), so the press is recorded here.
  const sent: Sent[] = [];
  // The mock tower has no fail-calibrate switch. The service reports a rejected calibrate as
  // connection error `calibration-failed` (packages/tower session.ts). This answers the press
  // with that message, on the socket the page reads, and does not let the mock finish calibrating.
  await page.routeWebSocket(/\/ws$/, (socket) => {
    const server = socket.connectToServer();
    socket.onMessage((message) => {
      const text = typeof message === "string" ? message : message.toString();
      const parsed = JSON.parse(text) as { type?: string; payload?: unknown };
      if (parsed.type && parsed.type !== "hello") {
        sent.push({ type: parsed.type, payload: parsed.payload });
      }
      if (parsed.type === "calibrate") {
        socket.send(
          JSON.stringify({
            v: 1,
            type: "connection",
            payload: {
              state: "connected",
              calibration: "uncalibrated",
              error: {
                code: "calibration-failed",
                message: "The tower did not report the end of calibration within 30 s.",
                actionable: "Check that the drums can turn freely, then press Calibrate again.",
              },
            },
          }),
        );
        return;
      }
      server.send(message);
    });
    server.onMessage((message) => socket.send(message));
  });

  await withTower(page, async () => {
    await connect(page);
    await page.getByRole("button", { name: "Calibrate", exact: true }).click();
    const calibrateSection = page.getByRole("region", { name: "Calibrate" });
    await expect(calibrateSection.getByRole("alert")).toContainText("calibration-failed");
    await expect(towerState(page)).toContainText("Unknown");
    await expect(towerState(page)).toContainText("Calibrate: undone");
    await expect(page.getByRole("button", { name: "Light north side" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Turn top drum to east" })).toBeDisabled();
    await page.waitForTimeout(1_000);
    expect(commands(sent)).toEqual([]);
    expect(sent.filter((message) => message.type === "calibrate")).toHaveLength(1);
  });
  expect(errors).toEqual([]);
});

test("answers survive a reload", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = pageErrors(page);
  const sent = watchSent(page);
  await withTower(page, async () => {
    await connect(page);
    await calibrate(page);
    await page.getByLabel("Top north").selectOption("cleanse");
    await page.getByLabel("Top east").selectOption("none");
    await page.getByRole("button", { name: "Light north side" }).click();
    await page
      .getByRole("group", { name: "Kingdom" })
      .getByRole("button", { name: "West" })
      .click();
    await expect(page.getByText("north → West")).toBeVisible();
    await page.getByRole("button", { name: "Turn top drum to east" }).click();
    await page
      .getByRole("group", { name: "Where the top drum landed" })
      .getByRole("button", { name: "east" })
      .click();
    await expect(page.getByText("Rotate result: east")).toBeVisible();
    await page.getByLabel("Dropped").fill("2");
    await page.getByLabel("Stayed inside").fill("1");
    await page.getByRole("button", { name: "Record try" }).click();
    await page.getByLabel("Dropped").fill("1");
    await page.getByLabel("Stayed inside").fill("0");
    await page.getByRole("button", { name: "Record try" }).click();
    await expect(page.getByText("Try 1: dropped 2, stayed 1")).toBeVisible();
    await expect(page.getByText("Try 2: dropped 1, stayed 0")).toBeVisible();
    await page.waitForFunction(() => {
      const raw = localStorage.getItem("tower-poc.setup-check");
      if (!raw) return false;
      const saved = JSON.parse(raw) as {
        glyphs?: Record<string, string>;
        facingKingdom?: string;
        rotateResult?: string;
        skulls?: unknown[];
      };
      return (
        saved.glyphs?.["top/north"] === "cleanse" &&
        saved.glyphs?.["top/east"] === "none" &&
        saved.facingKingdom === "West" &&
        saved.rotateResult === "east" &&
        saved.skulls?.length === 2
      );
    });

    const beforeReload = sent.length;
    await page.reload();
    await expect(page.getByLabel("Top north")).toHaveValue("cleanse");
    await expect(page.getByLabel("Top east")).toHaveValue("none");
    await expect(page.getByText("north → West")).toBeVisible();
    await expect(page.getByText("Rotate result: east")).toBeVisible();
    await expect(page.getByText("Try 1: dropped 2, stayed 1")).toBeVisible();
    await expect(page.getByText("Try 2: dropped 1, stayed 0")).toBeVisible();
    await expect(towerState(page)).toContainText("Unknown");
    await expect(towerState(page)).toContainText("Calibrate: undone");
    await page.waitForTimeout(1_500);
    expect(physical(sent.slice(beforeReload))).toEqual([]);
  });
  expect(errors).toEqual([]);
});
