"use client";
// Whether Verify mode is on, on this device. Kept in the browser so a reload, or moving to the
// next page of the pass, keeps it; a browser that keeps nothing simply starts with it off.
import { create } from "zustand";

const KEY = "tower-poc.verify-mode";

const read = () => {
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
};

export const useVerifyMode = create<{ on: boolean; loaded: boolean }>(() => ({
  on: false,
  loaded: false,
}));

/** Reads the saved setting once the page is in the browser (the static export renders it off). */
export const loadVerifyMode = () => {
  if (!useVerifyMode.getState().loaded) useVerifyMode.setState({ on: read(), loaded: true });
};

export const setVerifyMode = (on: boolean) => {
  useVerifyMode.setState({ on, loaded: true });
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Not kept; it still applies until the page is closed.
  }
};
