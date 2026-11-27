import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChromeBar } from "./ChromeBar.tsx";
import { IpadCorners } from "./IpadCorners.tsx";
import { JoinScreen } from "./JoinScreen.tsx";

const APP_ROOT = join(import.meta.dirname, "../../../..");
const MOCK_JPEG = "/ipad/b-engraved-ipad-move-map.jpg";

describe("DEC-233 theme B iPad corners", () => {
  it("draws four clean engraved corners, not windows on the move-map mock (#592)", () => {
    const html = renderToStaticMarkup(createElement(IpadCorners));
    expect(html).toContain('data-ipad-corners="theme-b"');
    expect(html).not.toContain(MOCK_JPEG);
    expect(html.match(/data-ipad-corner="/g)).toHaveLength(4);
    for (const corner of ["tl", "tr", "bl", "br"]) {
      expect(html).toContain(`data-ipad-corner="${corner}"`);
      expect(html).toContain(`/ipad/corners/corner-${corner}.png`);
    }
  });

  it("draws those corners from the bottom bar without taking the Story board frame", () => {
    const html = renderToStaticMarkup(createElement(ChromeBar, { live: false }));
    expect(html).toContain("data-bottom-bar");
    expect(html).toContain('data-ipad-corners="theme-b"');
    expect(html).not.toContain("dialog-frame");
    const board = readFileSync(join(import.meta.dirname, "../board/board.css"), "utf8");
    expect(board).toContain("/board/dialog-frame/dialog-frame.svg");
    expect(board).not.toContain(MOCK_JPEG);
    expect(board).not.toContain("/ipad/corners/");
    expect(board).not.toContain("data-ipad-corner");
  });

  it("serves the #220 JPEG unchanged", () => {
    const served = readFileSync(join(APP_ROOT, "public/ipad/b-engraved-ipad-move-map.jpg"));
    const mock = readFileSync(
      join(APP_ROOT, "../../docs/ui-mocks/weekend-w1/b-engraved-ipad-move-map.jpg"),
    );
    expect(createHash("sha256").update(served).digest("hex")).toBe(
      "92625a3660c9bffe189c66ca13636b75b9c56e2c7b890bd3ca4c7f8488dc4f6f",
    );
    expect(Buffer.compare(served, mock)).toBe(0);
  });

  it("styles #594 Theme B typography, chamfered buttons, join borders, and corner-clear toolbar", () => {
    const joinHtml = renderToStaticMarkup(createElement(JoinScreen, { live: true, code: null }));
    expect(joinHtml).toMatch(/name="code"[^>]*border-2|border-2[^>]*name="code"/);
    expect(joinHtml).toMatch(/name="token"[^>]*border-2|border-2[^>]*name="token"/);

    const layout = readFileSync(join(import.meta.dirname, "../../app/layout.tsx"), "utf8");
    expect(layout).toContain("game-tokens.css");

    const globals = readFileSync(join(import.meta.dirname, "../../app/globals.css"), "utf8");
    expect(globals).toContain("var(--bt-grain)");
    expect(globals).toContain("var(--bt-font-body)");
    expect(globals).toContain("var(--bt-font-title)");
    expect(globals).toContain("var(--bt-font-label)");
    expect(globals).toContain("clip-path: polygon(");
    expect(globals).toContain(".bt-bottom-bar::before");
    expect(globals).toContain(".bt-bottom-bar .bt-ghost.bt-help");
  });
});
