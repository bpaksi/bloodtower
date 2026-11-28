import { expect, type Locator, type Page } from "@playwright/test";

const DEFAULT_TIMEOUT_MS = 20_000;

const DEFAULT_PREFER = ["continue", "end-turn", "record", "done", "leave", "enter"] as const;

const DEFAULT_SKIP = [
  "quit-story",
  "reconnect",
  "go-on-without",
  "new-game",
  "done-for-tonight",
  "back",
  "split",
  "join",
  "walk",
  "tower-connect",
  "tower-calibrate",
] as const;

type DeviceDiag = {
  screen: string | null;
  setupStep: string | null;
  seq: number | null;
  acked: number | null;
};

export type DeviceStatus = {
  day: string | null;
  moves: string | null;
  space: string | null;
  spaceName: string | null;
  inside: string | null;
  building: string | null;
  hero: string | null;
  roll: string | null;
  modifier: string | null;
  roster: string | null;
  seq: number | null;
  acked: number | null;
};

export type UntilScreenOptions = {
  timeout?: number;
  /** When set, also wait until `data-view-seq` is strictly greater than `afterSeq`. */
  afterSeq?: number;
};

export type PressOpenOptions = {
  prefer?: readonly string[];
  skip?: readonly string[];
  preferPrompts?: readonly string[];
  timeout?: number;
};

export type PressOpenResult = {
  promptId: string;
  actionId: string;
  seq: number;
};

/** The iPad's root element (`main.bt-device`). */
export const deviceMain = (pad: Page): Locator => pad.locator("main.bt-device");

const readDiag = async (pad: Page): Promise<DeviceDiag> =>
  pad.evaluate(() => {
    const main = document.querySelector("main.bt-device");
    if (!main) return { screen: null, setupStep: null, seq: null, acked: null };
    const parseIntAttr = (name: string): number | null => {
      const value = main.getAttribute(name);
      return value !== null && /^\d+$/.test(value) ? Number(value) : null;
    };
    return {
      screen: main.getAttribute("data-screen"),
      setupStep: main.getAttribute("data-setup-step"),
      seq: parseIntAttr("data-view-seq"),
      acked: parseIntAttr("data-acked"),
    };
  });

const formatDiag = async (pad: Page): Promise<string> => {
  try {
    const diag = await readDiag(pad);
    const stepPart = diag.setupStep ? ` setupStep=${diag.setupStep}` : "";
    return `screen=${diag.screen ?? "none"}${stepPart} seq=${diag.seq ?? "none"} acked=${diag.acked ?? "none"}`;
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    return `diag-failed=${detail}`;
  }
};

/**
 * Clicks a device prompt button and waits until the host has finished handling that press and
 * React has rendered the resulting `data-acked` increment. Returns the new `data-view-seq`.
 * On timeout or failure, throws with the prompt, action, screen, and last seq (decision 0003).
 */
export const act = async (
  pad: Page,
  promptId: string,
  actionId: string,
  options?: { timeout?: number },
): Promise<number> => {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeout;
  const remaining = () => Math.max(1, deadline - Date.now());
  const button = deviceMain(pad).locator(
    `button[data-prompt-id=${JSON.stringify(promptId)}][data-action-id=${JSON.stringify(actionId)}]`,
  );

  try {
    await expect(button).toBeEnabled({ timeout: remaining() });
    const before = await readDiag(pad);
    if (before.acked === null) {
      throw new Error("main.bt-device has no data-acked attribute");
    }
    const startAcked = before.acked;
    await button.click({ timeout: remaining() });
    const handle = await pad.waitForFunction(
      (targetAcked: number) => {
        const main = document.querySelector("main.bt-device");
        if (!main) return null;
        const ackedRaw = main.getAttribute("data-acked");
        const seqRaw = main.getAttribute("data-view-seq");
        if (ackedRaw === null || seqRaw === null) return null;
        if (!/^\d+$/.test(ackedRaw) || !/^\d+$/.test(seqRaw)) return null;
        return Number(ackedRaw) > targetAcked ? Number(seqRaw) : null;
      },
      startAcked,
      { timeout: remaining() },
    );
    const seq = await handle.jsonValue();
    if (typeof seq !== "number") {
      throw new Error("main.bt-device returned no numeric data-view-seq");
    }
    return seq;
  } catch (error: unknown) {
    const diag = await formatDiag(pad);
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `act(prompt="${promptId}", action="${actionId}") failed (${diag}, timeout=${timeout}ms): ${detail}`,
      { cause: error },
    );
  }
};

/**
 * Waits for `main.bt-device` to render a host view on `screen` (and `data-setup-step` or
 * `data-piece-check-step` when `step` is given). Use for views this pad did not cause: another
 * iPad's press, a timer, a reconnect, or a host restart. Returns the rendered `data-view-seq`.
 */
export async function untilScreen(
  pad: Page,
  screen: string,
  options?: UntilScreenOptions,
): Promise<number>;
export async function untilScreen(
  pad: Page,
  screen: string,
  step: string,
  options?: UntilScreenOptions,
): Promise<number>;
export async function untilScreen(
  pad: Page,
  screen: string,
  stepOrOptions?: string | UntilScreenOptions,
  maybeOptions?: UntilScreenOptions,
): Promise<number> {
  const step = typeof stepOrOptions === "string" ? stepOrOptions : undefined;
  const options = typeof stepOrOptions === "string" ? maybeOptions : stepOrOptions;
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const afterSeq = options?.afterSeq;

  try {
    const handle = await pad.waitForFunction(
      ({
        expectedScreen,
        expectedStep,
        minSeq,
      }: {
        expectedScreen: string;
        expectedStep: string | null;
        minSeq: number | null;
      }) => {
        const main = document.querySelector("main.bt-device");
        if (!main) return null;
        if (main.getAttribute("data-screen") !== expectedScreen) return null;
        const seqRaw = main.getAttribute("data-view-seq");
        if (seqRaw === null || !/^\d+$/.test(seqRaw)) return null;
        const seq = Number(seqRaw);
        if (minSeq !== null && seq <= minSeq) return null;
        if (expectedStep !== null) {
          const stepAttr =
            expectedScreen === "piece-check" ? "data-piece-check-step" : "data-setup-step";
          if (main.getAttribute(stepAttr) !== expectedStep) return null;
        }
        return seq;
      },
      { expectedScreen: screen, expectedStep: step ?? null, minSeq: afterSeq ?? null },
      { timeout },
    );
    const seq = await handle.jsonValue();
    if (typeof seq !== "number") {
      throw new Error("main.bt-device returned no numeric data-view-seq");
    }
    return seq;
  } catch (error: unknown) {
    const diag = await formatDiag(pad);
    const detail = error instanceof Error ? error.message : String(error);
    const target = step ? `${screen}/${step}` : screen;
    const afterNote = afterSeq !== undefined ? ` afterSeq=${afterSeq}` : "";
    throw new Error(
      `untilScreen("${target}"${afterNote}) failed (${diag}, timeout=${timeout}ms): ${detail}`,
      { cause: error },
    );
  }
}

/**
 * Reads every status attribute (`day`, `moves`, `space`, `inside`, `building`, `hero`, `roll`,
 * plus `spaceName`, `modifier`, `roster`) and `seq`/`acked` in one `evaluate`, so every field
 * comes from the same render. Missing or empty attributes come back `null`, never `0` or `""`.
 */
export const readStatus = async (pad: Page): Promise<DeviceStatus> =>
  pad.evaluate(() => {
    const main = document.querySelector("main.bt-device");
    const line = main?.querySelector("[data-step-instruction]") ?? null;
    const rosterEl = main?.querySelector("[data-roster]") ?? null;
    const attr = (el: Element | null, name: string): string | null => {
      const value = el?.getAttribute(name);
      return value !== null && value !== undefined && value !== "" ? value : null;
    };
    const intAttr = (el: Element | null, name: string): number | null => {
      const value = el?.getAttribute(name) ?? null;
      return value !== null && /^\d+$/.test(value) ? Number(value) : null;
    };
    const rosterText =
      rosterEl instanceof HTMLElement
        ? rosterEl.innerText.trim()
        : (rosterEl?.textContent?.trim() ?? "");
    return {
      day: attr(line, "data-day"),
      moves: attr(line, "data-moves"),
      space: attr(line, "data-space"),
      spaceName: attr(line, "data-space-name"),
      inside: attr(line, "data-inside"),
      building: attr(line, "data-building"),
      hero: attr(line, "data-acting-hero"),
      roll: attr(line, "data-roll"),
      modifier: attr(line, "data-modifier"),
      roster: rosterText !== "" ? rosterText : null,
      seq: intAttr(main, "data-view-seq"),
      acked: intAttr(main, "data-acked"),
    };
  });

/**
 * Picks one enabled action button rendered on screen according to `prefer` / `skip` (excluding
 * menu prompts) and clicks it through `act`. Returns `null` when no matching button is rendered.
 */
export const pressOpen = async (
  pad: Page,
  options?: PressOpenOptions,
): Promise<PressOpenResult | null> => {
  const prefer = options?.prefer ?? DEFAULT_PREFER;
  const skip = options?.skip ?? DEFAULT_SKIP;
  const preferPrompts = options?.preferPrompts ?? [];

  const buttons = await pad.evaluate(() => {
    const main = document.querySelector("main.bt-device");
    if (!main) return [];
    const nodes = main.querySelectorAll<HTMLButtonElement>(
      "button[data-prompt-id][data-action-id]:not([disabled])",
    );
    const out: Array<{ promptId: string; actionId: string }> = [];
    for (const node of nodes) {
      const promptId = node.getAttribute("data-prompt-id") ?? "";
      const actionId = node.getAttribute("data-action-id") ?? "";
      if (promptId && actionId) out.push({ promptId, actionId });
    }
    return out;
  });

  const eligible = buttons.filter(
    (btn) => !btn.promptId.startsWith("menu-") && !skip.includes(btn.actionId),
  );
  if (eligible.length === 0) return null;

  let pick: { promptId: string; actionId: string } | undefined;
  for (const promptId of preferPrompts) {
    pick = eligible.find((btn) => btn.promptId === promptId);
    if (pick) break;
  }
  if (!pick) {
    for (const actionId of prefer) {
      pick = eligible.find((btn) => btn.actionId === actionId);
      if (pick) break;
    }
  }
  pick ??= eligible[0];
  if (!pick) return null;

  const seq = await act(pad, pick.promptId, pick.actionId, { timeout: options?.timeout });
  return { promptId: pick.promptId, actionId: pick.actionId, seq };
};
