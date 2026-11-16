"use client";

import type { HintView } from "bloodtower-protocols";
import { DialogFrame } from "./DialogFrame";

/**
 * A first-time hint on the Story board (CU/09, DEC-571, UI-035): one sentence, no button. It is a
 * Scroll over the loop's first view, or a caption under the art during an art hold. The host ends
 * it after `holdMs`; the view then drops it. Display only. Styles are local to this file.
 */
export function HintScroll({ hint }: { hint: HintView }) {
  if (hint.caption) {
    return (
      <p
        className="bt-hint-caption"
        data-hint={hint.id}
        data-hint-kind="caption"
        data-hold-ms={hint.holdMs}
        role="status"
        style={{
          position: "fixed",
          left: "50%",
          bottom: "3%",
          transform: "translateX(-50%)",
          maxWidth: "70%",
          margin: 0,
          textAlign: "center",
          textShadow: "0 1px 4px #000",
        }}
      >
        {hint.text}
      </p>
    );
  }
  return (
    <DialogFrame
      size="compact"
      className="bt-ink-in"
      data-hint={hint.id}
      data-hint-kind="scroll"
      data-scroll=""
      data-hold-ms={hint.holdMs}
      role="status"
      style={{ textAlign: "center" }}
    >
      <p data-dialog-line="">{hint.text}</p>
    </DialogFrame>
  );
}
