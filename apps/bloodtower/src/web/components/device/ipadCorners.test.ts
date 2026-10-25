import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChromeBar } from "./ChromeBar.tsx";
import { IPAD_CORNER_FRAME_URL, IpadCorners } from "./IpadCorners.tsx";

const APP_ROOT = join(import.meta.dirname, "../../../..");

describe("DEC-233 theme B iPad corners", () => {
  it("points the shell at the engraved mock, one window per corner", () => {
    expect(IPAD_CORNER_FRAME_URL).toBe("/ipad/b-engraved-ipad-move-map.jpg");
    const html = renderToStaticMarkup(createElement(IpadCorners));
    expect(html).toContain('data-ipad-corners="theme-b"');
    expect(html).toContain(IPAD_CORNER_FRAME_URL);
    expect(html.match(/data-ipad-corner="/g)).toHaveLength(4);
    for (const corner of ["tl", "tr", "bl", "br"]) {
      expect(html).toContain(`data-ipad-corner="${corner}"`);
    }
  });

  it("draws those corners from the bottom bar without taking the Story board frame", () => {
    const html = renderToStaticMarkup(createElement(ChromeBar, { live: false }));
    expect(html).toContain("data-bottom-bar");
    expect(html).toContain('data-ipad-corners="theme-b"');
    expect(html).not.toContain("dialog-frame");
    const board = readFileSync(join(import.meta.dirname, "../board/board.css"), "utf8");
    expect(board).toContain("/board/dialog-frame/dialog-frame.svg");
    expect(board).not.toContain(IPAD_CORNER_FRAME_URL);
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
});
