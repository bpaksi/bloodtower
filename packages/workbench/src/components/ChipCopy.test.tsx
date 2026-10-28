// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Chip } from "./Chip.tsx";
import { ChipCopy } from "./ChipCopy.tsx";

const writeText = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function setup() {
  const view = render(
    <>
      <Chip id="CUE-3" kind="cue" label="Cue" />
      {/* server-rendered markdown chip: plain element with data-id */}
      <p>
        <em data-id="IDEA-9">
          <b id="inner">inner</b>
        </em>
      </p>
      <span id="plain">plain</span>
      <ChipCopy />
    </>,
  );
  return { view, toast: view.container.querySelector("output") as HTMLOutputElement };
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("ChipCopy", () => {
  it("renders an idle polite live region", () => {
    const { toast } = setup();
    expect(toast.className).toBe("toast");
    expect(toast.getAttribute("aria-live")).toBe("polite");
    expect(toast.textContent).toBe("");
  });

  it("copies the id on click and toasts it", async () => {
    const { view, toast } = setup();
    fireEvent.click(view.getByText("CUE-3"));
    await flush();
    expect(writeText).toHaveBeenCalledWith("CUE-3");
    expect(toast.textContent).toBe("Copied CUE-3");
    expect(toast.className).toBe("toast toast-on");
  });

  it("copies from a click on a child of a data-id element", async () => {
    const { view } = setup();
    fireEvent.click(view.container.querySelector("#inner") as Element);
    await flush();
    expect(writeText).toHaveBeenCalledWith("IDEA-9");
  });

  it("ignores clicks outside any data-id element", async () => {
    const { view, toast } = setup();
    fireEvent.click(view.getByText("plain"));
    await flush();
    expect(writeText).not.toHaveBeenCalled();
    expect(toast.textContent).toBe("");
  });

  it("copies on Enter and ignores other keys", async () => {
    const { view, toast } = setup();
    const chip = view.getByText("CUE-3");
    fireEvent.keyDown(chip, { key: " " });
    fireEvent.keyDown(chip, { key: "a" });
    await flush();
    expect(writeText).not.toHaveBeenCalled();
    fireEvent.keyDown(chip, { key: "Enter" });
    await flush();
    expect(writeText).toHaveBeenCalledWith("CUE-3");
    expect(toast.textContent).toBe("Copied CUE-3");
  });

  it("prevents default and stops the event before it reaches a surrounding link", () => {
    const onBubble = vi.fn();
    const view = render(
      <>
        <a href="/card" onClick={onBubble}>
          <Chip id="CUE-3" kind="cue" label="Cue" />
        </a>
        <ChipCopy />
      </>,
    );
    const notPrevented = fireEvent.click(view.getByText("CUE-3"));
    expect(notPrevented).toBe(false);
    expect(onBubble).not.toHaveBeenCalled();
  });

  it("clears the toast after 1.6s", async () => {
    const { view, toast } = setup();
    fireEvent.click(view.getByText("CUE-3"));
    await flush();
    expect(toast.textContent).toBe("Copied CUE-3");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1599);
    });
    expect(toast.textContent).toBe("Copied CUE-3");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2);
    });
    expect(toast.textContent).toBe("");
    expect(toast.className).toBe("toast");
  });

  it("restarts the 1.6s timer on a second copy", async () => {
    const { view, toast } = setup();
    fireEvent.click(view.getByText("CUE-3"));
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    fireEvent.click(view.container.querySelector("#inner") as Element);
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(toast.textContent).toBe("Copied IDEA-9");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(toast.textContent).toBe("");
  });

  it("shows no toast when both clipboard paths fail", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    document.execCommand = vi.fn(() => false);
    const { view, toast } = setup();
    fireEvent.click(view.getByText("CUE-3"));
    await flush();
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(toast.textContent).toBe("");
  });

  it("falls back to execCommand when the async clipboard is refused", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    document.execCommand = vi.fn(() => true);
    const { view, toast } = setup();
    fireEvent.click(view.getByText("CUE-3"));
    await flush();
    expect(toast.textContent).toBe("Copied CUE-3");
  });

  it("removes its listeners on unmount", async () => {
    const { view } = setup();
    view.unmount();
    const el = document.createElement("span");
    el.setAttribute("data-id", "X-1");
    document.body.append(el);
    fireEvent.click(el);
    await flush();
    expect(writeText).not.toHaveBeenCalled();
    el.remove();
  });
});
