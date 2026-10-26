// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Chip } from "./Chip.tsx";

afterEach(cleanup);

describe("Chip", () => {
  it("renders the id as a focusable button with kind class, data-id and title", () => {
    render(<Chip id="SCR-12" kind="scr" label="Screen" />);
    const chip = screen.getByRole("button", { name: "SCR-12" });
    expect(chip.textContent).toBe("SCR-12");
    expect(chip.className).toBe("chip chip-scr");
    expect(chip.getAttribute("data-id")).toBe("SCR-12");
    expect(chip.tabIndex).toBe(0);
    expect(chip.getAttribute("title")).toBe("Screen · click to copy");
  });

  it("is a span so it can sit inside a link", () => {
    render(
      <a href="/x">
        <Chip id="UI-1" kind="ui" label="UI" />
      </a>,
    );
    expect(screen.getByRole("button").tagName).toBe("SPAN");
  });
});
