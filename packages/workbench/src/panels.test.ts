import { describe, expect, it } from "vitest";
import {
  escapeClosesRight,
  initialPanels,
  parseStored,
  STORAGE_KEY,
  savedAfterToggle,
  stepPending,
  toggleAndSave,
  togglePanel,
  WIDE_FROM,
} from "./panels.ts";

describe("initialPanels", () => {
  it("returns the saved choice, whatever the width", () => {
    expect(initialPanels(1100, { left: true, right: false })).toEqual({ left: true, right: false });
    expect(initialPanels(1600, { left: false, right: false })).toEqual({
      left: false,
      right: false,
    });
  });
  it("with no saved choice, closes both below 1200 px", () => {
    expect(initialPanels(1199, null)).toEqual({ left: false, right: false });
    expect(initialPanels(1100, null)).toEqual({ left: false, right: false });
  });
  it("with no saved choice, opens both at 1200 px or more", () => {
    expect(initialPanels(1200, null)).toEqual({ left: true, right: true });
    expect(initialPanels(1470, null)).toEqual({ left: true, right: true });
  });
});

describe("togglePanel", () => {
  it("flips one side and leaves the other", () => {
    const s = { left: true, right: true };
    expect(togglePanel(s, "left")).toEqual({ left: false, right: true });
    expect(togglePanel(s, "right")).toEqual({ left: true, right: false });
    expect(togglePanel(togglePanel(s, "left"), "left")).toEqual(s);
  });
  it("does not change its input", () => {
    const s = { left: true, right: true };
    togglePanel(s, "left");
    expect(s).toEqual({ left: true, right: true });
  });
});

describe("parseStored", () => {
  it("reads a saved choice", () => {
    expect(parseStored('{"left":false,"right":true}')).toEqual({ left: false, right: true });
  });
  it("treats missing, malformed or wrong-shaped values as no choice", () => {
    expect(parseStored(null)).toBeNull();
    expect(parseStored("{")).toBeNull();
    expect(parseStored('{"left":1,"right":true}')).toBeNull();
    expect(parseStored("null")).toBeNull();
  });
});

describe("savedAfterToggle (#129)", () => {
  it("does not persist an unsaved overlay when the other side is toggled", () => {
    // At 1100 px a pick opened the right overlay without saving; then [ opens the left panel.
    const current = { left: false, right: true };
    expect(savedAfterToggle(null, 1100, current, "left")).toEqual({ left: true, right: false });
  });
  it("keeps a saved side the user chose earlier", () => {
    const saved = { left: false, right: true };
    expect(savedAfterToggle(saved, 1100, { left: false, right: true }, "left")).toEqual({
      left: true,
      right: true,
    });
  });
});

describe("escapeClosesRight (#131)", () => {
  const base = {
    width: 1100,
    defaultPrevented: false,
    graphDetail: true,
    rightOpen: true,
    dialogOpen: false,
  };
  it("closes the graph detail overlay below 1200 px", () => {
    expect(escapeClosesRight(base)).toBe(true);
  });
  it("leaves the document-page rail alone", () => {
    expect(escapeClosesRight({ ...base, graphDetail: false })).toBe(false);
  });
  it("does nothing at 1200 px, when closed, in a dialog or when the key was handled", () => {
    expect(escapeClosesRight({ ...base, width: 1200 })).toBe(false);
    expect(escapeClosesRight({ ...base, rightOpen: false })).toBe(false);
    expect(escapeClosesRight({ ...base, dialogOpen: true })).toBe(false);
    expect(escapeClosesRight({ ...base, defaultPrevented: true })).toBe(false);
  });
});

describe("stepPending (#131)", () => {
  it("waits for the toggle, then opens once", () => {
    const a = stepPending(false, { type: "request", hasRight: false });
    expect(a).toEqual({ pending: true, open: false });
    expect(stepPending(a.pending, { type: "ready", hasRight: true })).toEqual({
      pending: false,
      open: true,
    });
  });
  it("opens at once when the panel exists", () => {
    expect(stepPending(false, { type: "request", hasRight: true })).toEqual({
      pending: false,
      open: true,
    });
  });
  it("clears the flag when Detail gets an unknown ID", () => {
    const a = stepPending(false, { type: "request", hasRight: false });
    expect(stepPending(a.pending, { type: "unknown-id" })).toEqual({ pending: false, open: false });
  });
});

describe("toggleAndSave (#143 / #129)", () => {
  it("flips UI and does not persist an unsaved overlay when the other side is toggled", () => {
    // At 1100 px a pick opened the right overlay without saving; then [ opens the left panel.
    const before = { left: false, right: true };
    expect(toggleAndSave(null, 1100, before, "left")).toEqual({
      next: { left: true, right: true },
      saved: { left: true, right: false },
    });
  });

  it("keeps a saved side the user chose earlier when the other side toggles", () => {
    const saved = { left: false, right: true };
    expect(toggleAndSave(saved, 1100, { left: false, right: true }, "left")).toEqual({
      next: { left: true, right: true },
      saved: { left: true, right: true },
    });
  });
});

describe("initialPanels: edge cases", () => {
  it("copies the saved choice instead of returning it", () => {
    const stored = { left: true, right: false };
    const out = initialPanels(1000, stored);
    expect(out).toEqual(stored);
    expect(out).not.toBe(stored);
  });

  it("opens both at exactly WIDE_FROM and closes both one pixel under", () => {
    expect(initialPanels(WIDE_FROM, null)).toEqual({ left: true, right: true });
    expect(initialPanels(WIDE_FROM - 1, null)).toEqual({ left: false, right: false });
  });

  it("handles a zero or negative width as narrow", () => {
    expect(initialPanels(0, null)).toEqual({ left: false, right: false });
    expect(initialPanels(-5, null)).toEqual({ left: false, right: false });
  });

  it("keeps a saved all-closed choice on a wide screen", () => {
    expect(initialPanels(2400, { left: false, right: false })).toEqual({
      left: false,
      right: false,
    });
  });
});

describe("parseStored: edge cases", () => {
  it("rejects an empty string, an array, a number and a string", () => {
    expect(parseStored("")).toBeNull();
    expect(parseStored("[]")).toBeNull();
    expect(parseStored("[true,true]")).toBeNull();
    expect(parseStored("5")).toBeNull();
    expect(parseStored('"left"')).toBeNull();
  });

  it("rejects a missing side or a side that is not a boolean", () => {
    expect(parseStored('{"left":true}')).toBeNull();
    expect(parseStored('{"right":true}')).toBeNull();
    expect(parseStored('{"left":"true","right":false}')).toBeNull();
    expect(parseStored('{"left":null,"right":false}')).toBeNull();
    expect(parseStored("{}")).toBeNull();
  });

  it("drops extra keys", () => {
    expect(parseStored('{"left":true,"right":false,"x":1}')).toEqual({
      left: true,
      right: false,
    });
  });

  it("reads all four boolean combinations", () => {
    for (const left of [true, false]) {
      for (const right of [true, false]) {
        expect(parseStored(JSON.stringify({ left, right }))).toEqual({ left, right });
      }
    }
  });

  it("round-trips the storage key's value", () => {
    const s = { left: false, right: true };
    expect(parseStored(JSON.stringify(s))).toEqual(s);
    expect(STORAGE_KEY).toBe("workbench.panels");
  });
});

describe("savedAfterToggle: edge cases", () => {
  it("saves the wide default for the other side when nothing was saved", () => {
    expect(savedAfterToggle(null, 1600, { left: true, right: true }, "left")).toEqual({
      left: false,
      right: true,
    });
  });

  it("saves the narrow default for the other side when nothing was saved", () => {
    expect(savedAfterToggle(null, 800, { left: false, right: false }, "right")).toEqual({
      left: false,
      right: true,
    });
  });

  it("changes only the toggled side when both sides were saved", () => {
    const saved = { left: true, right: false };
    expect(savedAfterToggle(saved, 800, { left: true, right: true }, "right")).toEqual({
      left: true,
      right: false,
    });
  });

  it("does not change its inputs", () => {
    const saved = { left: true, right: false };
    const current = { left: false, right: true };
    savedAfterToggle(saved, 800, current, "left");
    expect(saved).toEqual({ left: true, right: false });
    expect(current).toEqual({ left: false, right: true });
  });
});

describe("escapeClosesRight: edge cases", () => {
  const ctx = {
    width: WIDE_FROM - 1,
    defaultPrevented: false,
    graphDetail: true,
    rightOpen: true,
    dialogOpen: false,
  };
  it("closes one pixel under WIDE_FROM, not at it", () => {
    expect(escapeClosesRight(ctx)).toBe(true);
    expect(escapeClosesRight({ ...ctx, width: WIDE_FROM })).toBe(false);
  });
  it("needs every condition: dropping any one stops it", () => {
    for (const key of ["defaultPrevented", "dialogOpen"] as const) {
      expect(escapeClosesRight({ ...ctx, [key]: true })).toBe(false);
    }
    for (const key of ["graphDetail", "rightOpen"] as const) {
      expect(escapeClosesRight({ ...ctx, [key]: false })).toBe(false);
    }
  });
});

describe("stepPending: edge cases", () => {
  it("keeps a waiting request waiting when ready comes with no panel", () => {
    expect(stepPending(true, { type: "ready", hasRight: false })).toEqual({
      pending: true,
      open: false,
    });
  });

  it("does nothing on ready when nothing was requested", () => {
    expect(stepPending(false, { type: "ready", hasRight: true })).toEqual({
      pending: false,
      open: false,
    });
    expect(stepPending(false, { type: "ready", hasRight: false })).toEqual({
      pending: false,
      open: false,
    });
  });

  it("opens once: a second ready after the open does nothing", () => {
    const a = stepPending(true, { type: "ready", hasRight: true });
    expect(a).toEqual({ pending: false, open: true });
    expect(stepPending(a.pending, { type: "ready", hasRight: true })).toEqual({
      pending: false,
      open: false,
    });
  });

  it("keeps an existing pending flag when a request finds the panel", () => {
    expect(stepPending(true, { type: "request", hasRight: true })).toEqual({
      pending: true,
      open: true,
    });
  });

  it("makes a second request while waiting no louder", () => {
    expect(stepPending(true, { type: "request", hasRight: false })).toEqual({
      pending: true,
      open: false,
    });
  });

  it("clears a waiting request on an unknown ID, and a later ready does not open", () => {
    const a = stepPending(true, { type: "unknown-id" });
    expect(a).toEqual({ pending: false, open: false });
    expect(stepPending(a.pending, { type: "ready", hasRight: true }).open).toBe(false);
  });
});

describe("toggleAndSave: edge cases", () => {
  it("toggling the same side twice returns to the start", () => {
    const start = { left: true, right: true };
    const once = toggleAndSave(null, 1600, start, "left");
    const twice = toggleAndSave(once.saved, 1600, once.next, "left");
    expect(twice.next).toEqual(start);
    expect(twice.saved).toEqual(start);
  });

  it("saves only the toggled side, while the UI keeps the unsaved overlay", () => {
    const r = toggleAndSave(null, 900, { left: false, right: true }, "right");
    expect(r.next).toEqual({ left: false, right: false });
    expect(r.saved).toEqual({ left: false, right: false });
  });

  it("does not change its input", () => {
    const before = { left: true, right: false };
    toggleAndSave(null, 900, before, "left");
    expect(before).toEqual({ left: true, right: false });
  });

  it("saved always round-trips through parseStored", () => {
    for (const side of ["left", "right"] as const) {
      const r = toggleAndSave(null, 1000, { left: true, right: false }, side);
      expect(parseStored(JSON.stringify(r.saved))).toEqual(r.saved);
    }
  });
});
