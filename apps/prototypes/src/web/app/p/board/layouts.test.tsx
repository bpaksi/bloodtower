import { createRng } from "@dark-tower/rng";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultValues } from "../../../lib/tuning.ts";
import { scaledPx } from "../../../lib/tv.ts";
import { assignHolders, LAYOUTS, POOL_HEROES } from "./data.ts";
import { FIELDS } from "./fields.ts";
import { BoardFrame } from "./page.tsx";

const v = defaultValues(FIELDS);
const sizes = {
  min: Number(v.minTextPx),
  body: Number(v.bodyPx),
  heading: Number(v.headingPx),
  big: Number(v.bigPx),
};
const holders = assignHolders(createRng("1"));

function render(id: (typeof LAYOUTS)[number]["id"], s = sizes) {
  return renderToStaticMarkup(<BoardFrame layout={id} sizes={s} holders={holders} />);
}

const READABLE = /^calc\((\d+(?:\.\d+)?) \* var\(--tv-px\)\)$/;

/** Every font size in the markup, in design px. Fails on any unreadable font-size. */
function fontSizes(html: string): number[] {
  const out: number[] = [];
  for (const match of html.matchAll(/font-size:([^;}"']+)/g)) {
    const raw = match[1]?.trim();
    if (raw === undefined) continue;
    const m = raw.match(READABLE);
    if (!m) {
      throw new Error(`unreadable font-size: ${raw}`);
    }
    out.push(Number(m[1]));
  }
  return out;
}

describe("board layouts", () => {
  it("the tuning panel holds the minimum text size, default 28", () => {
    expect(FIELDS.find((f) => f.key === "minTextPx")?.default).toBe(28);
  });

  it("fails when markup has a font-size the size check cannot read", () => {
    expect(() => fontSizes('<div style="font-size:14px">x</div>')).toThrow(/unreadable font-size/);
    expect(() => fontSizes('<div style="font-size:0.8em">x</div>')).toThrow(/unreadable font-size/);
  });

  for (const l of LAYOUTS) {
    it(`${l.name}: no text is smaller than 28 px at 1080p or 56 px at 4K`, () => {
      const found = fontSizes(render(l.id));
      expect(found.length).toBeGreaterThan(0);
      for (const n of found) {
        expect(scaledPx(n, 1920)).toBeGreaterThanOrEqual(28);
        expect(scaledPx(n, 3840)).toBeGreaterThanOrEqual(56);
      }
    });
  }

  it("raises a size set below the minimum, and a lower minimum shows up in the markup", () => {
    const small = { ...sizes, body: 10, heading: 12, big: 14 };
    expect(Math.min(...fontSizes(render("play", small)))).toBeGreaterThanOrEqual(28);
    const low = { min: 20, body: 20, heading: 20, big: 20 };
    expect(Math.min(...fontSizes(render("play", low)))).toBe(20);
  });

  it("has the six pool heroes with six distinct DEC-100 roles and DEC-101 attributes", () => {
    expect(new Set(POOL_HEROES.map((h) => h.role)).size).toBe(6);
    const html = render("roll");
    for (const h of POOL_HEROES) expect(html).toContain(h.role);
    expect(html).toContain("Might");
    expect(html).toContain("Stealth");
    expect(html).toContain("Magic");
    expect(html).toContain("Wits");
  });

  it("shows unknown values as unavailable, never zero", () => {
    expect(render("acting")).toContain("Corruption: unavailable");
  });

  it("same seed gives the same hero holders", () => {
    expect(assignHolders(createRng("7"))).toEqual(assignHolders(createRng("7")));
  });
});
