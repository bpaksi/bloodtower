import type { Page } from "@playwright/test";

// The e2e server runs the production build, where React prints minified errors
// (#418 hydration failed, #423/#425 text mismatch, #422/#419 suspense fallback) instead of prose.
const HYDRATION =
  /hydrat|did not match|didn't match|react\.dev\/errors\/(418|419|422|423|425)|minified react error #(418|419|422|423|425)/i;

/** True for a console or page-error text that reports a React hydration problem. */
export function isHydrationMessage(text: string): boolean {
  return HYDRATION.test(text);
}

/** Collects every hydration message the page logs; read `.messages` after the page settles. */
export function collectHydration(page: Page): { messages: string[] } {
  const found = { messages: [] as string[] };
  page.on("console", (msg) => {
    if (isHydrationMessage(msg.text())) found.messages.push(msg.text());
  });
  page.on("pageerror", (err) => {
    if (isHydrationMessage(err.message)) found.messages.push(err.message);
  });
  return found;
}

/** Init script body: adds Chrome-iOS style attributes before React hydrates (#414). */
export function injectBrowserAttributes(): void {
  const mark = (el: Element) => {
    if (el.tagName === "HTML") el.setAttribute("__gchrome_remoteframetoken", "tok-1");
    else if (el.tagName === "FORM" || el.tagName === "INPUT")
      el.setAttribute("__gchrome_uniqueid", "uid-1");
  };
  // documentElement is null when the init script runs in some engines; the observer then catches <html>.
  if (document.documentElement) mark(document.documentElement);
  new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (!(n instanceof Element)) continue;
        mark(n);
        for (const el of n.querySelectorAll("form,input")) mark(el);
      }
    }
  }).observe(document, { childList: true, subtree: true });
}
