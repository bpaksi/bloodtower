import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StoryToasts } from "../../components/board/StoryToasts.tsx";
import { type ErrorToast, pushErrorToast, visibleErrorToasts } from "../errorToasts.ts";
import {
  AUDIO_START_REFUSED,
  bindStoryBoardAudioErrors,
  resetAudioErrorsForTests,
} from "./audioError.ts";
import { BoardAudio } from "./boardAudio.ts";
import { DEFAULT_LEVELS } from "./levels.ts";
import { resetStoryBoardAudioForTests } from "./storyAudio.tsx";

type Posted = { level?: string; code?: string; message?: string };

const gainNode = () => ({
  gain: {
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    setTargetAtTime() {},
    cancelScheduledValues() {},
  },
  connect() {},
  disconnect() {},
});

describe("a refused audio start", () => {
  it("makes the mock context's resume() reject, then logs audio-start-refused and shows one story board toast", async () => {
    const posted: Posted[] = [];
    const toasts: ErrorToast[] = [];
    const now = 1_000;
    const unbind = bindStoryBoardAudioErrors((entry) => {
      const next = pushErrorToast(visibleErrorToasts(toasts, now), entry, now);
      toasts.splice(0, toasts.length, ...next);
    });

    class RefusingContext {
      state = "suspended";
      currentTime = 0;
      destination = {};
      createGain() {
        return gainNode();
      }
      resume() {
        return Promise.reject(new Error("not allowed"));
      }
      decodeAudioData() {
        return Promise.reject(new Error("no audio"));
      }
    }

    const previousWindow = globalThis.window;
    const previousFetch = globalThis.fetch;
    const previousContext = globalThis.AudioContext;
    globalThis.AudioContext = RefusingContext as unknown as typeof AudioContext;
    globalThis.window = {
      AudioContext: RefusingContext,
      location: { protocol: "http:", host: "127.0.0.1:9", pathname: "/board" },
      localStorage: { getItem: () => null, setItem() {} },
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    } as unknown as Window & typeof globalThis;
    globalThis.fetch = (async (url: string | URL, init?: { body?: string }) => {
      const href = String(url);
      if (href.endsWith("/log")) {
        posted.push(JSON.parse(String(init?.body)) as Posted);
        return { ok: true, status: 204 };
      }
      return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
    }) as typeof fetch;

    resetStoryBoardAudioForTests();
    try {
      const audio = new BoardAudio(DEFAULT_LEVELS, "http://127.0.0.1:9");
      audio.unlock();
      for (let i = 0; i < 20 && posted.length === 0; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const refused = posted.filter(
        (entry) => entry.level === "error" && entry.code === AUDIO_START_REFUSED,
      );
      expect(refused).toHaveLength(1);
      expect(toasts.filter((toast) => toast.code === AUDIO_START_REFUSED)).toHaveLength(1);
      const html = renderToStaticMarkup(createElement(StoryToasts, { toasts }));
      expect(html).toContain('data-error-code="audio-start-refused"');
      expect(html.match(/data-error-code=/g)).toHaveLength(1);

      const liveBoard = readFileSync(
        join(import.meta.dirname, "../../components/board/LiveBoard.tsx"),
        "utf8",
      );
      expect(liveBoard).toContain("bindStoryBoardAudioErrors");
    } finally {
      unbind();
      resetAudioErrorsForTests();
      resetStoryBoardAudioForTests();
      globalThis.AudioContext = previousContext;
      globalThis.window = previousWindow;
      globalThis.fetch = previousFetch;
    }
  });
});
