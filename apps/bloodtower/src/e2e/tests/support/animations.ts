import type { Page } from "@playwright/test";

/** Let ink-in and other entrance animations finish before layout checks or screenshots. */
export const settlePageAnimations = async (page: Page) => {
  await page.evaluate(async () => {
    const collectAnimations = (root: Document | Element): Animation[] => {
      const seen = new Set<Animation>();
      const list: Animation[] = [];
      const visit = (node: Document | Element) => {
        for (const animation of node.getAnimations()) {
          if (!seen.has(animation)) {
            seen.add(animation);
            list.push(animation);
          }
        }
        if (node instanceof Document) {
          for (const element of node.querySelectorAll("*")) visit(element);
        }
      };
      visit(root);
      return list;
    };
    const isEntrance = (animation: Animation) => {
      if (animation.playState !== "running") return false;
      const effect = animation.effect;
      if (effect instanceof KeyframeEffect && effect.getTiming().iterations === Infinity)
        return false;
      return true;
    };
    const running = () => collectAnimations(document).some(isEntrance);
    for (let frame = 0; frame < 300 && running(); frame += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }
    for (const animation of collectAnimations(document)) {
      if (animation.playState === "finished") continue;
      const effect = animation.effect;
      if (effect instanceof KeyframeEffect && effect.getTiming().iterations === Infinity) continue;
      try {
        animation.finish();
      } catch {
        animation.cancel();
      }
    }
  });
  await page.waitForTimeout(1500);
};
