import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "dashboard.tsx"), "utf8");

const classBefore = (marker: string, tag: string): string => {
  const at = source.indexOf(marker);
  const open = source.lastIndexOf(`<${tag}`, at);
  return /className="([^"]*)"/.exec(source.slice(open, at))?.[1] ?? "";
};

describe("dashboard narrator caption", () => {
  it("keeps the full line in a box that can grow or scroll", () => {
    const section = classBefore('data-testid="spoken-caption"', "section");
    const figure = classBefore('data-testid="spoken-caption"', "figure");
    const caption = classBefore('data-testid="spoken-caption"', "figcaption");
    expect(section).toMatch(/\boverflow-y-auto\b/);
    expect(section).toMatch(/\bmin-h-0\b/);
    expect(section).toMatch(/\bflex-1\b/);
    expect(figure).toMatch(/\bshrink-0\b/);
    expect(figure).not.toMatch(/line-clamp|truncate|overflow-hidden/);
    expect(caption).not.toMatch(/line-clamp|truncate|overflow-hidden/);
    expect(source).toContain('data-testid="asset-loading"');
  });
});
