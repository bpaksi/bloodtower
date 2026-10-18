import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KeeperBoardCaption } from "./KeeperBoardCaption.tsx";

describe("KeeperBoardCaption", () => {
  it("shows the full line on first render before effects run", () => {
    const html = renderToStaticMarkup(
      createElement(KeeperBoardCaption, {
        speakerName: "The Keeper",
        lineId: "ts-keeper-001",
        scriptText: "Light them if you can. [pause 0.5] The key is at the bottom.",
        audioPath: "lines/ts-keeper-001.m4a",
        baseUrl: "/avatars/keeper/",
        enabled: true,
        plateRef: { current: null },
      }),
    );
    expect(html).toContain("The Keeper: Light them if you can. The key is at the bottom.");
    expect(html).not.toContain('><p class="bt-caption" data-board-caption=""');
    expect(html).not.toMatch(/data-board-caption=""[^>]*>\s*<\/p>/u);
  });
});
