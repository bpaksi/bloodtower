import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DevicePage from "../../app/device/page.tsx";
import JoinPage from "../../app/join/page.tsx";
import {
  resetStoryAudioProviderRenders,
  StoryAudioFrame,
  storyAudioProviderRenders,
} from "./storyAudio.tsx";

// R3-UI-51: devices play no audio. Only the board pages may reach the audio module.
const WEB_ROOT = join(import.meta.dirname, "../..");

const sourcesUnder = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "out" ? [] : sourcesUnder(path);
    return name.endsWith(".tsx") || name.endsWith(".ts") ? [path] : [];
  });

const deviceSources = [
  ...sourcesUnder(join(WEB_ROOT, "app/device")),
  ...sourcesUnder(join(WEB_ROOT, "app/join")),
  ...sourcesUnder(join(WEB_ROOT, "components/device")),
];

describe("devices play no audio", () => {
  it("finds the device sources to check", () => {
    expect(deviceSources.length).toBeGreaterThan(0);
  });

  it("rendering the device and join pages makes no AudioContext", () => {
    let constructed = 0;
    class CountingAudioContext {
      constructor() {
        constructed += 1;
      }
    }
    const previousWindow = globalThis.window;
    const previousContext = globalThis.AudioContext;
    globalThis.AudioContext = CountingAudioContext as unknown as typeof AudioContext;
    globalThis.window = {
      AudioContext: CountingAudioContext,
    } as unknown as Window & typeof globalThis;

    resetStoryAudioProviderRenders();
    try {
      const deviceHtml = renderToStaticMarkup(createElement(DevicePage));
      const joinHtml = renderToStaticMarkup(createElement(JoinPage));
      const deviceShell = renderToStaticMarkup(
        createElement(StoryAudioFrame, { pathname: "/device" }, createElement(DevicePage)),
      );
      const joinShell = renderToStaticMarkup(
        createElement(StoryAudioFrame, { pathname: "/join" }, createElement(JoinPage)),
      );
      expect(deviceHtml.length).toBeGreaterThan(0);
      expect(joinHtml.length).toBeGreaterThan(0);
      expect(deviceShell).not.toContain("data-story-audio");
      expect(joinShell).not.toContain("data-story-audio");
      expect(storyAudioProviderRenders).toBe(0);
      expect(constructed).toBe(0);

      renderToStaticMarkup(createElement(StoryAudioFrame, { pathname: "/" }, createElement("div")));
      renderToStaticMarkup(
        createElement(StoryAudioFrame, { pathname: "/board" }, createElement("div")),
      );
      expect(storyAudioProviderRenders).toBeGreaterThan(0);
      expect(constructed).toBe(0);

      const layout = readFileSync(join(WEB_ROOT, "app/layout.tsx"), "utf8");
      expect(layout).toContain("StoryAudioShell");
      expect(layout).not.toMatch(/new AudioContext|<AudioProvider/);
    } finally {
      resetStoryAudioProviderRenders();
      globalThis.AudioContext = previousContext;
      globalThis.window = previousWindow;
    }
  });

  it("never imports the audio module or creates an audio element or context", () => {
    for (const file of deviceSources) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/lib\/audio|AudioContext|<audio\b|new Audio\(/);
      expect(text, file).not.toMatch(/components\/board/);
    }
  });
});
