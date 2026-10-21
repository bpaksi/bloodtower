"use client";

import { useEffect } from "react";
import {
  escapeClosesRight,
  initialPanels,
  type PanelState,
  parseStored,
  type Side,
  STORAGE_KEY,
  savedAfterToggle,
  stepPending,
  togglePanel,
  WIDE_FROM,
} from "../panels.ts";

/** Events between the toggle buttons, FocusGraph, FindBox and `Panels` (all on `window`). */
export const PANEL_TOGGLE = "workbench:panel-toggle";
export const PANEL_SYNC = "workbench:panel-sync";
/** Open the detail panel over the graph; does nothing at 1200 px or more. */
export const PANEL_OPEN_DETAIL = "workbench:open-detail";
/** The graph was asked for an ID that is no card or document ID: drop any pending open. */
export const PANEL_OPEN_CANCEL = "workbench:open-cancel";

function readStored(): PanelState | null {
  try {
    return parseStored(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null; // storage blocked: the width rule applies
  }
}

function writeStored(state: PanelState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // blocked or full: the choice lasts until reload
  }
}

function inField(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (el as HTMLElement).isContentEditable
  );
}

/**
 * Collapsible sidebar and detail panel. It writes `data-left` / `data-right` (open or closed) on
 * `.shell`, but only after a toggle or when a saved choice exists; until then the CSS width rule
 * decides, so the first paint does not flash. `[` and `]` toggle; Esc closes the overlay.
 */
export function Panels() {
  useEffect(() => {
    const shell = () => document.querySelector<HTMLElement>(".shell");
    const hasRight = () => document.querySelector('[data-panel-toggle="right"]') !== null;
    const current = (): PanelState => {
      const el = shell();
      const base = initialPanels(window.innerWidth, null);
      return {
        left: el?.dataset.left ? el.dataset.left === "open" : base.left,
        right: el?.dataset.right ? el.dataset.right === "open" : base.right,
      };
    };
    const sync = () => {
      const state = current();
      for (const b of document.querySelectorAll<HTMLElement>("[data-panel-toggle]")) {
        const side = b.dataset.panelToggle as Side;
        b.setAttribute("aria-expanded", String(state[side]));
      }
    };
    const apply = (state: PanelState, sides: Side[]) => {
      const el = shell();
      if (!el) return;
      for (const s of sides) el.dataset[s] = state[s] ? "open" : "closed";
      sync();
    };
    const toggle = (side: Side) => {
      if (side === "right" && !hasRight()) return;
      const next = togglePanel(current(), side);
      apply(next, ["left", "right"]);
      // Save only the side that was toggled; an overlay opened by a pick stays unsaved.
      saved = savedAfterToggle(saved, window.innerWidth, current(), side);
      writeStored(saved);
    };

    let saved = readStored();
    if (saved) apply(initialPanels(window.innerWidth, saved), ["left", "right"]);
    else sync();

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (inField(document.activeElement)) return;
      if (e.key === "[") toggle("left");
      else if (e.key === "]") toggle("right");
      else if (
        e.key === "Escape" &&
        escapeClosesRight({
          width: window.innerWidth,
          defaultPrevented: e.defaultPrevented,
          graphDetail: document.querySelector("aside.detail") !== null,
          rightOpen: hasRight() && current().right,
          dialogOpen: document.querySelector("dialog[open]") !== null,
        })
      ) {
        toggle("right");
      }
    };
    const onToggle = (e: Event) => toggle((e as CustomEvent<Side>).detail);
    // A find hit from a page with no right panel arrives before the graph has mounted its toggle.
    let pending = false;
    const openDetail = () => {
      if (window.innerWidth >= WIDE_FROM) return;
      apply({ ...current(), right: true }, ["right"]); // a pick is not a saved choice
    };
    const step = (event: Parameters<typeof stepPending>[1]) => {
      const r = stepPending(pending, event);
      pending = r.pending;
      return r.open;
    };
    const onOpenDetail = () => {
      if (step({ type: "request", hasRight: hasRight() })) openDetail();
    };
    const onSync = () => {
      if (step({ type: "ready", hasRight: hasRight() })) openDetail();
      else sync();
    };
    const onCancel = () => {
      step({ type: "unknown-id" });
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(PANEL_TOGGLE, onToggle);
    window.addEventListener(PANEL_OPEN_DETAIL, onOpenDetail);
    window.addEventListener(PANEL_SYNC, onSync);
    window.addEventListener(PANEL_OPEN_CANCEL, onCancel);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PANEL_TOGGLE, onToggle);
      window.removeEventListener(PANEL_OPEN_DETAIL, onOpenDetail);
      window.removeEventListener(PANEL_SYNC, onSync);
      window.removeEventListener(PANEL_OPEN_CANCEL, onCancel);
      window.removeEventListener("resize", sync);
    };
  }, []);
  return null;
}
