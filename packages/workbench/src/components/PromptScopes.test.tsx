// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PromptScope } from "../prompt.ts";
import { PromptScopes } from "./PromptScopes.tsx";

afterEach(cleanup);

describe("PromptScopes", () => {
  it("publishes the scopes as a JSON data block that round-trips", () => {
    const scopes: Record<string, PromptScope> = {
      a: { file: "a.md", section: ["S"], lines: { start: 1, end: 2 }, ids: ["X-1"] },
    };
    const { container } = render(<PromptScopes scopes={scopes} />);
    const el = container.querySelector("script[data-prompt-scopes]") as HTMLScriptElement;
    expect(el.type).toBe("application/json");
    expect(JSON.parse(el.textContent ?? "")).toEqual(scopes);
  });

  it("escapes < so a heading cannot close the script tag", () => {
    const scopes = { a: { file: null, section: ["</script><b>"], lines: null, ids: [] } };
    const { container } = render(<PromptScopes scopes={scopes} />);
    const el = container.querySelector("script[data-prompt-scopes]") as HTMLScriptElement;
    expect(el.textContent).not.toContain("<");
    expect(JSON.parse(el.textContent ?? "")).toEqual(scopes);
  });
});
