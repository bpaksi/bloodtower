// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PromptConfig, PromptScope } from "../prompt.ts";
import { PromptScopes } from "./PromptScopes.tsx";
import { PromptStarter } from "./PromptStarter.tsx";

const config: PromptConfig = {
  rules: { change: "R-change", add: "R-add", ask: "R-ask" },
  newScope: "a brand new idea",
};
const scopes: Record<string, PromptScope> = {
  doc: { file: "docs/a.md", section: ["Intro"], lines: { start: 2, end: 8 }, ids: ["X-1"] },
};
const writeText = vi.fn();

let showModal: ReturnType<typeof vi.fn>;
let close: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  showModal = vi.fn();
  close = vi.fn();
  HTMLDialogElement.prototype.showModal = showModal as never;
  HTMLDialogElement.prototype.close = close as never;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function setup() {
  return render(
    <>
      <PromptScopes scopes={scopes} />
      <button type="button" data-prompt="doc">
        edit doc
      </button>
      <button type="button" data-prompt="doc" data-prompt-mode="ask">
        ask doc
      </button>
      <button type="button" data-prompt="doc" data-prompt-mode="bogus">
        bogus mode
      </button>
      <button type="button" data-prompt="new">
        new idea
      </button>
      <button type="button" data-prompt="missing">
        missing
      </button>
      <span id="other">other</span>
      <PromptStarter config={config} />
    </>,
  );
}

const scopeText = (c: HTMLElement) => c.querySelector(".prompt-scope")?.textContent;
const checkedMode = () =>
  (document.querySelector("input[name=mode]:checked") as HTMLInputElement).value;
const textarea = () => document.querySelector("textarea") as HTMLTextAreaElement;
const flush = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });

describe("PromptStarter", () => {
  it("opens the dialog with the scope from the page's data block", () => {
    const { container } = setup();
    fireEvent.click(screen.getByText("edit doc"));
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(scopeText(container)).toBe(
      "Scope: docs/a.md\nSection: Intro (lines 2–8)\nIDs in scope: X-1",
    );
    expect(checkedMode()).toBe("change");
  });

  it("claims the click so the trigger's own handler does not run", () => {
    const onClick = vi.fn();
    render(
      <>
        <PromptScopes scopes={scopes} />
        <button type="button" data-prompt="doc" onClick={onClick}>
          go
        </button>
        <PromptStarter config={config} />
      </>,
    );
    expect(fireEvent.click(screen.getByText("go"))).toBe(false);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("honours data-prompt-mode and ignores an unknown mode", () => {
    setup();
    fireEvent.click(screen.getByText("ask doc"));
    expect(checkedMode()).toBe("ask");
    expect(textarea().placeholder).toBe("What do you want to know?");
    fireEvent.click(screen.getByText("bogus mode"));
    expect(checkedMode()).toBe("change");
    expect(textarea().placeholder).toBe("Describe the idea in your own words");
  });

  it("'new' opens a file-less scope in add mode", () => {
    const { container } = setup();
    fireEvent.click(screen.getByText("new idea"));
    expect(scopeText(container)).toBe("Scope: a brand new idea");
    expect(checkedMode()).toBe("add");
  });

  it("does nothing for an unknown key or an element without data-prompt", () => {
    setup();
    fireEvent.click(screen.getByText("missing"));
    fireEvent.click(screen.getByText("other"));
    expect(showModal).not.toHaveBeenCalled();
  });

  it("focuses the textarea on the next frame after opening", async () => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    setup();
    fireEvent.click(screen.getByText("edit doc"));
    expect(document.activeElement).toBe(textarea());
    vi.unstubAllGlobals();
  });

  it("disables Copy until there is an idea, and previews the prompt live", () => {
    setup();
    fireEvent.click(screen.getByText("edit doc"));
    const submit = screen.getByRole("button", { name: "Copy prompt", hidden: true });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector(".prompt-preview pre")?.textContent).toContain("Change: …");
    fireEvent.change(textarea(), { target: { value: "  make it shorter " } });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    expect(document.querySelector(".prompt-preview pre")?.textContent).toContain(
      "Rules: R-change\n\nChange: make it shorter",
    );
  });

  it("switching mode changes the rules in the preview", () => {
    setup();
    fireEvent.click(screen.getByText("edit doc"));
    fireEvent.click(screen.getByLabelText("Ask"));
    expect(document.querySelector(".prompt-preview pre")?.textContent).toContain("Rules: R-ask");
  });

  it("copies the full prompt on submit, then toasts, clears the idea and closes", async () => {
    setup();
    fireEvent.click(screen.getByText("edit doc"));
    fireEvent.change(textarea(), { target: { value: "shorten" } });
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);
    await flush();
    expect(writeText).toHaveBeenCalledWith(
      "Scope: docs/a.md\nSection: Intro (lines 2–8)\nIDs in scope: X-1\n\nRules: R-change\n\nChange: shorten",
    );
    const toast = document.querySelector("output") as HTMLOutputElement;
    expect(toast.textContent).toBe("Prompt copied. Paste it into Claude.");
    expect(toast.className).toBe("toast toast-on");
    expect(textarea().value).toBe("");
    expect(close).toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(toast.textContent).toBe("");
  });

  it("Cmd+Enter and Ctrl+Enter copy; plain Enter does not", async () => {
    setup();
    fireEvent.click(screen.getByText("new idea"));
    fireEvent.change(textarea(), { target: { value: "idea" } });
    fireEvent.keyDown(textarea(), { key: "Enter" });
    await flush();
    expect(writeText).not.toHaveBeenCalled();
    fireEvent.keyDown(textarea(), { key: "Enter", metaKey: true });
    await flush();
    expect(writeText).toHaveBeenCalledTimes(1);
    fireEvent.change(textarea(), { target: { value: "again" } });
    fireEvent.keyDown(textarea(), { key: "Enter", ctrlKey: true });
    await flush();
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(writeText.mock.calls[1]?.[0]).toBe(
      "Scope: a brand new idea\n\nRules: R-add\n\nIdea to add: again",
    );
  });

  it("with an empty idea, copy focuses the textarea instead of copying", async () => {
    setup();
    fireEvent.click(screen.getByText("edit doc"));
    fireEvent.change(textarea(), { target: { value: "   " } });
    fireEvent.keyDown(textarea(), { key: "Enter", metaKey: true });
    await flush();
    expect(writeText).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(textarea());
  });

  it("keeps the idea and dialog open and says so when copying fails", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    document.execCommand = vi.fn(() => false);
    setup();
    fireEvent.click(screen.getByText("edit doc"));
    fireEvent.change(textarea(), { target: { value: "keep me" } });
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);
    await flush();
    expect(document.querySelector("output")?.textContent).toBe(
      "Copy failed. Open the preview and copy it by hand.",
    );
    expect(textarea().value).toBe("keep me");
    expect(close).not.toHaveBeenCalled();
  });

  it("Close button closes the dialog", () => {
    setup();
    fireEvent.click(screen.getByText("edit doc"));
    fireEvent.click(screen.getByRole("button", { name: "Close", hidden: true }));
    expect(close).toHaveBeenCalled();
  });

  it("removes the click listener on unmount", () => {
    const view = setup();
    view.unmount();
    const b = document.createElement("button");
    b.setAttribute("data-prompt", "new");
    document.body.append(b);
    fireEvent.click(b);
    expect(showModal).not.toHaveBeenCalled();
    b.remove();
  });
});
