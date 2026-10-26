import { describe, expect, it } from "vitest";
import {
  escapeClosesRight,
  initialPanels,
  parseStored,
  savedAfterToggle,
  stepPending,
  toggleAndSave,
  togglePanel,
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
