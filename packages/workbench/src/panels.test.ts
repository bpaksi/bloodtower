import { describe, expect, it } from "vitest";
import { initialPanels, parseStored, togglePanel } from "./panels.ts";

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
