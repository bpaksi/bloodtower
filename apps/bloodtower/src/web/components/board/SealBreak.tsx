"use client";

import type { ChapterBeat } from "./ChapterCard";
import { DialogFrame } from "./DialogFrame";

/**
 * UI-044's seal Reveal on the Story board (C3/15, DEC-303): the lit seal, its glyph and the boon,
 * right after the next chapter's card, as a story beat (EV-02). Tower only; C4+ in a real game.
 * No button: it ends like the other beats (EV-11). Display only.
 */
export function SealBreak({ beat }: { beat: ChapterBeat }) {
  if (!beat.seal) return null;
  return (
    <DialogFrame
      size="compact"
      className="bt-ink-in"
      data-chapter-beat="reveal"
      data-chapter={beat.chapter}
      data-seal={beat.seal.name}
      data-glyph={beat.seal.glyph}
      data-hold-ms={beat.holdMs}
      role="status"
      style={{ textAlign: "center" }}
    >
      <p className="bt-label" data-seal-name="" data-dialog-line="">
        {beat.seal.name}
      </p>
      <p
        data-glyph-mark=""
        aria-hidden="true"
        style={{ fontSize: "3em", margin: "0.1em 0", color: "#d4543a" }}
      >
        ✶
      </p>
      <p data-seal-boon="" data-dialog-line="">
        {beat.seal.boon}
      </p>
    </DialogFrame>
  );
}
