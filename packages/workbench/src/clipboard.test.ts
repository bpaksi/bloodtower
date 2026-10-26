// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard.ts";

const writeText = vi.fn();
const execCommand = vi.fn();

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  execCommand.mockReset().mockReturnValue(true);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true });
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("copyText", () => {
  describe("async clipboard", () => {
    it("writes the text and resolves true", async () => {
      expect(await copyText("hello")).toBe(true);
      expect(writeText).toHaveBeenCalledExactlyOnceWith("hello");
    });

    it("does not touch the DOM or execCommand on success", async () => {
      const append = vi.spyOn(document.body, "append");
      await copyText("hello");
      expect(execCommand).not.toHaveBeenCalled();
      expect(append).not.toHaveBeenCalled();
      expect(document.querySelector("textarea")).toBeNull();
    });
  });

  describe("textarea fallback", () => {
    beforeEach(() => {
      writeText.mockRejectedValue(new Error("denied"));
    });

    it("copies through a hidden readonly textarea and resolves true", async () => {
      let area: HTMLTextAreaElement | null = null;
      let parent: Element | null = null;
      execCommand.mockImplementation(() => {
        area = document.querySelector("textarea");
        parent = area?.parentElement ?? null;
        return true;
      });
      expect(await copyText("fallback")).toBe(true);
      expect(execCommand).toHaveBeenCalledExactlyOnceWith("copy");
      const seen = area as HTMLTextAreaElement | null;
      expect(seen?.value).toBe("fallback");
      expect(seen?.hasAttribute("readonly")).toBe(true);
      expect(seen?.style.position).toBe("fixed");
      expect(seen?.style.opacity).toBe("0");
      expect(parent).toBe(document.body);
    });

    it("selects the text before copying", async () => {
      let selected = "";
      execCommand.mockImplementation(() => {
        const area = document.querySelector("textarea") as HTMLTextAreaElement;
        selected = area.value.slice(area.selectionStart, area.selectionEnd);
        return true;
      });
      await copyText("pick me");
      expect(selected).toBe("pick me");
    });

    it("removes the textarea afterwards", async () => {
      await copyText("x");
      expect(document.querySelector("textarea")).toBeNull();
    });

    it("resolves false when execCommand reports failure, and still cleans up", async () => {
      execCommand.mockReturnValue(false);
      expect(await copyText("x")).toBe(false);
      expect(document.querySelector("textarea")).toBeNull();
    });

    it("falls back when navigator.clipboard.writeText throws synchronously", async () => {
      writeText.mockImplementation(() => {
        throw new Error("sync");
      });
      expect(await copyText("sync")).toBe(true);
      expect(execCommand).toHaveBeenCalledOnce();
    });

    it("falls back when navigator.clipboard is undefined", async () => {
      Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
      expect(await copyText("insecure")).toBe(true);
      expect(execCommand).toHaveBeenCalledOnce();
    });
  });

  describe("open dialog", () => {
    beforeEach(() => {
      writeText.mockRejectedValue(new Error("denied"));
    });

    it("attaches the textarea inside dialog[open] rather than body", async () => {
      document.body.innerHTML = "<dialog open></dialog>";
      const dialog = document.querySelector("dialog") as HTMLDialogElement;
      let parent: Element | null = null;
      execCommand.mockImplementation(() => {
        parent = document.querySelector("textarea")?.parentElement ?? null;
        return true;
      });
      expect(await copyText("modal")).toBe(true);
      expect(parent).toBe(dialog);
      expect(dialog.querySelector("textarea")).toBeNull();
    });

    it("ignores a closed dialog and uses body", async () => {
      document.body.innerHTML = "<dialog></dialog>";
      let parent: Element | null = null;
      execCommand.mockImplementation(() => {
        parent = document.querySelector("textarea")?.parentElement ?? null;
        return true;
      });
      await copyText("closed");
      expect(parent).toBe(document.body);
    });

    it("does not use the dialog when the async clipboard succeeds", async () => {
      writeText.mockResolvedValue(undefined);
      document.body.innerHTML = "<dialog open></dialog>";
      await copyText("fine");
      expect(execCommand).not.toHaveBeenCalled();
    });
  });

  describe("text shapes", () => {
    const cases: [string, string][] = [
      ["empty string", ""],
      ["unicode", "héllo ✓ 日本語 🗼 \u{1F600} é"],
      ["multi-line", "a\r\nb\n\tc"],
      ["long text", "x".repeat(200_000)],
    ];

    it.each(cases)("passes %s through the async clipboard unchanged", async (_name, text) => {
      expect(await copyText(text)).toBe(true);
      expect(writeText).toHaveBeenCalledWith(text);
    });

    it.each(cases)("passes %s through the fallback unchanged", async (_name, text) => {
      writeText.mockRejectedValue(new Error("denied"));
      let value: string | undefined;
      execCommand.mockImplementation(() => {
        value = document.querySelector("textarea")?.value;
        return true;
      });
      expect(await copyText(text)).toBe(true);
      // jsdom normalises CR/LF in textarea values; compare on that basis.
      expect(value).toBe(text.replace(/\r\n?/g, "\n"));
    });
  });
});
