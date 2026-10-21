"use client";
// Whether Review feel is on, on this device (M6 step 6.2). Kept in the browser like Verify mode, so
// a reload keeps it; a browser that keeps nothing simply starts with it off. Bob's picks are not
// kept here: the service saves them (D25).
import { create } from "zustand";

const KEY = "tower-poc.sound-review";

const read = () => {
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
};

export const useSoundReviewMode = create<{ on: boolean; loaded: boolean }>(() => ({
  on: false,
  loaded: false,
}));

/** Reads the saved setting once the page is in the browser (the static export renders it off). */
export const loadSoundReviewMode = () => {
  if (!useSoundReviewMode.getState().loaded) {
    useSoundReviewMode.setState({ on: read(), loaded: true });
  }
};

export const setSoundReviewMode = (on: boolean) => {
  useSoundReviewMode.setState({ on, loaded: true });
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Not kept; it still applies until the page is closed.
  }
};
