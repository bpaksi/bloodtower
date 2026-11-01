"use client";

import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { reportPageLog } from "../../lib/pageLog.ts";

export type DialogFrameSize = "default" | "compact";

/** A long setup step injected by the border spec. Art is this many pixels tall before the fit. */
type DialogFixture = { lines: string[]; art: number };

const ART_MIN_PX = 20;

const LINE_SELECTOR = [
  "[data-dialog-line]",
  ".bt-startup-cue",
  ".bt-setting",
  ".bt-startup-progress",
  ".bt-teardown > li",
].join(", ");

const ART_SELECTOR = [
  "[data-dialog-art]",
  ".bt-qr-lg",
  ".bt-tower-still",
  "[data-portrait-frame]",
  ".bt-carousel-plate",
  "img",
].join(", ");

const ownText = (el: HTMLElement): boolean =>
  [...el.childNodes].some(
    (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim().length > 0,
  );

/** True when the frame crosses the 5% border or a text box is cut. */
const frameOverflows = (frame: HTMLElement, board: HTMLElement): boolean => {
  const boardRect = board.getBoundingClientRect();
  const rect = frame.getBoundingClientRect();
  const minTop = boardRect.top + boardRect.height * 0.05;
  const maxBottom = boardRect.bottom - boardRect.height * 0.05;
  const minLeft = boardRect.left + boardRect.width * 0.05;
  const maxRight = boardRect.right - boardRect.width * 0.05;
  if (rect.top < minTop - 1 || rect.bottom > maxBottom + 1) return true;
  if (rect.left < minLeft - 1 || rect.right > maxRight + 1) return true;
  if (frame.scrollHeight > frame.clientHeight + 1) return true;
  if (frame.scrollWidth > frame.clientWidth + 1) return true;
  for (const el of frame.querySelectorAll<HTMLElement>("*")) {
    if (el.hidden || !ownText(el)) continue;
    if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) return true;
  }
  return false;
};

const tallestArt = (frame: HTMLElement): number => {
  let max = 0;
  for (const node of frame.querySelectorAll<HTMLElement>(ART_SELECTOR)) {
    max = Math.max(max, node.getBoundingClientRect().height);
  }
  return max;
};

/**
 * DEC-705 / Bob 2026-10-31: keep the frame inside the board's 5% border.
 * Art shrinks first (down to a small mark). Only then are whole lines removed.
 */
export const fitDialogFrame = (frame: HTMLElement): void => {
  const board = frame.closest("main.bt-board");
  if (!(board instanceof HTMLElement)) return;

  frame.style.setProperty("--bt-art-scale", "1");
  for (const el of frame.querySelectorAll<HTMLElement>("[data-fit-hidden]")) {
    el.hidden = false;
    el.removeAttribute("data-fit-hidden");
  }

  const boardRect = board.getBoundingClientRect();
  const prompt = frame.parentElement?.querySelector(":scope > .bt-next");
  const promptH = prompt instanceof HTMLElement ? prompt.getBoundingClientRect().height : 0;
  const gap = promptH > 0 ? 12 : 0;
  frame.style.maxWidth = `${boardRect.width * 0.9}px`;
  // A frame that already sits inside the border keeps its art at full size.
  frame.style.maxHeight = "";

  const hasArt = frame.querySelector(ART_SELECTOR) != null;
  const fullArt = tallestArt(frame);
  if (hasArt && fullArt < 1) return;

  if (frameOverflows(frame, board)) {
    frame.style.maxHeight = `${Math.max(80, boardRect.height * 0.9 - promptH - gap)}px`;
  }

  if (frameOverflows(frame, board) && fullArt > ART_MIN_PX) {
    const floor = ART_MIN_PX / fullArt;
    let scale = 1;
    for (let guard = 0; guard < 24 && scale > floor + 0.001; guard += 1) {
      if (!frameOverflows(frame, board)) break;
      scale = Math.max(floor, scale * 0.82);
      frame.style.setProperty("--bt-art-scale", scale.toFixed(4));
    }
  }

  const lines = [...frame.querySelectorAll<HTMLElement>(LINE_SELECTOR)];
  for (let i = lines.length - 1; i >= 0 && frameOverflows(frame, board); i -= 1) {
    const line = lines[i];
    if (!line || line.hidden) continue;
    line.hidden = true;
    line.setAttribute("data-fit-hidden", "");
  }

  const art = frame.querySelector<HTMLImageElement>("[data-dialog-art]");
  if (art) {
    frame.dataset.artHeight = String(Math.round(art.getBoundingClientRect().height));
    frame.dataset.artIntrinsic = String(art.naturalHeight || 0);
  } else {
    delete frame.dataset.artHeight;
    delete frame.dataset.artIntrinsic;
  }
  frame.dataset.linesHidden = String(frame.querySelectorAll("[data-fit-hidden]").length);
  frame.dataset.fitReady = "true";
};

const fixtureSvg = (art: number): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${art}"></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * The Story board's only modal chrome: the Illusionist `dialog-frame` asset
 * (public/board/dialog-frame/README.md), a 9-slice SVG ink border over the parchment tile.
 * Start-up dialogs, the Sound dialog and the in-game waiting dialog all draw their frame here.
 *
 * The frame stays inside the landing painting: at least 5% of the board on every side (DEC-705).
 * Long content shrinks the art first, then drops whole lines. It never scrolls and never clips
 * a line mid-text.
 *
 * Props:
 * - `size`: "default" (40px frame) or "compact" (32px frame, as wide as its content up to 34rem).
 * - `className`: extra classes on the frame, such as `bt-ink-in` for the opening motion.
 * - Any other div attribute (`role`, `aria-*`, `data-*`) goes to the frame element.
 */
export function DialogFrame({
  size = "default",
  className,
  children,
  ...rest
}: {
  size?: DialogFrameSize;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  const ref = useRef<HTMLDivElement>(null);
  const [fixture, setFixture] = useState<DialogFixture | null>(null);

  useLayoutEffect(() => {
    const onFixture = (event: Event) => {
      const detail = (event as CustomEvent<DialogFixture | null>).detail;
      setFixture(detail?.lines && detail.art ? detail : null);
    };
    window.addEventListener("bt-dialog-fixture", onFixture);
    return () => window.removeEventListener("bt-dialog-fixture", onFixture);
  }, []);

  // fixture and children are the triggers: the DOM they render is what the fit measures.
  // biome-ignore lint/correctness/useExhaustiveDependencies: refit when the dialog body changes
  useLayoutEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let cancelled = false;
    const run = () => {
      if (!cancelled) fitDialogFrame(frame);
    };
    run();
    const board = frame.closest("main.bt-board");
    const observer = new ResizeObserver(run);
    if (board) observer.observe(board);
    window.addEventListener("resize", run);
    if (document.fonts) {
      void document.fonts.ready.then(run).catch((error: unknown) => {
        void reportPageLog({
          level: "error",
          code: "dialog-fit-failed",
          message: `Dialog frame fit failed after fonts loaded. ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      });
    }
    const art = frame.querySelector("img");
    art?.addEventListener("load", run);
    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("resize", run);
      art?.removeEventListener("load", run);
    };
  }, [fixture, children]);

  const body = fixture ? (
    <div data-dialog-fixture="">
      {/* biome-ignore lint/performance/noImgElement: fixture art is a data-URI SVG with a fixed intrinsic height */}
      <img
        data-dialog-art=""
        alt=""
        width={800}
        height={fixture.art}
        src={fixtureSvg(fixture.art)}
        style={{ "--bt-dialog-art-h": `${fixture.art}px` } as CSSProperties}
      />
      <h1 className="bt-startup-title">Setup</h1>
      {fixture.lines.map((line) => (
        <p key={line} className="bt-startup-cue" data-dialog-line="">
          {line}
        </p>
      ))}
    </div>
  ) : (
    children
  );

  return (
    <div
      {...rest}
      ref={ref}
      className={className ? `bt-dialog-frame ${className}` : "bt-dialog-frame"}
      data-illusionist-asset="dialog-frame"
      data-dialog-size={size}
    >
      {body}
    </div>
  );
}
