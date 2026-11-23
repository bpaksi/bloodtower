import { expect, type Page } from "@playwright/test";

/** The iPad's play status line, which carries the acting group's `data-space`. */
const statusLine = (pad: Page) => pad.locator("main.bt-device [data-step-instruction]").first();

/**
 * Clicks one walk on the iPad and waits until the status line shows the group at the walked-to
 * space. A walk's prompt id is `walk--<group>--<spaceId>`. With no `target`, it takes the first
 * walk offered. Returns the space walked to.
 *
 * Waiting for a visible element after the click is not enough: the move map and its moves-left
 * line are already on screen before the walk's view arrives (#599).
 */
export const walkTo = async (pad: Page, target?: string): Promise<string> => {
  const walk = pad
    .locator(
      target
        ? `main.bt-device button[data-action-id="walk"][data-prompt-id$="--${target}"]:not([disabled])`
        : 'main.bt-device button[data-action-id="walk"]:not([disabled])',
    )
    .first();
  await expect(walk).toBeVisible({ timeout: 20_000 });
  const promptId = (await walk.getAttribute("data-prompt-id")) ?? "";
  const cut = promptId.lastIndexOf("--");
  const space = cut >= 0 ? promptId.slice(cut + 2) : "";
  if (!promptId.startsWith("walk--") || !space) {
    throw new Error(`A walk button has no walk--<group>--<space> prompt id: "${promptId}".`);
  }
  await walk.click();
  await expect(statusLine(pad)).toHaveAttribute("data-space", space, { timeout: 20_000 });
  return space;
};
